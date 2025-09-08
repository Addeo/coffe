import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { FilesModule } from './modules/files/files.module';
import { TestModule } from './modules/test/test.module';
import { User } from './entities/user.entity';
import { Order } from './entities/order.entity';
import { Organization } from './entities/organization.entity';
import { Engineer } from './entities/engineer.entity';
import { Product } from './entities/product.entity';
import { File } from './entities/file.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'coffee_user',
      password: process.env.DB_PASSWORD || 'coffee_password',
      database: process.env.DB_DATABASE || 'coffee_admin',
      entities: [User, Order, Organization, Engineer, Product, File],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    // AuthModule,
    // UsersModule,
    // ProductsModule,
    // OrdersModule,
    // FilesModule,
    TestModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
