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
import { NotificationsModule } from '../notifications/notifications.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { CalculationsModule } from '../расчеты/calculations.module';
// import { StatisticsModule } from '../statistics/statistics.module';
// import { CalculationsModule } from '../расчеты/calculations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, User, Engineer, Organization, File, Setting, UserActivityLog]),
    NotificationsModule,
    StatisticsModule,
    CalculationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
