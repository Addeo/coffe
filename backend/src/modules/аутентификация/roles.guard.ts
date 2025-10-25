import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../entities/user.entity';

// Role hierarchy levels (higher number = higher privilege)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 3,
  [UserRole.MANAGER]: 2,
  [UserRole.USER]: 1,
};

/**
 * Check if user's active role has sufficient privileges
 */
function hasRoleAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Determine effective role (activeRole takes precedence, fallback to primaryRole or role)
    const effectiveRole = user?.activeRole || user?.primaryRole || user?.role;
    const primaryRole = user?.primaryRole || user?.role;

    console.log('🔐 RolesGuard check:', {
      effectiveRole,
      primaryRole,
      requiredRoles,
    });

    // Check if user's active role can access any of the required roles
    const hasAccess = requiredRoles.some(requiredRole => {
      // First check: Does active role match required role exactly?
      if (effectiveRole === requiredRole) {
        return true;
      }

      // Second check: Does active role have hierarchical access to required role?
      // User can only access roles at or below their primary role level
      const canAccessRequired = hasRoleAccess(primaryRole, requiredRole);
      const isActiveRoleValid = hasRoleAccess(effectiveRole, requiredRole);

      return canAccessRequired && isActiveRoleValid;
    });

    console.log('🔐 RolesGuard result:', hasAccess);

    return hasAccess;
  }
}
