import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../entities/organization.entity';
import { User } from '../../entities/user.entity';

@Controller('test')
export class TestController {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get()
  getHello() {
    return {
      message: 'Backend is working!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'success',
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
    };
  }

  @Get('organizations')
  async getOrganizations() {
    try {
      const organizations = await this.organizationRepository.find({
        select: ['id', 'name', 'baseRate'],
      });
      return {
        success: true,
        data: organizations,
        count: organizations.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('simple')
  getSimple() {
    return {
      message: 'Simple test works!',
      organizations: [
        { id: 1, name: 'Тестовая организация' },
        { id: 2, name: 'РусХолтс' }
      ]
    };
  }

  @Get('organizations-static')
  getOrganizationsStatic() {
    return {
      success: true,
      data: [
        { id: 1, name: 'Вистекс', baseRate: '900.00' },
        { id: 2, name: 'РусХолтс', baseRate: '1100.00' },
        { id: 3, name: 'ТО Франко', baseRate: '1100.00' },
        { id: 4, name: 'Холод Вистекс', baseRate: '1200.00' },
        { id: 5, name: 'Франко', baseRate: '1210.00' },
        { id: 6, name: 'Локальный Сервис', baseRate: '1200.00' }
      ],
      count: 6,
      note: 'Static data with proper encoding'
    };
  }

  @Patch('organization/:id')
  async updateOrganizationTest(@Param('id') id: string, @Body() data: any) {
    try {
      await this.organizationRepository.update(id, data);
      const updated = await this.organizationRepository.findOne({ where: { id: parseInt(id) } });
      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Patch('user/:id')
  async updateUserTest(@Param('id') id: string, @Body() data: any) {
    try {
      await this.userRepository.update(id, data);
      const updated = await this.userRepository.findOne({
        where: { id: parseInt(id) },
        select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive']
      });
      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('organizations-fixed')
  async getOrganizationsFixed() {
    try {
      // Set UTF-8 encoding for the connection
      await this.organizationRepository.query('SET NAMES utf8mb4');
      await this.organizationRepository.query('SET CHARACTER SET utf8mb4');

      const organizations = await this.organizationRepository.find({
        select: ['id', 'name', 'baseRate'],
      });

      // Ensure proper UTF-8 encoding
      const fixedOrganizations = organizations.map(org => ({
        id: org.id,
        name: org.name,
        baseRate: org.baseRate,
      }));

      return {
        success: true,
        data: fixedOrganizations,
        count: fixedOrganizations.length,
        encoding: 'utf-8',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
