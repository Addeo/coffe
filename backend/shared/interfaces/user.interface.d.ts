export declare enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface AuthUser extends Omit<User, 'password'> {}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}
