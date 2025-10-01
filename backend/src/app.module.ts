import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { ScheduleModule } from '@nestjs/schedule';
import { TestModule } from './modules/test/test.module';
import { User } from './entities/user.entity';
import { Order } from './entities/order.entity';
import { Organization } from './entities/organization.entity';
import { Engineer } from './entities/engineer.entity';
import { Product } from './entities/product.entity';
import { File } from './entities/file.entity';
import { Setting } from './entities/settings.entity';
import { UserActivityLog } from './entities/user-activity-log.entity';
import { Notification } from './entities/notification.entity';
import { EarningsStatistic } from './entities/earnings-statistic.entity';
import { WorkReport } from './entities/work-report.entity';
import { SalaryCalculation } from './entities/salary-calculation.entity';
import { EngineerOrganizationRate } from './entities/engineer-organization-rate.entity';
import { AuthModule } from './modules/аутентификация/auth.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { EmailModule } from './modules/email/email.module';
import { ExportModule } from './modules/export/export.module';
import { BackupModule } from './modules/резервное-копирование/backup.module';
import { FilesModule } from './modules/files/files.module';
import { LoggerModule } from './modules/logger/logger.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CalculationsModule } from './modules/расчеты/calculations.module';
import { EngineerOrganizationRatesModule } from './modules/engineer-organization-rates/engineer-organization-rates.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TestController } from './test.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [
        User,
        Order,
        Organization,
        Engineer,
        Product,
        File,
        Setting,
        UserActivityLog,
        Notification,
        EarningsStatistic,
        WorkReport,
        SalaryCalculation,
        EngineerOrganizationRate,
      ],
      synchronize: true,
      logging: true,
    }),
    TestModule,
    AuthModule,
    SettingsModule,
    NotificationsModule,
    StatisticsModule,
    EmailModule,
    ExportModule,
    BackupModule,
    FilesModule,
    LoggerModule,
    OrdersModule,
    UsersModule,
    OrganizationsModule,
    CalculationsModule,
    EngineerOrganizationRatesModule,
    ReportsModule,
  ],
  controllers: [TestController],
  providers: [],
})
export class AppModule {}
