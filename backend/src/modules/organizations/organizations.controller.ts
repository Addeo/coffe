import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsQueryDto } from '../../../shared/dtos/organization.dto';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Query() query: any) {
    console.log('=== ORGANIZATIONS CONTROLLER ===');
    console.log('GET /api/organizations called');
    console.log('Query parameters:', query);
    console.log('Headers:', {
      authorization: 'present',
      contentType: 'application/json',
    });
    console.log('Calling organizationsService.findAll...');
    return this.organizationsService.findAll(query);
  }

  @Get('test')
  @UseGuards() // Отключить guards для этого эндпоинта
  test() {
    console.log('=== ORGANIZATIONS CONTROLLER ===');
    console.log('GET /api/organizations/test called - NO AUTH REQUIRED');
    return { message: 'Test endpoint works', timestamp: new Date().toISOString() };
  }

  @Get('public')
  @UseGuards() // Отключить guards для этого эндпоинта
  findAllPublic() {
    console.log('=== CONTROLLER findAllPublic called ===');
    return this.organizationsService.findAll({ limit: 100 });
  }

  @Patch('public/:id')
  updatePublic(@Param('id') id: string, @Body() updateOrganizationDto: any) {
    return this.organizationsService.update(+id, updateOrganizationDto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationsService.update(+id, updateOrganizationDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(+id);
  }
}
