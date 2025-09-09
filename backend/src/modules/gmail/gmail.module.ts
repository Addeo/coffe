import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GmailService } from './gmail.service';
import { GmailController } from './gmail.controller';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    ConfigModule,
    OrdersModule,
    NotificationsModule,
    LoggerModule,
  ],
  controllers: [GmailController],
  providers: [GmailService],
  exports: [GmailService],
})
export class GmailModule {}
