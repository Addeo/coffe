import {
  User,
  UserRole,
  LoginRequest,
  LoginResponse,
  AuthUser,
} from '../interfaces/user.interface';
import { EngineerType } from '../interfaces/order.interface';

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  // Engineer-specific fields
  engineerType?: EngineerType;
  baseRate?: number;
  overtimeRate?: number;
  planHoursMonth?: number;
  homeTerritoryFixedAmount?: number;
  fixedSalary?: number;
  fixedCarAmount?: number;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  // Engineer-specific fields
  engineerType?: EngineerType;
  baseRate?: number;
  overtimeRate?: number;
  planHoursMonth?: number;
  homeTerritoryFixedAmount?: number;
  fixedSalary?: number;
  fixedCarAmount?: number;
  engineerIsActive?: boolean;
}

export interface EngineerDto {
  id: number;
  userId: number;
  type: EngineerType;
  baseRate: number;
  overtimeRate?: number;
  planHoursMonth: number;
  homeTerritoryFixedAmount: number;
  fixedSalary: number;
  fixedCarAmount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDto extends Omit<User, 'password'> {
  engineer?: EngineerDto;
}

export interface AuthLoginDto extends LoginRequest {}

export interface AuthLoginResponse extends LoginResponse {}

export interface AuthUserDto extends AuthUser {}

export interface UsersQueryDto {
  page?: number;
  limit?: number;
  search?: string; // search by firstName, lastName, or email
  role?: UserRole;
  isActive?: boolean;
  engineerType?: EngineerType;
  engineerIsActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

