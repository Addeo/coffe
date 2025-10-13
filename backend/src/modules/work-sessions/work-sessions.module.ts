import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkSession } from '../../entities/work-session.entity';
import { Order } from '../../entities/order.entity';
import { Engineer } from '../../entities/engineer.entity';
import { WorkSessionsService } from './work-sessions.service';
import { WorkSessionsController } from './work-sessions.controller';
import { CalculationsModule } from '../расчеты/calculations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkSession, Order, Engineer]),
    CalculationsModule,
  ],
  controllers: [WorkSessionsController],
  providers: [WorkSessionsService],
  exports: [WorkSessionsService],
})
export class WorkSessionsModule {}

