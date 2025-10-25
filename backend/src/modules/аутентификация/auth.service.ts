import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';

// Role hierarchy levels (higher number = higher privilege)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 3,
  [UserRole.MANAGER]: 2,
  [UserRole.USER]: 1,
};

/**
 * Get available roles for a user based on their primary role
 */
function getAvailableRoles(primaryRole: UserRole): UserRole[] {
  const primaryLevel = ROLE_HIERARCHY[primaryRole];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level <= primaryLevel)
    .map(([role]) => role as UserRole)
    .sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Remove password from result for security
      const result = { ...user };
      delete result.password;

      console.log('🔐 AuthService.validateUser - User from DB:', {
        id: result.id,
        email: result.email,
        role: result.role,
        primaryRole: result.primaryRole,
        activeRole: result.activeRole,
      });

      return result;
    }

    return null;
  }

  async login(user: any) {
    // Debug logging
    console.log('🔐 AuthService.login - User data:', {
      id: user.id,
      email: user.email,
      role: user.role,
      primaryRole: user.primaryRole,
      activeRole: user.activeRole,
    });

    // Use user.role directly as the primary role
    const primaryRole = user.role;
    const effectiveRole = user.activeRole || user.role;

    console.log('🔐 AuthService.login - Primary role:', primaryRole);
    console.log('🔐 AuthService.login - Effective role:', effectiveRole);

    const payload = {
      email: user.email,
      sub: user.id,
      role: effectiveRole,
      primaryRole: primaryRole,
      activeRole: user.activeRole,
    };

    // Include role hierarchy info in response
    const userResponse = {
      ...user,
      primaryRole: user.primaryRole || user.role,
      activeRole: effectiveRole,
    };

    delete userResponse.password;

    return {
      access_token: this.jwtService.sign(payload),
      user: userResponse,
    };
  }

  /**
   * Switch user's active role to a different role within their hierarchy
   */
  async switchRole(userId: number, newRole: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Ensure primaryRole is set
    const primaryRole = user.primaryRole || user.role;
    const availableRoles = getAvailableRoles(primaryRole);

    // Validate that the new role is available to this user
    if (!availableRoles.includes(newRole as UserRole)) {
      throw new BadRequestException(
        `Role ${newRole} is not available. Available roles: ${availableRoles.join(', ')}`
      );
    }

    // Update active role
    user.activeRole = newRole as UserRole;
    await this.userRepository.save(user);

    // Generate new token with updated role
    const payload = {
      email: user.email,
      sub: user.id,
      role: newRole,
      primaryRole: primaryRole,
      activeRole: newRole,
    };

    const userResponse = {
      ...user,
      primaryRole,
      activeRole: newRole as UserRole,
    };

    delete userResponse.password;

    return {
      success: true,
      message: `Role switched to ${newRole}`,
      activeRole: newRole,
      availableRoles,
      access_token: this.jwtService.sign(payload),
      user: userResponse,
    };
  }

  /**
   * Reset user's active role to their primary role
   */
  async resetRole(userId: number): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const primaryRole = user.primaryRole || user.role;

    // Reset active role to null (will use primaryRole)
    user.activeRole = null;
    await this.userRepository.save(user);

    // Generate new token with primary role
    const payload = {
      email: user.email,
      sub: user.id,
      role: primaryRole,
      primaryRole: primaryRole,
      activeRole: null,
    };

    const userResponse = {
      ...user,
      primaryRole,
      activeRole: primaryRole,
    };

    delete userResponse.password;

    return {
      success: true,
      message: `Role reset to primary role: ${primaryRole}`,
      activeRole: primaryRole,
      availableRoles: getAvailableRoles(primaryRole),
      access_token: this.jwtService.sign(payload),
      user: userResponse,
    };
  }

  async initializeAdmin() {
    const existingAdmin = await this.userRepository.findOne({ 
      where: { email: 'admin@coffee.com' } 
    });
    
    if (existingAdmin) {
      return {
        success: true,
        message: 'Admin user already exists',
        user: {
          id: existingAdmin.id,
          email: existingAdmin.email,
          firstName: existingAdmin.firstName,
          lastName: existingAdmin.lastName,
          role: existingAdmin.role,
        }
      };
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = this.userRepository.create({
      email: 'admin@coffee.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      primaryRole: UserRole.ADMIN,
      isActive: true,
    });

    const savedAdmin = await this.userRepository.save(admin);
    
    return {
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: savedAdmin.id,
        email: savedAdmin.email,
        firstName: savedAdmin.firstName,
        lastName: savedAdmin.lastName,
        role: savedAdmin.role,
      }
    };
  }
}
