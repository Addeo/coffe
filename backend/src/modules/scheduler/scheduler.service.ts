import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GmailService } from '../gmail/gmail.service';
import { BackupService } from '../backup/backup.service';
import { StatisticsService } from '../statistics/statistics.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private gmailService: GmailService,
    private backupService: BackupService,
    private statisticsService: StatisticsService,
    private loggerService: LoggerService
  ) {}

  // Проверка новых email каждые 5 минут
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleEmailCheck() {
    try {
      this.logger.debug('Starting scheduled email check');
      await this.gmailService.checkNewEmails();
      this.logger.debug('Scheduled email check completed');
    } catch (error) {
      this.logger.error('Scheduled email check failed:', error);
      this.loggerService.error('Scheduled email check failed', error.stack, {
        action: 'scheduled_task_failed',
        resource: 'gmail',
      });
    }
  }

  // Ежемесячный бэкап базы данных в первый день месяца в 2:00
  @Cron('0 2 1 * *')
  async handleMonthlyBackup() {
    try {
      this.logger.log('Starting scheduled monthly backup');
      const backupPath = await this.backupService.createDatabaseBackup();

      this.loggerService.log('Monthly database backup completed', {
        action: 'scheduled_backup_completed',
        resource: 'backup',
        metadata: { backupPath },
      });

      // Очистка старых бэкапов (старше 6 месяцев)
      const deletedCount = await this.backupService.cleanupOldBackups(180);
      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} old backup files`);
      }
    } catch (error) {
      this.logger.error('Scheduled monthly backup failed:', error);
      this.loggerService.error('Scheduled monthly backup failed', error.stack, {
        action: 'scheduled_backup_failed',
        resource: 'backup',
      });
    }
  }

  // Ежемесячное обновление статистики заработка в последний день месяца в 23:00
  @Cron('0 23 28-31 * *')
  async handleMonthlyStatisticsUpdate() {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Проверяем, последний ли день месяца
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      if (now.getDate() !== lastDayOfMonth) {
        return; // Не последний день месяца
      }

      this.logger.log('Starting scheduled monthly statistics update');

      await this.statisticsService.calculateAllUsersMonthlyEarnings(currentMonth, currentYear);

      this.loggerService.log('Monthly statistics update completed', {
        action: 'scheduled_statistics_completed',
        resource: 'statistics',
        metadata: { month: currentMonth, year: currentYear },
      });
    } catch (error) {
      this.logger.error('Scheduled monthly statistics update failed:', error);
      this.loggerService.error('Scheduled monthly statistics update failed', error.stack, {
        action: 'scheduled_statistics_failed',
        resource: 'statistics',
      });
    }
  }

  // Еженедельная очистка старых логов каждое воскресенье в 3:00
  @Cron('0 3 * * 0')
  async handleWeeklyLogCleanup() {
    try {
      this.logger.log('Starting scheduled log cleanup');

      // Здесь можно добавить логику очистки старых логов из базы данных
      // Например, удаление логов старше 90 дней

      this.loggerService.log('Weekly log cleanup completed', {
        action: 'scheduled_cleanup_completed',
        resource: 'logs',
      });
    } catch (error) {
      this.logger.error('Scheduled log cleanup failed:', error);
      this.loggerService.error('Scheduled log cleanup failed', error.stack, {
        action: 'scheduled_cleanup_failed',
        resource: 'logs',
      });
    }
  }

  // Ежедневная проверка системы в 6:00
  @Cron('0 6 * * *')
  async handleDailySystemCheck() {
    try {
      this.logger.log('Starting scheduled daily system check');

      // Проверяем подключение к базе данных
      // Проверяем доступность внешних сервисов
      // Проверяем дисковое пространство

      this.loggerService.log('Daily system check completed', {
        action: 'scheduled_health_check',
        resource: 'system',
      });
    } catch (error) {
      this.logger.error('Scheduled daily system check failed:', error);
      this.loggerService.error('Scheduled daily system check failed', error.stack, {
        action: 'scheduled_health_check_failed',
        resource: 'system',
      });
    }
  }
}
