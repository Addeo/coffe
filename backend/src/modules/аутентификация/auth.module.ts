import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../../entities/user.entity';
import { Engineer } from '../../entities/engineer.entity';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Engineer]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error(
            'JWT_SECRET is not defined in environment variables! ' +
              'Please set JWT_SECRET in your .env file before starting the application.'
          );
        }

        return {
          secret,
          signOptions: { expiresIn: '24h' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule implements OnModuleInit {
  constructor(private authService: AuthService) {}

  async onModuleInit() {
    // Wait for database connection to be established
    // In Docker, MySQL needs time to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      console.log('🔄 Auto-initializing default users...');
      const result = await this.authService.initializeAdmin();
      
      if (result.users.admin || result.users.manager || result.users.engineer) {
        console.log('✅ Default users initialized:', {
          admin: result.users.admin ? 'created/updated' : 'skipped',
          manager: result.users.manager ? 'created/updated' : 'skipped',
          engineer: result.users.engineer ? 'created/updated' : 'skipped',
        });
        console.log('📝 Default passwords:', result.passwords);
        console.log('📌 Note:', result.note);
      } else {
        console.log('ℹ️ All default users already exist');
      }
    } catch (error) {
      console.error('❌ Failed to auto-initialize users:', error.message);
      console.error('   This is not critical - users can be initialized manually via GET /api/auth/init-admin');
      // Don't fail app startup if initialization fails
    }
  }
}
