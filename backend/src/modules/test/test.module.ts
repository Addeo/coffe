import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../../entities/organization.entity';
import { User } from '../../entities/user.entity';
import { TestController } from './test.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, User])],
  controllers: [TestController],
})
export class TestModule {}
