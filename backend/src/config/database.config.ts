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
    // Use SQLite for local development
    return {
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [User, Organization],
      synchronize: true,
    };
  }
};
