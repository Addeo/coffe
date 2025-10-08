import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { EarningsStatistic } from '../../entities/earnings-statistic.entity';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { Engineer } from '../../entities/engineer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EarningsStatistic, Order, User, Organization, WorkReport, Engineer])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
