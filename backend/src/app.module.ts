import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
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
import { AuthModule } from './modules/auth/auth.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { EmailModule } from './modules/email/email.module';
import { ExportModule } from './modules/export/export.module';
import { BackupModule } from './modules/backup/backup.module';
import { LoggerModule } from './modules/logger/logger.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CalculationsModule } from './modules/calculations/calculations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'coffee_user',
      password: process.env.DB_PASSWORD || 'coffee_password',
      database: process.env.DB_DATABASE || 'coffee_admin',
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
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    SettingsModule,
    NotificationsModule,
    StatisticsModule,
    EmailModule,
    ExportModule,
    BackupModule,
    LoggerModule,
    OrdersModule,
    UsersModule,
    OrganizationsModule,
    CalculationsModule,
    // ProductsModule,
    // FilesModule,
    TestModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
