import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { EngineerOrganizationRate } from '../../entities/engineer-organization-rate.entity';
import { Engineer } from '../../entities/engineer.entity';
// import { OrganizationsQueryDto } from '../../../shared/dtos/organization.dto';

// Temporary local definition
interface OrganizationsQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  hasOvertime?: boolean;
  minBaseRate?: number;
  maxBaseRate?: number;
  minOvertimeMultiplier?: number;
  maxOvertimeMultiplier?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface OrganizationsResponse {
  data: Organization[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Engineer)
    private engineerRepository: Repository<Engineer>,
    @InjectRepository(EngineerOrganizationRate)
    private engineerOrganizationRateRepository: Repository<EngineerOrganizationRate>
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
    const organization = this.organizationRepository.create(createOrganizationDto);
    const savedOrganization = await this.organizationRepository.save(organization);

    // Автоматически создаем базовые ставки для всех существующих инженеров
    await this.createDefaultRatesForAllEngineers(savedOrganization);

    return savedOrganization;
  }

  async findAll(queryDto: OrganizationsQueryDto = {}): Promise<OrganizationsResponse> {
    console.log('=== ORGANIZATIONS SERVICE ===');
    console.log('findAll called with queryDto:', queryDto);

    try {
      console.log('Returning mock data...');
      const data = [
        {
          id: 1,
          name: 'Test Organization',
          baseRate: 100,
          overtimeMultiplier: 1.5,
          hasOvertime: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const response = {
        data,
        total: data.length,
        page: 1,
        limit: data.length,
        totalPages: 1,
      };

      console.log('Returning mock response:', { total: response.total, page: response.page, limit: response.limit });
      return response;
    } catch (error) {
      console.error('=== ERROR in organizationsService.findAll ===');
      console.error('Error details:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  // Keep the old method for backward compatibility
  async getOrganizations(): Promise<Organization[]> {
    return this.organizationRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id, isActive: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: number, updateOrganizationDto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);

    Object.assign(organization, updateOrganizationDto);
    return this.organizationRepository.save(organization);
  }

  async remove(id: number): Promise<void> {
    const organization = await this.findOne(id);
    organization.isActive = false;
    await this.organizationRepository.save(organization);
  }

  async findByName(name: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({
      where: { name, isActive: true },
    });
  }

  /**
   * Создает базовые ставки для всех активных инженеров при добавлении новой организации
   */
  private async createDefaultRatesForAllEngineers(organization: Organization): Promise<void> {
    try {
      // Получаем всех активных инженеров
      const engineers = await this.engineerRepository.find({
        where: { isActive: true },
      });

      const ratePromises = engineers.map(engineer =>
        this.engineerOrganizationRateRepository.create({
          engineerId: engineer.id,
          organizationId: organization.id,
          // Ставки будут наследоваться от базовых ставок инженера
          // Администратор может позже переопределить их индивидуально
          isActive: true,
        })
      );

      if (ratePromises.length > 0) {
        await this.engineerOrganizationRateRepository.save(ratePromises);
        console.log(`Created default rates for ${ratePromises.length} engineers for organization ${organization.name}`);
      }
    } catch (error) {
      console.error('Error creating default rates for new organization:', error);
      // Не прерываем создание организации из-за ошибки в создании ставок
      // Ставки можно будет создать позже вручную
    }
  }
}
