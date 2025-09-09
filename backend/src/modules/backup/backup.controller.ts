import { Controller, Get, Post, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
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

  @Get('list')
  async listBackups() {
    const backups = await this.backupService.listBackups();
    return { backups };
  }

  @Post('restore/:fileName')
  async restoreBackup(@Param('fileName') fileName: string) {
    await this.backupService.restoreDatabase(fileName);
    return {
      message: `Database restored successfully from ${fileName}`,
    };
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
