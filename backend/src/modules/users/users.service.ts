import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { UserActivityLog, ActivityType } from '../../entities/user-activity-log.entity';
import { Engineer } from '../../entities/engineer.entity';
import { EngineerOrganizationRate } from '../../entities/engineer-organization-rate.entity';
import { Organization } from '../../entities/organization.entity';
import { Order } from '../../entities/order.entity';
import { Notification } from '../../entities/notification.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersQueryDto } from '../../../shared/dtos/user.dto';
import { EngineerType, OrderStatus } from '../../../shared/interfaces/order.interface';
import { UserDeletionException, UserDeletionConflict } from './exceptions/user-deletion.exception';

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
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>
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

    // Extract engineer-specific fields that should not be updated in User entity
    const {
      engineerType,
      baseRate,
      overtimeRate,
      planHoursMonth,
      homeTerritoryFixedAmount,
      fixedSalary,
      fixedCarAmount,
      engineerIsActive,
      ...userUpdateData
    } = updateUserDto;

    const updateData = { ...userUpdateData };

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    await this.userRepository.update(id, updateData);
    const updatedUser = await this.findOne(id, currentUser);

    // Update engineer data if provided and user role is USER
    const hasEngineerData =
      updateUserDto.engineerType ||
      updateUserDto.baseRate !== undefined ||
      updateUserDto.overtimeRate !== undefined ||
      updateUserDto.planHoursMonth !== undefined ||
      updateUserDto.homeTerritoryFixedAmount !== undefined ||
      updateUserDto.fixedSalary !== undefined ||
      updateUserDto.fixedCarAmount !== undefined ||
      updateUserDto.engineerIsActive !== undefined;

    if (
      (updateUserDto.role === UserRole.USER || existingUser.role === UserRole.USER) &&
      hasEngineerData
    ) {
      let engineer = await this.engineerRepository.findOne({ where: { userId: id } });

      if (engineer) {
        // Update existing engineer
        await this.engineerRepository.update(engineer.id, {
          ...(updateUserDto.engineerType && { type: updateUserDto.engineerType }),
          ...(updateUserDto.baseRate !== undefined && { baseRate: updateUserDto.baseRate }),
          ...(updateUserDto.overtimeRate !== undefined && {
            overtimeRate: updateUserDto.overtimeRate,
          }),
          ...(updateUserDto.planHoursMonth !== undefined && {
            planHoursMonth: updateUserDto.planHoursMonth,
          }),
          ...(updateUserDto.homeTerritoryFixedAmount !== undefined && {
            homeTerritoryFixedAmount: updateUserDto.homeTerritoryFixedAmount,
          }),
          ...(updateUserDto.fixedSalary !== undefined && {
            fixedSalary: updateUserDto.fixedSalary,
          }),
          ...(updateUserDto.fixedCarAmount !== undefined && {
            fixedCarAmount: updateUserDto.fixedCarAmount,
          }),
          ...(updateUserDto.engineerIsActive !== undefined && {
            isActive: updateUserDto.engineerIsActive,
          }),
        });
      } else {
        // Create new engineer record if it doesn't exist
        engineer = this.engineerRepository.create({
          userId: id,
          ...(updateUserDto.engineerType && { type: updateUserDto.engineerType }),
          ...(updateUserDto.baseRate !== undefined && { baseRate: updateUserDto.baseRate }),
          ...(updateUserDto.overtimeRate !== undefined && {
            overtimeRate: updateUserDto.overtimeRate,
          }),
          ...(updateUserDto.planHoursMonth !== undefined && {
            planHoursMonth: updateUserDto.planHoursMonth,
          }),
          ...(updateUserDto.homeTerritoryFixedAmount !== undefined && {
            homeTerritoryFixedAmount: updateUserDto.homeTerritoryFixedAmount,
          }),
          ...(updateUserDto.fixedSalary !== undefined && {
            fixedSalary: updateUserDto.fixedSalary,
          }),
          ...(updateUserDto.fixedCarAmount !== undefined && {
            fixedCarAmount: updateUserDto.fixedCarAmount,
          }),
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
    console.log(`Starting cascade deletion for user ${id}`);

    // Find user directly (not through findOne to avoid permission checks)
    const existingUser = await this.userRepository.findOne({ where: { id } });
    if (!existingUser) {
      console.log(`User ${id} not found`);
      return false;
    }

    // Perform cascade deletion (always, ignoring conflicts)
    await this.performCascadeDeletion(id);

    // Delete the user
    await this.userRepository.delete(id);

    // Логируем удаление пользователя
    await this.logActivity(
      id,
      ActivityType.USER_DELETED,
      `User ${existingUser.firstName} ${existingUser.lastName} was cascade deleted`,
      { deletedUser: existingUser, cascadeDeletion: true },
      currentUser.id
    );

    console.log(`User ${id} cascade deleted successfully`);
    return true;
  }

  async forceDelete(id: number, currentUser: any): Promise<boolean> {
    // Check if current user can delete this user
    const existingUser = await this.findOne(id, currentUser);
    if (!existingUser) {
      return false;
    }

    // Perform cascade deletion
    await this.performCascadeDeletion(id);

    // Delete the user
    await this.userRepository.delete(id);

    // Логируем удаление пользователя
    await this.logActivity(
      id,
      ActivityType.USER_DELETED,
      `User ${existingUser.firstName} ${existingUser.lastName} was force deleted with cascade`,
      { deletedUser: existingUser, cascadeDeletion: true },
      currentUser.id
    );

    return true;
  }

  /**
   * Perform cascade deletion of all user-related data
   */
  private async performCascadeDeletion(userId: number): Promise<void> {
    // Delete engineer organization rates first
    await this.engineerOrganizationRateRepository.delete({ engineerId: userId });

    // Delete engineer profile
    await this.engineerRepository.delete({ userId });

    // Delete orders created by this user
    await this.orderRepository.update({ createdById: userId }, { createdById: null });

    // Delete orders assigned by this user
    await this.orderRepository.update({ assignedById: userId }, { assignedById: null });

    // Delete user activity logs performed by this user
    await this.activityLogRepository.delete({ performedById: userId });

    // Delete user activity logs about this user
    await this.activityLogRepository.delete({ userId });

    // Delete notifications for this user
    await this.notificationRepository.delete({ userId });

    // Update orders to remove engineer assignment (if engineer exists)
    const engineer = await this.engineerRepository.findOne({ where: { userId } });
    if (engineer) {
      await this.orderRepository.update(
        { assignedEngineerId: engineer.id },
        { assignedEngineerId: null, status: OrderStatus.WAITING }
      );
    }
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
   * Check for dependencies that would prevent user deletion
   */
  private async checkDeletionConflicts(userId: number): Promise<UserDeletionConflict[]> {
    const conflicts: UserDeletionConflict[] = [];

    // Check orders created by this user
    const createdOrdersCount = await this.orderRepository.count({
      where: { createdById: userId },
    });
    if (createdOrdersCount > 0) {
      conflicts.push({
        table: 'orders',
        count: createdOrdersCount,
        description: `User has created ${createdOrdersCount} order(s)`,
      });
    }

    // Check orders assigned by this user
    const assignedOrdersCount = await this.orderRepository.count({
      where: { assignedById: userId },
    });
    if (assignedOrdersCount > 0) {
      conflicts.push({
        table: 'orders',
        count: assignedOrdersCount,
        description: `User has assigned ${assignedOrdersCount} order(s)`,
      });
    }

    // Check if user has engineer record
    const engineerCount = await this.engineerRepository.count({
      where: { userId },
    });
    if (engineerCount > 0) {
      conflicts.push({
        table: 'engineers',
        count: engineerCount,
        description: 'User has associated engineer profile',
      });
    }

    // Check user activity logs performed by this user
    const activityLogsPerformedCount = await this.activityLogRepository.count({
      where: { performedById: userId },
    });
    if (activityLogsPerformedCount > 0) {
      conflicts.push({
        table: 'user_activity_logs',
        count: activityLogsPerformedCount,
        description: `User has performed ${activityLogsPerformedCount} action(s)`,
      });
    }

    // Check user activity logs about this user
    const activityLogsAboutUserCount = await this.activityLogRepository.count({
      where: { userId },
    });
    if (activityLogsAboutUserCount > 0) {
      conflicts.push({
        table: 'user_activity_logs',
        count: activityLogsAboutUserCount,
        description: `There are ${activityLogsAboutUserCount} activity log(s) about this user`,
      });
    }

    // Check notifications for this user
    const notificationsCount = await this.notificationRepository.count({
      where: { userId },
    });
    if (notificationsCount > 0) {
      conflicts.push({
        table: 'notifications',
        count: notificationsCount,
        description: `User has ${notificationsCount} notification(s)`,
      });
    }

    return conflicts;
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
