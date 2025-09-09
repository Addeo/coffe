import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '../logger/logger.service';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async createDatabaseBackup(): Promise<string> {
    try {
      const dbHost = this.configService.get<string>('DB_HOST') || 'localhost';
      const dbPort = this.configService.get<number>('DB_PORT') || 3306;
      const dbUsername = this.configService.get<string>('DB_USERNAME') || 'coffee_user';
      const dbPassword = this.configService.get<string>('DB_PASSWORD') || 'coffee_password';
      const dbName = this.configService.get<string>('DB_DATABASE') || 'coffee_admin';

      // Создаем директорию для бэкапов если её нет
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Генерируем имя файла бэкапа
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupFileName = `backup-${dbName}-${timestamp}.sql`;
      const backupFilePath = path.join(backupDir, backupFileName);

      // Команда для mysqldump
      const dumpCommand = `mysqldump -h${dbHost} -P${dbPort} -u${dbUsername} -p${dbPassword} ${dbName} > "${backupFilePath}"`;

      // Выполняем команду
      await execAsync(dumpCommand);

      // Проверяем размер файла
      const stats = fs.statSync(backupFilePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      this.logger.log(`Database backup created successfully: ${backupFileName} (${fileSizeMB} MB)`, {
        action: 'backup_created',
        resource: 'database',
        metadata: {
          fileName: backupFileName,
          fileSize: stats.size,
          filePath: backupFilePath,
        },
      });

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

  async listBackups(): Promise<string[]> {
    try {
      const backupDir = path.join(process.cwd(), 'backups');

      if (!fs.existsSync(backupDir)) {
        return [];
      }

      const files = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(item => item.name);

      return files;
    } catch (error) {
      this.logger.error('Failed to list backups', error.stack);
      return [];
    }
  }

  async restoreDatabase(backupFileName: string): Promise<void> {
    try {
      const dbHost = this.configService.get<string>('DB_HOST') || 'localhost';
      const dbPort = this.configService.get<number>('DB_PORT') || 3306;
      const dbUsername = this.configService.get<string>('DB_USERNAME') || 'coffee_user';
      const dbPassword = this.configService.get<string>('DB_PASSWORD') || 'coffee_password';
      const dbName = this.configService.get<string>('DB_DATABASE') || 'coffee_admin';

      const backupDir = path.join(process.cwd(), 'backups');
      const backupFilePath = path.join(backupDir, backupFileName);

      // Проверяем существование файла
      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      // Команда для восстановления
      const restoreCommand = `mysql -h${dbHost} -P${dbPort} -u${dbUsername} -p${dbPassword} ${dbName} < "${backupFilePath}"`;

      // Выполняем команду
      await execAsync(restoreCommand);

      this.logger.log(`Database restored successfully from: ${backupFileName}`, {
        action: 'database_restored',
        resource: 'database',
        metadata: { backupFileName },
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

  async cleanupOldBackups(keepDays: number = 30): Promise<number> {
    try {
      const backupDir = path.join(process.cwd(), 'backups');

      if (!fs.existsSync(backupDir)) {
        return 0;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const files = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.sql'))
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
