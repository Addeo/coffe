import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SalaryCalculation } from '../../entities/salary-calculation.entity';
import { Order } from '../../entities/order.entity';
import { Engineer } from '../../entities/engineer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SalaryCalculation, Order, Engineer])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
