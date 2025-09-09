import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { EarningsStatistic } from '../../entities/earnings-statistic.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, User, EarningsStatistic])],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
