import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { Engineer } from '../../entities/engineer.entity';
import { EngineerType } from '../../shared/interfaces/order.interface';

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
    .filter(([, level]) => level <= primaryLevel)
    .map(([role]) => role as UserRole)
    .sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Engineer)
    private engineerRepository: Repository<Engineer>,
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
    });

    // Use user.role directly
    const effectiveRole = user.role;

    console.log('🔐 AuthService.login - Role:', effectiveRole);

    const payload = {
      email: user.email,
      sub: user.id,
      role: effectiveRole,
    };

    // Include role info in response
    const userResponse = {
      ...user,
      role: effectiveRole,
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
    const results = {
      admin: null as any,
      manager: null as any,
      engineer: null as any,
    };

    // Create admin user (password: admin123)
    const existingAdmin = await this.userRepository.findOne({
      where: { email: 'admin@coffee.com' },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = this.userRepository.create({
        email: 'admin@coffee.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        primaryRole: UserRole.ADMIN,
        activeRole: null,
        isActive: true,
      });
      const savedAdmin = await this.userRepository.save(admin);
      results.admin = {
        id: savedAdmin.id,
        email: savedAdmin.email,
        firstName: savedAdmin.firstName,
        lastName: savedAdmin.lastName,
        role: savedAdmin.role,
      };
    } else {
      results.admin = {
        id: existingAdmin.id,
        email: existingAdmin.email,
        firstName: existingAdmin.firstName,
        lastName: existingAdmin.lastName,
        role: existingAdmin.role,
      };
    }

    // Create manager user (password: manager123)
    const existingManager = await this.userRepository.findOne({
      where: { email: 'manager@coffee.com' },
    });

    if (!existingManager) {
      const hashedPassword = await bcrypt.hash('manager123', 10);
      const manager = this.userRepository.create({
        email: 'manager@coffee.com',
        password: hashedPassword,
        firstName: 'Manager',
        lastName: 'User',
        role: UserRole.MANAGER,
        primaryRole: UserRole.MANAGER,
        activeRole: null,
        isActive: true,
      });
      const savedManager = await this.userRepository.save(manager);
      results.manager = {
        id: savedManager.id,
        email: savedManager.email,
        firstName: savedManager.firstName,
        lastName: savedManager.lastName,
        role: savedManager.role,
      };
    } else {
      results.manager = {
        id: existingManager.id,
        email: existingManager.email,
        firstName: existingManager.firstName,
        lastName: existingManager.lastName,
        role: existingManager.role,
      };
    }

    // Create engineer user (password: engineer123)
    const existingEngineer = await this.userRepository.findOne({
      where: { email: 'engineer@coffee.com' },
    });

    if (!existingEngineer) {
      const hashedPassword = await bcrypt.hash('engineer123', 10);
      const engineerUser = this.userRepository.create({
        email: 'engineer@coffee.com',
        password: hashedPassword,
        firstName: 'Engineer',
        lastName: 'User',
        role: UserRole.USER,
        primaryRole: UserRole.USER,
        activeRole: null,
        isActive: true,
      });
      const savedEngineerUser = await this.userRepository.save(engineerUser);

      // Create engineer record
      const engineer = this.engineerRepository.create({
        userId: savedEngineerUser.id,
        type: EngineerType.STAFF,
        baseRate: 700,
        overtimeRate: 700,
        planHoursMonth: 160,
        homeTerritoryFixedAmount: 0,
        fixedSalary: 0,
        fixedCarAmount: 0,
        isActive: true,
      });
      await this.engineerRepository.save(engineer);

      results.engineer = {
        id: savedEngineerUser.id,
        email: savedEngineerUser.email,
        firstName: savedEngineerUser.firstName,
        lastName: savedEngineerUser.lastName,
        role: savedEngineerUser.role,
      };
    } else {
      results.engineer = {
        id: existingEngineer.id,
        email: existingEngineer.email,
        firstName: existingEngineer.firstName,
        lastName: existingEngineer.lastName,
        role: existingEngineer.role,
      };
    }

    return {
      success: true,
      message: 'Users initialized successfully',
      users: results,
    };
  }
}
