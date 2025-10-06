import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { UserActivityLog, ActivityType } from '../../entities/user-activity-log.entity';
import { Engineer } from '../../entities/engineer.entity';
import { EngineerOrganizationRate } from '../../entities/engineer-organization-rate.entity';
import { Organization } from '../../entities/organization.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersQueryDto } from '../../../shared/dtos/user.dto';
import { EngineerType } from '../../../shared/interfaces/order.interface';

export interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserActivityLog)
    private activityLogRepository: Repository<UserActivityLog>,
    @InjectRepository(Engineer)
    private engineerRepository: Repository<Engineer>,
    @InjectRepository(EngineerOrganizationRate)
    private engineerOrganizationRateRepository: Repository<EngineerOrganizationRate>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>
  ) {}

  async create(createUserDto: CreateUserDto, createdById: number): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // If user is an engineer (USER role), create engineer record
    if (createUserDto.role === UserRole.USER && createUserDto.engineerType) {
      const engineer = this.engineerRepository.create({
        userId: savedUser.id,
        type: createUserDto.engineerType,
        baseRate: createUserDto.baseRate || 700, // Default base rate
        overtimeRate:
          createUserDto.overtimeRate ||
          (createUserDto.engineerType === EngineerType.CONTRACT ? 1200 : 700), // Default overtime rate
        planHoursMonth: createUserDto.planHoursMonth || 160, // Default plan hours
        homeTerritoryFixedAmount: createUserDto.homeTerritoryFixedAmount || 0,
        isActive: true,
      });

      const savedEngineer = await this.engineerRepository.save(engineer);

      // Автоматически создаем базовые ставки для всех существующих организаций
      await this.createDefaultRatesForAllOrganizations(savedEngineer);
    }

    // Логируем создание пользователя
    await this.logActivity(
      savedUser.id,
      ActivityType.USER_CREATED,
      `User ${savedUser.firstName} ${savedUser.lastName} was created`,
      { createdById, role: createUserDto.role, engineerType: createUserDto.engineerType },
      createdById
    );

    return savedUser;
  }

  async findAll(currentUser: any, queryDto: UsersQueryDto = {}): Promise<UsersResponse> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      engineerType,
      engineerIsActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.assignedOrders', 'assignedOrders')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.isActive',
        'user.createdAt',
        'user.updatedAt',
      ]);

    // Apply access control based on user role
    if (currentUser.role === UserRole.ADMIN) {
      // Admin can see all users
    } else if (currentUser.role === UserRole.MANAGER) {
      // Manager can see only regular users (not admins or other managers)
      query.andWhere('user.role = :userRole', { userRole: UserRole.USER });
    } else {
      // Regular users cannot see any users
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // Apply filters
    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', { isActive });
    }

    if (search) {
      query.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Filter by engineer type and status for USER role
    if (role === UserRole.USER || currentUser.role === UserRole.MANAGER) {
      if (engineerType || engineerIsActive !== undefined) {
        query.leftJoin('user.engineers', 'engineer');

        if (engineerType) {
          query.andWhere('engineer.type = :engineerType', { engineerType });
        }

        if (engineerIsActive !== undefined) {
          query.andWhere('engineer.isActive = :engineerIsActive', { engineerIsActive });
        }
      }
    }

    // Apply sorting
    query.orderBy(`user.${sortBy}`, sortOrder);

    // Apply pagination
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    // Load engineer data for USER role users
    if (data.some(user => user.role === UserRole.USER)) {
      for (const user of data) {
        if (user.role === UserRole.USER) {
          const engineer = await this.engineerRepository.findOne({ where: { userId: user.id } });
          if (engineer) {
            (user as any).engineer = engineer;
          }
        }
      }
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, currentUser: any): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
      relations: ['assignedOrders'],
    });

    if (!user) {
      return null;
    }

    // Admin can see all users
    if (currentUser.role === UserRole.ADMIN) {
      // Include engineer data for USER role
      if (user.role === UserRole.USER) {
        const engineer = await this.engineerRepository.findOne({ where: { userId: id } });
        if (engineer) {
          (user as any).engineer = engineer;
        }
      }
      return user;
    }

    // Manager can see only regular users
    if (currentUser.role === UserRole.MANAGER && user.role === UserRole.USER) {
      // Include engineer data for USER role
      const engineer = await this.engineerRepository.findOne({ where: { userId: id } });
      if (engineer) {
        (user as any).engineer = engineer;
      }
      return user;
    }

    // Regular users cannot see any users, or managers cannot see other managers/admins
    return null;
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: number, updateUserDto: UpdateUserDto, currentUser: any): Promise<User | null> {
    // Check if current user can update this user
    const existingUser = await this.findOne(id, currentUser);
    if (!existingUser) {
      throw new Error('User not found or access denied');
    }

    const oldUserData = { ...existingUser };
    const updateData = { ...updateUserDto };

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    await this.userRepository.update(id, updateData);
    const updatedUser = await this.findOne(id, currentUser);

    // Update engineer data if provided and user role is USER
    if (updateUserDto.role === UserRole.USER && updateUserDto.engineerType) {
      let engineer = await this.engineerRepository.findOne({ where: { userId: id } });

      if (engineer) {
        // Update existing engineer
        await this.engineerRepository.update(engineer.id, {
          type: updateUserDto.engineerType,
          baseRate: updateUserDto.baseRate || engineer.baseRate,
          overtimeRate: updateUserDto.overtimeRate || engineer.overtimeRate,
          planHoursMonth: updateUserDto.planHoursMonth || engineer.planHoursMonth,
          homeTerritoryFixedAmount:
            updateUserDto.homeTerritoryFixedAmount || engineer.homeTerritoryFixedAmount,
          isActive:
            updateUserDto.engineerIsActive !== undefined
              ? updateUserDto.engineerIsActive
              : engineer.isActive,
        });
      } else {
        // Create new engineer record if it doesn't exist
        engineer = this.engineerRepository.create({
          userId: id,
          type: updateUserDto.engineerType,
          baseRate: updateUserDto.baseRate || 700,
          overtimeRate:
            updateUserDto.overtimeRate ||
            (updateUserDto.engineerType === EngineerType.CONTRACT ? 1200 : 700),
          planHoursMonth: updateUserDto.planHoursMonth || 160,
          homeTerritoryFixedAmount: updateUserDto.homeTerritoryFixedAmount || 0,
          isActive:
            updateUserDto.engineerIsActive !== undefined ? updateUserDto.engineerIsActive : true,
        });
        await this.engineerRepository.save(engineer);
      }
    }

    // Логируем изменения пользователя
    const changes = this.getChanges(oldUserData, updatedUser);
    if (changes.length > 0) {
      await this.logActivity(
        id,
        ActivityType.USER_UPDATED,
        `User ${updatedUser.firstName} ${updatedUser.lastName} was updated: ${changes.join(', ')}`,
        { changes, oldData: oldUserData, newData: updatedUser },
        currentUser.id
      );
    }

    return updatedUser;
  }

  async remove(id: number, currentUser: any): Promise<boolean> {
    // Check if current user can delete this user
    const existingUser = await this.findOne(id, currentUser);
    if (!existingUser) {
      return false;
    }

    await this.userRepository.delete(id);

    // Логируем удаление пользователя
    await this.logActivity(
      id,
      ActivityType.USER_DELETED,
      `User ${existingUser.firstName} ${existingUser.lastName} was deleted`,
      { deletedUser: existingUser },
      currentUser.id
    );

    return true;
  }

  private async logActivity(
    userId: number,
    activityType: ActivityType,
    description: string,
    metadata: any,
    performedById: number
  ): Promise<void> {
    const log = this.activityLogRepository.create({
      userId,
      activityType,
      description,
      metadata,
      performedById,
    });

    await this.activityLogRepository.save(log);
  }

  private getChanges(oldData: any, newData: any): string[] {
    const changes: string[] = [];

    if (oldData.email !== newData.email) changes.push('email');
    if (oldData.firstName !== newData.firstName) changes.push('first name');
    if (oldData.lastName !== newData.lastName) changes.push('last name');
    if (oldData.role !== newData.role) changes.push('role');
    if (oldData.isActive !== newData.isActive) {
      changes.push(newData.isActive ? 'activated' : 'deactivated');
    }

    return changes;
  }

  /**
   * Создает базовые ставки для всех активных организаций при добавлении нового инженера
   */
  private async createDefaultRatesForAllOrganizations(engineer: Engineer): Promise<void> {
    try {
      // Получаем все активные организации
      const organizations = await this.organizationRepository.find({
        where: { isActive: true },
      });

      const ratePromises = organizations.map(organization =>
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
          `Created default rates for engineer ${engineer.id} for ${ratePromises.length} organizations`
        );
      }
    } catch (error) {
      console.error('Error creating default rates for new engineer:', error);
      // Не прерываем создание инженера из-за ошибки в создании ставок
      // Ставки можно будет создать позже вручную
    }
  }
}
