import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalculationService } from './calculation.service';
import { Engineer } from '../../entities/engineer.entity';
import { Organization } from '../../entities/organization.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { SalaryCalculation } from '../../entities/salary-calculation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Engineer, Organization, WorkReport, SalaryCalculation])],
  providers: [CalculationService],
  exports: [CalculationService],
})
export class CalculationsModule {}
