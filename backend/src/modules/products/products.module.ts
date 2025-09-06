import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([])], // Add Product entity when created
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
