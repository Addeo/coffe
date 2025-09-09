import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { UserActivityLog, ActivityType } from '../../entities/user-activity-log.entity';
import { Engineer } from '../../entities/engineer.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EngineerType } from '../../../shared/interfaces/order.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserActivityLog)
    private activityLogRepository: Repository<UserActivityLog>,
    @InjectRepository(Engineer)
    private engineerRepository: Repository<Engineer>
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
        overtimeRate: createUserDto.overtimeRate || (createUserDto.engineerType === EngineerType.CONTRACT ? 1200 : 700), // Default overtime rate
        planHoursMonth: createUserDto.planHoursMonth || 160, // Default plan hours
        homeTerritoryFixedAmount: createUserDto.homeTerritoryFixedAmount || 0,
        isActive: true,
      });

      await this.engineerRepository.save(engineer);
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

  async findAll(currentUser: any): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
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

    // Admin can see all users
    if (currentUser.role === UserRole.ADMIN) {
      return query.getMany();
    }

    // Manager can see only regular users (not admins or other managers)
    if (currentUser.role === UserRole.MANAGER) {
      return query.where('user.role = :userRole', { userRole: UserRole.USER }).getMany();
    }

    // Regular users cannot see any users
    return [];
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
    });

    if (!user) {
      return null;
    }

    // Admin can see all users
    if (currentUser.role === UserRole.ADMIN) {
      return user;
    }

    // Manager can see only regular users
    if (currentUser.role === UserRole.MANAGER && user.role === UserRole.USER) {
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
}
