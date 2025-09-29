import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SalaryCalculation } from '../../entities/salary-calculation.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { Engineer } from '../../entities/engineer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalaryCalculation,
      WorkReport,
      Engineer,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

