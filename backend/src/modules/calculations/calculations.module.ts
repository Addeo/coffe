import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { ScheduleModule } from '@nestjs/schedule';
import { CalculationService } from './calculation.service';
import { SalaryCalculationService } from './salary-calculation.service';
import { CalculationsController } from './calculations.controller';
import { Engineer } from '../../entities/engineer.entity';
import { Organization } from '../../entities/organization.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { SalaryCalculation } from '../../entities/salary-calculation.entity';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { EngineerOrganizationRate } from '../../entities/engineer-organization-rate.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Engineer, Organization, WorkReport, SalaryCalculation, Order, User, EngineerOrganizationRate]),
    // ScheduleModule.forRoot(),
    EmailModule,
  ],
  controllers: [CalculationsController],
  providers: [CalculationService, SalaryCalculationService],
  exports: [CalculationService, SalaryCalculationService],
})
export class CalculationsModule {}
