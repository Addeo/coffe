import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, createdById: number): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async findAll(currentUser: any): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.firstName', 'user.lastName', 'user.role', 'user.isActive', 'user.createdAt', 'user.updatedAt']);

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
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'updatedAt'],
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

    const updateData = { ...updateUserDto };

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    await this.userRepository.update(id, updateData);
    return this.findOne(id, currentUser);
  }

  async remove(id: number, currentUser: any): Promise<boolean> {
    // Check if current user can delete this user
    const existingUser = await this.findOne(id, currentUser);
    if (!existingUser) {
      return false;
    }

    await this.userRepository.delete(id);
    return true;
  }
}
