import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EngineerOrganizationRatesService } from './engineer-organization-rates.service';
import {
  CreateEngineerOrganizationRateDto,
  UpdateEngineerOrganizationRateDto,
  EngineerOrganizationRatesQueryDto,
} from '../../dtos/engineer-organization-rate.dto';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('engineer-organization-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EngineerOrganizationRatesController {
  constructor(
    private readonly engineerOrganizationRatesService: EngineerOrganizationRatesService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createDto: CreateEngineerOrganizationRateDto, @Request() req) {
    return this.engineerOrganizationRatesService.create(createDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Query() query: EngineerOrganizationRatesQueryDto, @Request() req) {
    return this.engineerOrganizationRatesService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string) {
    return this.engineerOrganizationRatesService.findOne(+id);
  }

  @Get('engineer/:engineerId/organization/:organizationId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findByEngineerAndOrganization(
    @Param('engineerId') engineerId: string,
    @Param('organizationId') organizationId: string,
  ) {
    return this.engineerOrganizationRatesService.findByEngineerAndOrganization(
      +engineerId,
      +organizationId,
    );
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEngineerOrganizationRateDto,
  ) {
    return this.engineerOrganizationRatesService.update(+id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.engineerOrganizationRatesService.remove(+id);
  }
}
