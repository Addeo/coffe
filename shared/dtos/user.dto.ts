import { User, UserRole, LoginRequest, LoginResponse, AuthUser } from '../interfaces/user.interface';

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserDto extends Omit<User, 'password'> {}

export interface AuthLoginDto extends LoginRequest {}

export interface AuthLoginResponse extends LoginResponse {}

export interface AuthUserDto extends AuthUser {}
