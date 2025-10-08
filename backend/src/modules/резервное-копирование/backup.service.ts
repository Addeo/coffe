import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '../logger/logger.service';

export interface BackupMetadata {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  createdAt: Date;
  type: 'mysql' | 'sqlite';
}

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  constructor(
    private configService: ConfigService,
    private logger: LoggerService
  ) {}

  async createDatabaseBackup(): Promise<string> {
    try {
      const isProduction = process.env.NODE_ENV === 'production';

      // Создаем директорию для бэкапов если её нет
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Генерируем имя файла бэкапа
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      let backupFilePath: string;
      let backupFileName: string;

      if (isProduction) {
        // MySQL бэкап для production
        const dbHost = this.configService.get<string>('DB_HOST') || 'localhost';
        const dbPort = this.configService.get<number>('DB_PORT') || 3306;
        const dbUsername = this.configService.get<string>('DB_USERNAME') || 'coffee_user';
        const dbPassword = this.configService.get<string>('DB_PASSWORD') || 'coffee_password';
        const dbName = this.configService.get<string>('DB_DATABASE') || 'coffee_admin';

        backupFileName = `backup-mysql-${dbName}-${timestamp}.sql`;
        backupFilePath = path.join(backupDir, backupFileName);

        // Команда для mysqldump
        const dumpCommand = `mysqldump -h${dbHost} -P${dbPort} -u${dbUsername} -p${dbPassword} ${dbName} > "${backupFilePath}"`;

        // Выполняем команду
        await execAsync(dumpCommand);
      } else {
        // SQLite бэкап для development
        const sqliteDbPath = path.join(process.cwd(), 'database.sqlite');

        if (!fs.existsSync(sqliteDbPath)) {
          throw new Error('SQLite database file not found');
        }

        backupFileName = `backup-sqlite-${timestamp}.sqlite`;
        backupFilePath = path.join(backupDir, backupFileName);

        // Копируем файл SQLite
        fs.copyFileSync(sqliteDbPath, backupFilePath);
      }

      // Проверяем размер файла
      const stats = fs.statSync(backupFilePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      this.logger.log(
        `Database backup created successfully: ${backupFileName} (${fileSizeMB} MB)`,
        {
          action: 'backup_created',
          resource: 'database',
          metadata: {
            fileName: backupFileName,
            fileSize: stats.size,
            filePath: backupFilePath,
            dbType: isProduction ? 'mysql' : 'sqlite',
          },
        }
      );

      return backupFilePath;
    } catch (error) {
      this.logger.error('Failed to create database backup', error.stack, {
        action: 'backup_failed',
        resource: 'database',
        metadata: { error: error.message },
      });
      throw error;
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const backupDir = path.join(process.cwd(), 'backups');

      if (!fs.existsSync(backupDir)) {
        return [];
      }

      const files = fs
        .readdirSync(backupDir)
        .filter(file => file.endsWith('.sql') || file.endsWith('.sqlite'))
        .map(file => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          const sizeInMB = stats.size / (1024 * 1024);

          return {
            name: file,
            path: filePath,
            size: stats.size,
            sizeFormatted:
              sizeInMB >= 1 ? `${sizeInMB.toFixed(2)} MB` : `${(stats.size / 1024).toFixed(2)} KB`,
            createdAt: stats.birthtime,
            type: file.includes('mysql') ? 'mysql' : 'sqlite',
          } as BackupMetadata;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return files;
    } catch (error) {
      this.logger.error('Failed to list backups', error.stack);
      return [];
    }
  }

  async restoreDatabase(backupFileName: string): Promise<void> {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      const backupDir = path.join(process.cwd(), 'backups');
      const backupFilePath = path.join(backupDir, backupFileName);

      // Проверяем существование файла
      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      // Проверяем расширение файла
      const isSqlFile = backupFileName.endsWith('.sql');
      const isSqliteFile = backupFileName.endsWith('.sqlite');

      if (!isSqlFile && !isSqliteFile) {
        throw new BadRequestException(
          'Invalid backup file format. Only .sql and .sqlite files are supported'
        );
      }

      if (isProduction && !isSqlFile) {
        throw new BadRequestException('Only .sql files can be restored in production');
      }

      if (!isProduction && !isSqliteFile) {
        throw new BadRequestException('Only .sqlite files can be restored in development');
      }

      if (isProduction) {
        // MySQL восстановление
        const dbHost = this.configService.get<string>('DB_HOST') || 'localhost';
        const dbPort = this.configService.get<number>('DB_PORT') || 3306;
        const dbUsername = this.configService.get<string>('DB_USERNAME') || 'coffee_user';
        const dbPassword = this.configService.get<string>('DB_PASSWORD') || 'coffee_password';
        const dbName = this.configService.get<string>('DB_DATABASE') || 'coffee_admin';

        // Команда для восстановления MySQL
        const restoreCommand = `mysql -h${dbHost} -P${dbPort} -u${dbUsername} -p${dbPassword} ${dbName} < "${backupFilePath}"`;
        await execAsync(restoreCommand);
      } else {
        // SQLite восстановление
        const sqliteDbPath = path.join(process.cwd(), 'database.sqlite');
        const backupBeforeRestore = `${sqliteDbPath}.before-restore-${Date.now()}`;

        // Создаем резервную копию текущей базы
        if (fs.existsSync(sqliteDbPath)) {
          fs.copyFileSync(sqliteDbPath, backupBeforeRestore);
        }

        try {
          // Восстанавливаем из бэкапа
          fs.copyFileSync(backupFilePath, sqliteDbPath);
        } catch (restoreError) {
          // Если восстановление не удалось, откатываемся
          if (fs.existsSync(backupBeforeRestore)) {
            fs.copyFileSync(backupBeforeRestore, sqliteDbPath);
          }
          throw restoreError;
        }
      }

      this.logger.log(`Database restored successfully from: ${backupFileName}`, {
        action: 'database_restored',
        resource: 'database',
        metadata: {
          backupFileName,
          dbType: isProduction ? 'mysql' : 'sqlite',
        },
      });
    } catch (error) {
      this.logger.error('Failed to restore database', error.stack, {
        action: 'restore_failed',
        resource: 'database',
        metadata: { error: error.message, backupFileName },
      });
      throw error;
    }
  }

  async uploadBackup(file: Express.Multer.File): Promise<string> {
    try {
      // Валидация файла
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const allowedExtensions = ['.sql', '.sqlite'];
      const fileExtension = path.extname(file.originalname).toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
        throw new BadRequestException(
          `Invalid file type. Only ${allowedExtensions.join(', ')} files are allowed`
        );
      }

      // Проверка размера файла (макс 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        throw new BadRequestException('File size exceeds 100MB limit');
      }

      // Создаем директорию для бэкапов если её нет
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Генерируем безопасное имя файла
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const backupFileName = `uploaded-${timestamp}-${sanitizedOriginalName}`;
      const backupFilePath = path.join(backupDir, backupFileName);

      // Сохраняем файл
      fs.writeFileSync(backupFilePath, file.buffer);

      // Проверяем что файл сохранен
      if (!fs.existsSync(backupFilePath)) {
        throw new Error('Failed to save backup file');
      }

      const stats = fs.statSync(backupFilePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      this.logger.log(`Backup file uploaded successfully: ${backupFileName} (${fileSizeMB} MB)`, {
        action: 'backup_uploaded',
        resource: 'backup',
        metadata: {
          fileName: backupFileName,
          originalName: file.originalname,
          fileSize: stats.size,
          filePath: backupFilePath,
        },
      });

      return backupFileName;
    } catch (error) {
      this.logger.error('Failed to upload backup file', error.stack, {
        action: 'upload_failed',
        resource: 'backup',
        metadata: { error: error.message },
      });
      throw error;
    }
  }

  async deleteBackup(backupFileName: string): Promise<void> {
    try {
      const backupDir = path.join(process.cwd(), 'backups');
      const backupFilePath = path.join(backupDir, backupFileName);

      // Проверяем существование файла
      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      // Удаляем файл
      fs.unlinkSync(backupFilePath);

      this.logger.log(`Backup file deleted: ${backupFileName}`, {
        action: 'backup_deleted',
        resource: 'backup',
        metadata: { backupFileName },
      });
    } catch (error) {
      this.logger.error('Failed to delete backup', error.stack, {
        action: 'delete_failed',
        resource: 'backup',
        metadata: { error: error.message, backupFileName },
      });
      throw error;
    }
  }

  async cleanupOldBackups(keepDays: number = 30): Promise<number> {
    try {
      const backupDir = path.join(process.cwd(), 'backups');

      if (!fs.existsSync(backupDir)) {
        return 0;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const files = fs
        .readdirSync(backupDir)
        .filter(file => file.endsWith('.sql') || file.endsWith('.sqlite'))
        .map(file => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            createdAt: stats.birthtime,
          };
        })
        .filter(file => file.createdAt < cutoffDate);

      let deletedCount = 0;
      for (const file of files) {
        fs.unlinkSync(file.path);
        deletedCount++;
      }

      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} old backup files`, {
          action: 'cleanup_completed',
          resource: 'backups',
          metadata: { deletedCount, keepDays },
        });
      }

      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old backups', error.stack);
      return 0;
    }
  }
}
