import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsQueryDto } from '../../../shared/dtos/organization.dto';

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
    private organizationRepository: Repository<Organization>
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
    const organization = this.organizationRepository.create(createOrganizationDto);
    return this.organizationRepository.save(organization);
  }

  async findAll(queryDto: OrganizationsQueryDto = {}): Promise<OrganizationsResponse> {
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

    const queryBuilder = this.organizationRepository.createQueryBuilder('organization');

    // Apply filters
    if (isActive !== undefined) {
      queryBuilder.andWhere('organization.isActive = :isActive', { isActive });
    }

    if (hasOvertime !== undefined) {
      queryBuilder.andWhere('organization.hasOvertime = :hasOvertime', { hasOvertime });
    }

    if (minBaseRate !== undefined) {
      queryBuilder.andWhere('organization.baseRate >= :minBaseRate', { minBaseRate });
    }

    if (maxBaseRate !== undefined) {
      queryBuilder.andWhere('organization.baseRate <= :maxBaseRate', { maxBaseRate });
    }

    if (minOvertimeMultiplier !== undefined) {
      queryBuilder.andWhere('organization.overtimeMultiplier >= :minOvertimeMultiplier', { minOvertimeMultiplier });
    }

    if (maxOvertimeMultiplier !== undefined) {
      queryBuilder.andWhere('organization.overtimeMultiplier <= :maxOvertimeMultiplier', { maxOvertimeMultiplier });
    }

    if (search) {
      queryBuilder.andWhere('organization.name LIKE :search', { search: `%${search}%` });
    }

    // Apply sorting and pagination
    queryBuilder
      .orderBy(`organization.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

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
}
