import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../../entities/user.entity';
import { Engineer } from '../../entities/engineer.entity';
import { UserActivityLog } from '../../entities/user-activity-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Engineer, UserActivityLog])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
