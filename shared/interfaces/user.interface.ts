export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

/**
 * Role hierarchy levels (higher number = higher privilege)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 3,
  [UserRole.MANAGER]: 2,
  [UserRole.USER]: 1,
};

/**
 * Get available roles for a user based on their primary role
 * Users can access their primary role and all roles below it in hierarchy
 */
export function getAvailableRoles(primaryRole: UserRole): UserRole[] {
  const primaryLevel = ROLE_HIERARCHY[primaryRole];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level <= primaryLevel)
    .map(([role]) => role as UserRole)
    .sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
}

/**
 * Check if a role has access to perform actions of another role
 */
export function hasRoleAccess(primaryRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[primaryRole] >= ROLE_HIERARCHY[requiredRole];
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole; // Legacy field - will be replaced by primaryRole
  primaryRole: UserRole; // Highest role assigned to user
  activeRole: UserRole; // Currently active role in session
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser extends Omit<User, 'password'> {
  // Additional auth-specific fields can be added here
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}
