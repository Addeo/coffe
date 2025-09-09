import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
// import { GmailModule } from '../gmail/gmail.module';
import { BackupModule } from '../backup/backup.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [ScheduleModule.forRoot(), /* GmailModule, */ BackupModule, StatisticsModule, LoggerModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
