import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../../entities/user.entity';
import { Engineer } from '../../entities/engineer.entity';
import { UserActivityLog } from '../../entities/user-activity-log.entity';
import { EngineerOrganizationRate } from '../../entities/engineer-organization-rate.entity';
import { Organization } from '../../entities/organization.entity';
import { Order } from '../../entities/order.entity';
import { Notification } from '../../entities/notification.entity';
import { Document } from '../../entities/document.entity';
import { File } from '../../entities/file.entity';
import { UserAgreement } from '../../entities/user-agreement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Engineer,
      UserActivityLog,
      EngineerOrganizationRate,
      Organization,
      Order,
      Notification,
      Document,
      File,
      UserAgreement,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
