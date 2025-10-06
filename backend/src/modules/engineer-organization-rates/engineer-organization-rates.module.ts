import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EngineerOrganizationRatesService } from './engineer-organization-rates.service';
import { EngineerOrganizationRatesController } from './engineer-organization-rates.controller';
import { EngineerOrganizationRate } from '../../entities/engineer-organization-rate.entity';
import { Engineer } from '../../entities/engineer.entity';
import { Organization } from '../../entities/organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EngineerOrganizationRate, Engineer, Organization])],
  controllers: [EngineerOrganizationRatesController],
  providers: [EngineerOrganizationRatesService],
  exports: [EngineerOrganizationRatesService],
})
export class EngineerOrganizationRatesModule {}
