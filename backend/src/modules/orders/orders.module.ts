import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { Engineer } from '../../entities/engineer.entity';
import { Organization } from '../../entities/organization.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { Setting } from '../../entities/settings.entity';
import { UserActivityLog } from '../../entities/user-activity-log.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { CalculationsModule } from '../calculations/calculations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      User,
      Engineer,
      Organization,
      WorkReport,
      Setting,
      UserActivityLog,
    ]),
    NotificationsModule,
    StatisticsModule,
    CalculationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
