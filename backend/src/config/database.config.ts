import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Use PostgreSQL for production (Render)
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Organization],
      synchronize: true, // Only for demo, don't use in production
      ssl: {
        rejectUnauthorized: false,
      },
    };
  } else {
    // Use MySQL for local development (Docker)
    return {
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'coffee_user',
      password: process.env.DB_PASSWORD || 'coffee_password',
      database: process.env.DB_DATABASE || 'coffee_admin',
      entities: [User, Organization],
      synchronize: true,
      charset: 'utf8mb4',
      extra: {
        charset: 'utf8mb4_unicode_ci',
      },
    };
  }
};
