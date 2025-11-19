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
import { SalaryCalculation } from './entities/salary-calculation.entity';
import { EngineerOrganizationRate } from './entities/engineer-organization-rate.entity';
import { WorkSession } from './entities/work-session.entity';
import { SalaryPayment } from './entities/salary-payment.entity';
import { EngineerBalance } from './entities/engineer-balance.entity';
import { Document } from './entities/document.entity';
import { Agreement } from './entities/agreement.entity';
import { UserAgreement } from './entities/user-agreement.entity';
import { OrderEngineerAssignment } from './entities/order-engineer-assignment.entity';
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
import { WorkSessionsModule } from './modules/work-sessions/work-sessions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LogsModule } from './modules/logs/logs.module';
import { AppUpdateModule } from './modules/app/app.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { TestController } from './test.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction) {
          // MySQL for Yandex Cloud production
          return {
            type: 'mysql',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            username: process.env.DB_USERNAME || 'user',
            password: process.env.DB_PASSWORD,
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
              SalaryCalculation,
              EngineerOrganizationRate,
              WorkSession,
              SalaryPayment,
              EngineerBalance,
              Document,
              Agreement,
              UserAgreement,
              OrderEngineerAssignment,
            ],
            synchronize: false, // NEVER use in production!
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            charset: 'utf8mb4',
            extra: {
              connectionLimit: 10,
              acquireTimeout: 60000,
              timeout: 60000,
            },
          };
        } else {
          // SQLite for local development
          return {
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
              SalaryCalculation,
              EngineerOrganizationRate,
              WorkSession,
              SalaryPayment,
              EngineerBalance,
              Document,
              Agreement,
              UserAgreement,
              OrderEngineerAssignment,
            ],
            synchronize: true,
            logging: false,
          };
        }
      },
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
    WorkSessionsModule,
    PaymentsModule,
    LogsModule,
    AppUpdateModule,
    DocumentsModule,
    AgreementsModule,
  ],
  controllers: [TestController],
  providers: [],
})
export class AppModule {}
