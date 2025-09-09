import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestModule } from './modules/test/test.module';
import { User } from './entities/user.entity';
import { Order } from './entities/order.entity';
import { Organization } from './entities/organization.entity';
import { Engineer } from './entities/engineer.entity';
import { Product } from './entities/product.entity';
import { File } from './entities/file.entity';
import { Setting } from './entities/settings.entity';
import { TestController } from './modules/test/test.controller';
import { AuthModule } from './modules/auth/auth.module';
import { SettingsModule } from './modules/settings/settings.module';

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
      entities: [User, Order, Organization, Engineer, Product, File, Setting],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    SettingsModule,
    // UsersModule,
    // ProductsModule,
    // OrdersModule,
    // FilesModule,
    TestModule,
  ],
  controllers: [TestController],
  providers: [],
})
export class AppModule {}
