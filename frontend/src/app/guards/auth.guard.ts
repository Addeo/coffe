import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '@shared/interfaces/user.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }

    // Check for required roles
    const requiredRoles = route.data['roles'] as string[];
    if (requiredRoles && requiredRoles.length > 0) {
      console.log('🔐 AuthGuard: Checking roles:', {
        requiredRoles,
        currentUser: this.authService.currentUser(),
        activeRole: this.authService.activeRole(),
      });

      // Convert string roles to UserRole enum
      const userRoles = requiredRoles.map(role => {
        switch (role.toLowerCase()) {
          case 'admin':
            return UserRole.ADMIN;
          case 'manager':
            return UserRole.MANAGER;
          case 'user':
            return UserRole.USER;
          default:
            console.warn('🔐 Unknown role:', role);
            return role as UserRole;
        }
      });

      console.log('🔐 AuthGuard: Converted roles:', userRoles);
      console.log('🔐 AuthGuard: hasAnyRole result:', this.authService.hasAnyRole(userRoles));

      if (!this.authService.hasAnyRole(userRoles)) {
        console.log('🔐 AuthGuard: Access denied, redirecting to unauthorized');
        // Redirect to unauthorized page with role information
        this.router.navigate(['/unauthorized'], {
          queryParams: {
            requiredRoles: requiredRoles.join(','),
            attemptedUrl: state.url,
          },
        });
        return false;
      }
    }

    return true;
  }
}

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }
}

@Injectable({
  providedIn: 'root',
})
export class ManagerGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    if (!this.authService.isManager()) {
      this.router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }
}
