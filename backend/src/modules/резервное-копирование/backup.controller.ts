import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('create')
  async createBackup() {
    const backupPath = await this.backupService.createDatabaseBackup();
    return {
      message: 'Database backup created successfully',
      backupPath,
    };
  }

  @Post('create-sql-dump')
  async createSqlDump() {
    const backupPath = await this.backupService.createDatabaseBackup();
    const fileName = backupPath.split('/').pop();

    return {
      success: true,
      message: 'SQL dump created successfully',
      fileName,
      backupPath,
      downloadUrl: `/a../резервное-копирование/download/${fileName}`,
    };
  }

  @Get('list')
  async listBackups() {
    const backups = await this.backupService.listBackups();
    return { backups };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBackup(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileName = await this.backupService.uploadBackup(file);

    return {
      success: true,
      message: 'Backup file uploaded successfully',
      fileName,
      size: file.size,
      originalName: file.originalname,
    };
  }

  @Post('restore/:fileName')
  async restoreBackup(@Param('fileName') fileName: string) {
    await this.backupService.restoreDatabase(fileName);
    return {
      success: true,
      message: `Database restored successfully from ${fileName}`,
    };
  }

  @Delete(':fileName')
  async deleteBackup(@Param('fileName') fileName: string) {
    await this.backupService.deleteBackup(fileName);
    return {
      success: true,
      message: `Backup file deleted: ${fileName}`,
    };
  }

  @Get('download/:fileName')
  async downloadBackup(@Param('fileName') fileName: string, @Res() res: Response) {
    try {
      const backupDir = 'backups';
      const filePath = `${backupDir}/${fileName}`;

      // Проверяем существование файла
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.cwd(), filePath);

      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({
          success: false,
          message: 'Backup file not found',
        });
      }

      // Отправляем файл
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);

      fileStream.on('error', error => {
        console.error('Error reading backup file:', error);
        res.status(500).json({
          success: false,
          message: 'Error reading backup file',
        });
      });
    } catch (error) {
      console.error('Error downloading backup:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading backup file',
      });
    }
  }

  @Delete('cleanup')
  async cleanupOldBackups(@Query('keepDays') keepDays: number = 30) {
    const deletedCount = await this.backupService.cleanupOldBackups(keepDays);
    return {
      message: `Cleaned up ${deletedCount} old backup files`,
      deletedCount,
    };
  }
}
