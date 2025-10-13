import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { Engineer } from '../../entities/engineer.entity';
import { WorkSession } from '../../entities/work-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, User, Organization, Engineer, WorkSession])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
