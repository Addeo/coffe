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
    console.log('=== ORGANIZATIONS SERVICE findAll ===');
    console.log('queryDto:', queryDto);

    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      hasOvertime,
      minBaseRate,
      maxBaseRate,
      minOvertimeMultiplier,
      maxOvertimeMultiplier,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = queryDto;

    console.log('Parsed params:', { page, limit, search, isActive });

    const query = this.organizationRepository
      .createQueryBuilder('organization')
      .select([
        'organization.id',
        'organization.name',
        'organization.baseRate',
        'organization.overtimeMultiplier',
        'organization.hasOvertime',
        'organization.isActive',
        'organization.createdAt',
        'organization.updatedAt',
      ]);

    // Apply filters
    if (isActive !== undefined) {
      query.andWhere('organization.isActive = :isActive', { isActive });
    }

    if (hasOvertime !== undefined) {
      query.andWhere('organization.hasOvertime = :hasOvertime', { hasOvertime });
    }

    if (search) {
      query.andWhere('organization.name LIKE :search', { search: `%${search}%` });
    }

    if (minBaseRate !== undefined) {
      query.andWhere('organization.baseRate >= :minBaseRate', { minBaseRate });
    }

    if (maxBaseRate !== undefined) {
      query.andWhere('organization.baseRate <= :maxBaseRate', { maxBaseRate });
    }

    if (minOvertimeMultiplier !== undefined) {
      query.andWhere('organization.overtimeMultiplier >= :minOvertimeMultiplier', {
        minOvertimeMultiplier,
      });
    }

    if (maxOvertimeMultiplier !== undefined) {
      query.andWhere('organization.overtimeMultiplier <= :maxOvertimeMultiplier', {
        maxOvertimeMultiplier,
      });
    }

    // Apply sorting
    query.orderBy(`organization.${sortBy}`, sortOrder);

    // Apply pagination
    query.skip((page - 1) * limit).take(limit);

    const sql = query.getSql();
    console.log('Generated SQL:', sql);

    const [data, total] = await query.getManyAndCount();

    console.log('Query result:', { data: data.length, total, page, limit });
    console.log(
      'Data items:',
      data.map(d => ({ id: d.id, name: d.name }))
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  async findOneIncludingInactive(id: number): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: number, updateOrganizationDto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOneIncludingInactive(id);

    Object.assign(organization, updateOrganizationDto);
    return this.organizationRepository.save(organization);
  }

  async toggleStatus(id: number): Promise<Organization> {
    const organization = await this.findOneIncludingInactive(id);
    organization.isActive = !organization.isActive;
    return this.organizationRepository.save(organization);
  }

  async remove(id: number): Promise<void> {
    const organization = await this.findOneIncludingInactive(id);

    // Hard delete - полное удаление из базы данных
    await this.organizationRepository.remove(organization);
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
        console.log(
          `Created default rates for ${ratePromises.length} engineers for organization ${organization.name}`
        );
      }
    } catch (error) {
      console.error('Error creating default rates for new organization:', error);
      // Не прерываем создание организации из-за ошибки в создании ставок
      // Ставки можно будет создать позже вручную
    }
  }
}
