import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryPayment } from '../../entities/salary-payment.entity';
import { EngineerBalance } from '../../entities/engineer-balance.entity';
import { SalaryCalculation } from '../../entities/salary-calculation.entity';
import { Engineer } from '../../entities/engineer.entity';
import { SalaryPaymentService } from './salary-payment.service';
import { SalaryPaymentController } from './salary-payment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalaryPayment, EngineerBalance, SalaryCalculation, Engineer]),
  ],
  controllers: [SalaryPaymentController],
  providers: [SalaryPaymentService],
  exports: [SalaryPaymentService],
})
export class PaymentsModule {}
