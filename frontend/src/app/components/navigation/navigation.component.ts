import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../services/auth.service';
import { UserRole } from '@shared/interfaces/user.interface';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Reactive computed values
  currentUser = this.authService.currentUser;
  isAuthenticated = this.authService.isAuthenticated;
  userRole = computed(() => this.currentUser()?.role);
  userName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  // Computed navigation items based on user role
  navigationItems = computed(() => {
    const role = this.userRole();
    const items = [
      { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' }
    ];

    if (role === UserRole.ADMIN || role === UserRole.MANAGER) {
      items.push(
        { label: 'Users', route: '/users', icon: 'people' }
      );
    }

    items.push(
      { label: 'Products', route: '/products', icon: 'inventory' },
      { label: 'Orders', route: '/orders', icon: 'shopping_cart' }
    );

    return items;
  });

  logout(): void {
    this.authService.logout();
  }

  getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrator';
      case UserRole.MANAGER:
        return 'Manager';
      case UserRole.USER:
        return 'User';
      default:
        return 'User';
    }
  }
}
