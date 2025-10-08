import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EngineerOrganizationRate } from '../../entities/engineer-organization-rate.entity';
import { Engineer } from '../../entities/engineer.entity';
import { Organization } from '../../entities/organization.entity';
import {
  CreateEngineerOrganizationRateDto,
  UpdateEngineerOrganizationRateDto,
  EngineerOrganizationRateDto,
  EngineerOrganizationRatesQueryDto,
} from '../../dtos/engineer-organization-rate.dto';

@Injectable()
export class EngineerOrganizationRatesService {
  constructor(
    @InjectRepository(EngineerOrganizationRate)
    private engineerOrganizationRateRepository: Repository<EngineerOrganizationRate>,
    @InjectRepository(Engineer)
    private engineerRepository: Repository<Engineer>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>
  ) {}

  async create(createDto: CreateEngineerOrganizationRateDto): Promise<EngineerOrganizationRateDto> {
    // Проверяем существование инженера
    const engineer = await this.engineerRepository.findOne({
      where: { id: createDto.engineerId },
    });
    if (!engineer) {
      throw new NotFoundException(`Engineer with id ${createDto.engineerId} not found`);
    }

    // Проверяем существование организации
    const organization = await this.organizationRepository.findOne({
      where: { id: createDto.organizationId },
    });
    if (!organization) {
      throw new NotFoundException(`Organization with id ${createDto.organizationId} not found`);
    }

    // Проверяем, не существует ли уже такая запись
    const existing = await this.engineerOrganizationRateRepository.findOne({
      where: {
        engineerId: createDto.engineerId,
        organizationId: createDto.organizationId,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Rate configuration already exists for engineer ${createDto.engineerId} and organization ${createDto.organizationId}`
      );
    }

    // Создаём запись с автоматическим заполнением базовых ставок из профиля инженера
    const rate = this.engineerOrganizationRateRepository.create({
      ...createDto,
      // Если ставки не указаны в DTO, берём из профиля инженера
      customBaseRate: createDto.customBaseRate ?? engineer.baseRate,
      customOvertimeRate: createDto.customOvertimeRate ?? engineer.overtimeRate,
      // Зональные доплаты остаются null если не указаны
      customZone1Extra: createDto.customZone1Extra ?? null,
      customZone2Extra: createDto.customZone2Extra ?? null,
      customZone3Extra: createDto.customZone3Extra ?? null,
    });

    const savedRate = await this.engineerOrganizationRateRepository.save(rate);

    // Ensure savedRate is a single entity, not an array
    const savedEntity = Array.isArray(savedRate) ? savedRate[0] : savedRate;

    // Reload with relations
    const rateWithRelations = await this.engineerOrganizationRateRepository.findOne({
      where: { id: savedEntity.id },
      relations: ['organization'],
    });

    return this.mapToDto(rateWithRelations!, rateWithRelations!.organization.name);
  }

  async findAll(
    query: EngineerOrganizationRatesQueryDto = {}
  ): Promise<EngineerOrganizationRateDto[]> {
    const qb = this.engineerOrganizationRateRepository
      .createQueryBuilder('rate')
      .leftJoinAndSelect('rate.organization', 'organization')
      .leftJoinAndSelect('rate.engineer', 'engineer')
      .leftJoinAndSelect('engineer.user', 'user');

    if (query.engineerId) {
      qb.andWhere('rate.engineerId = :engineerId', { engineerId: query.engineerId });
    }

    if (query.organizationId) {
      qb.andWhere('rate.organizationId = :organizationId', {
        organizationId: query.organizationId,
      });
    }

    // Пагинация
    if (query.page && query.limit) {
      qb.skip((query.page - 1) * query.limit).take(query.limit);
    }

    qb.orderBy('rate.createdAt', 'DESC');

    const rates = await qb.getMany();
    return rates.map(rate =>
      this.mapToDto(rate, rate.organization?.name || 'Unknown Organization')
    );
  }

  async findOne(id: number): Promise<EngineerOrganizationRateDto> {
    const rate = await this.engineerOrganizationRateRepository.findOne({
      where: { id },
      relations: ['organization', 'engineer', 'engineer.user'],
    });

    if (!rate) {
      throw new NotFoundException(`Rate configuration with id ${id} not found`);
    }

    return this.mapToDto(rate, rate.organization.name);
  }

  async findByEngineerAndOrganization(
    engineerId: number,
    organizationId: number
  ): Promise<EngineerOrganizationRateDto | null> {
    const rate = await this.engineerOrganizationRateRepository.findOne({
      where: {
        engineerId,
        organizationId,
        isActive: true,
      },
      relations: ['organization'],
    });

    if (!rate) {
      return null;
    }

    return this.mapToDto(rate, rate.organization.name);
  }

  async update(
    id: number,
    updateDto: UpdateEngineerOrganizationRateDto
  ): Promise<EngineerOrganizationRateDto> {
    const rate = await this.engineerOrganizationRateRepository.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!rate) {
      throw new NotFoundException(`Rate configuration with id ${id} not found`);
    }

    Object.assign(rate, updateDto);
    const updatedRate = await this.engineerOrganizationRateRepository.save(rate);

    return this.mapToDto(updatedRate, updatedRate.organization?.name || 'Unknown Organization');
  }

  async remove(id: number): Promise<void> {
    const rate = await this.engineerOrganizationRateRepository.findOne({
      where: { id },
    });

    if (!rate) {
      throw new NotFoundException(`Rate configuration with id ${id} not found`);
    }

    await this.engineerOrganizationRateRepository.remove(rate);
  }

  private mapToDto(
    rate: EngineerOrganizationRate,
    organizationName: string
  ): EngineerOrganizationRateDto {
    return {
      id: rate.id,
      engineerId: rate.engineerId,
      organizationId: rate.organizationId,
      organizationName,
      customBaseRate: rate.customBaseRate,
      customOvertimeRate: rate.customOvertimeRate,
      customZone1Extra: rate.customZone1Extra,
      customZone2Extra: rate.customZone2Extra,
      customZone3Extra: rate.customZone3Extra,
      createdAt: rate.createdAt,
      updatedAt: rate.updatedAt,
    };
  }
}
