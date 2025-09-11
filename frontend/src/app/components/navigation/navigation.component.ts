import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { NotificationsService, NotificationDto } from '../../services/notifications.service';
import { UserRole } from '@shared/interfaces/user.interface';

interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
  i18nKey: string;
}

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
    MatDividerModule,
    MatBadgeModule,
    MatListModule,
    MatCardModule,
    MatChipsModule,
  ],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss'],
})
export class NavigationComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationsService = inject(NotificationsService);
  private subscriptions: Subscription[] = [];

  // Reactive signals
  unreadCount = signal(0);
  recentNotifications = signal<NotificationDto[]>([]);
  isMobileMenuOpen = signal(false);

  // Reactive computed values
  currentUser = this.authService.currentUser;
  isAuthenticated = this.authService.isAuthenticated;
  userRole = computed(() => this.currentUser()?.role);
  userName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  // Computed navigation items based on user role
  navigationItems = computed<NavigationItem[]>(() => {
    const role = this.userRole();
    const items: NavigationItem[] = [
      { label: 'Dashboard', route: '/dashboard', icon: 'dashboard', i18nKey: '@@navigation.dashboard' },
    ];

    if (role === UserRole.ADMIN || role === UserRole.MANAGER) {
      items.push(
        { label: 'Users', route: '/users', icon: 'people', i18nKey: '@@navigation.users' },
        { label: 'Organizations', route: '/organizations', icon: 'business', i18nKey: '@@navigation.organizations' }
      );
    }

    items.push(
      { label: 'Orders', route: '/orders', icon: 'shopping_cart', i18nKey: '@@navigation.orders' },
      { label: 'Profile', route: '/profile', icon: 'person', i18nKey: '@@navigation.profile' },
      {
        label: 'Notifications',
        route: '/notifications',
        icon: 'notifications',
        badge: this.unreadCount(),
        i18nKey: '@@navigation.notifications',
      }
    );

    // Add Settings for admin only
    if (role === UserRole.ADMIN) {
      items.push(
        { label: 'Settings', route: '/settings', icon: 'settings', i18nKey: '@@navigation.settings' }
      );
    }

    return items;
  });

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.loadNotifications();
      this.loadUnreadCount();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadNotifications(): void {
    this.subscriptions.push(
      this.notificationsService.getNotifications(1, 5, 'unread').subscribe({
        next: response => {
          this.recentNotifications.set(response.notifications);
        },
        error: error => {
          console.error('Failed to load notifications:', error);
        },
      })
    );
  }

  private loadUnreadCount(): void {
    this.subscriptions.push(
      this.notificationsService.unreadCount$.subscribe(count => {
        this.unreadCount.set(count);
      })
    );

    // Initial load
    this.notificationsService.getUnreadCount().subscribe();
  }

  logout(): void {
    this.authService.logout();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  onNotificationClick(notification: NotificationDto): void {
    if (notification.status === 'unread') {
      this.notificationsService.markAsRead(notification.id).subscribe({
        next: () => {
          // Update local state
          const updatedNotifications = this.recentNotifications().map(n =>
            n.id === notification.id ? { ...n, status: 'read' as const } : n
          );
          this.recentNotifications.set(updatedNotifications);
        },
        error: error => {
          console.error('Failed to mark notification as read:', error);
        },
      });
    }

    // Navigate based on notification type
    if (notification.metadata?.orderId) {
      this.router.navigate(['/orders'], {
        queryParams: { orderId: notification.metadata.orderId },
      });
    }
  }

  onMarkAllAsRead(): void {
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        // Update local state
        const updatedNotifications = this.recentNotifications().map(n => ({
          ...n,
          status: 'read' as const,
        }));
        this.recentNotifications.set(updatedNotifications);
      },
      error: error => {
        console.error('Failed to mark all notifications as read:', error);
      },
    });
  }

  onViewAllNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'Администратор';
      case UserRole.MANAGER:
        return 'Менеджер';
      case UserRole.USER:
        return 'Пользователь';
      default:
        return 'Пользователь';
    }
  }

  getPriorityColor(priority: string): string {
    return this.notificationsService.getPriorityColor(priority);
  }

  getPriorityIcon(priority: string): string {
    return this.notificationsService.getPriorityIcon(priority);
  }
}
