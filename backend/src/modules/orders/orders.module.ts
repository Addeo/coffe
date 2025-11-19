import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { Engineer } from '../../entities/engineer.entity';
import { Organization } from '../../entities/organization.entity';
import { Setting } from '../../entities/settings.entity';
import { UserActivityLog } from '../../entities/user-activity-log.entity';
import { File } from '../../entities/file.entity';
import { OrderEngineerAssignment } from '../../entities/order-engineer-assignment.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { CalculationsModule } from '../расчеты/calculations.module';
import { WorkSessionsModule } from '../work-sessions/work-sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, User, Engineer, Organization, File, Setting, UserActivityLog, OrderEngineerAssignment]),
    NotificationsModule,
    StatisticsModule,
    CalculationsModule,
    WorkSessionsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
