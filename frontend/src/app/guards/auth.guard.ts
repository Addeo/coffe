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
    const requiredRoles = route.data['roles'] as UserRole[];
    if (requiredRoles && !this.authService.hasAnyRole(requiredRoles)) {
      // Redirect to unauthorized page with role information
      this.router.navigate(['/unauthorized'], {
        queryParams: {
          requiredRoles: requiredRoles.join(','),
          attemptedUrl: state.url,
        },
      });
      return false;
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
