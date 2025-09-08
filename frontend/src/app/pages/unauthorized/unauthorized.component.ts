import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '@shared/interfaces/user.interface';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss']
})
export class UnauthorizedComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  requiredRoles: UserRole[] = [];
  attemptedUrl = '';
  currentUserRole: UserRole | null = null;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.requiredRoles = params['requiredRoles']?.split(',') || [];
      this.attemptedUrl = params['attemptedUrl'] || '';
    });

    this.currentUserRole = this.authService.currentUser()?.role || null;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  goToLogin() {
    this.authService.logout();
  }

  getRoleDisplay(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrator';
      case UserRole.MANAGER:
        return 'Manager';
      case UserRole.USER:
        return 'User';
      default:
        return role;
    }
  }

  getCurrentRoleDisplay(): string {
    return this.currentUserRole ? this.getRoleDisplay(this.currentUserRole) : 'None';
  }

  canRequestAccess(): boolean {
    // Logic to determine if user can request access elevation
    return this.currentUserRole === UserRole.USER;
  }

  requestAccess() {
    // TODO: Implement access request functionality
    console.log('Requesting access elevation');
  }
}
