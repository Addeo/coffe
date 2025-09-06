import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([])], // Add Order entity when created
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
