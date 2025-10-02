import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { Organization } from '../../entities/organization.entity';
import { Engineer } from '../../entities/engineer.entity';
import { EngineerOrganizationRate } from '../../entities/engineer-organization-rate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, Engineer, EngineerOrganizationRate])],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
