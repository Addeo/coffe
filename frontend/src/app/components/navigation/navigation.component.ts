import {
  Component,
  inject,
  computed,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';

import { MaterialModule } from '../../shared/material/material.module';

import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { NotificationsService, NotificationDto } from '../../services/notifications.service';
import { UserRole } from '../../../../shared/interfaces/user.interface';

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
  imports: [CommonModule, RouterLink, RouterLinkActive, MaterialModule],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss'],
})
export class NavigationComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private notificationsService = inject(NotificationsService);
  private cdr = inject(ChangeDetectorRef);
  private subscriptions: Subscription[] = [];

  // Reactive signals
  unreadCount = signal(0);
  recentNotifications = signal<NotificationDto[]>([]);
  isMobileMenuOpen = signal(false);

  // Theme signals
  currentTheme = this.themeService.currentTheme;
  effectiveTheme = this.themeService.effectiveTheme;

  // Reactive computed values
  currentUser = this.authService.currentUser;
  isAuthenticated = this.authService.isAuthenticated;
  userRole = computed(() => this.authService.activeRole()); // ✅ Используем activeRole вместо currentUser()?.role
  userName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  // Role management
  primaryRole = this.authService.primaryRole;
  activeRole = this.authService.activeRole;
  availableRoles = this.authService.availableRoles;
  canSwitchRoles = this.authService.canSwitchRoles;
  isLoadingRoleSwitch = signal(false);

  // Theme icon based on current theme
  themeIcon = computed(() => {
    const theme = this.currentTheme();
    if (theme === 'auto') {
      return 'brightness_auto';
    }
    return theme === 'dark' ? 'dark_mode' : 'light_mode';
  });

  // Computed navigation items based on user role
  navigationItems = computed<NavigationItem[]>(() => {
    const role = this.userRole();
    console.log('🧭 Navigation - Current role:', role);
    console.log('🧭 Navigation - UserRole.MANAGER:', UserRole.MANAGER);
    console.log('🧭 Navigation - Role comparison:', role === UserRole.MANAGER);

    const items: NavigationItem[] = [];

    // Админские разделы (только для админа)
    if (role === UserRole.ADMIN) {
      items.push(
        { label: 'Пользователи', route: '/users', icon: 'people', i18nKey: '@@navigation.users' },
        {
          label: 'Организации',
          route: '/organizations',
          icon: 'business',
          i18nKey: '@@navigation.organizations',
        },
        // {
        //   label: 'Отчеты',
        //   route: '/reports',
        //   icon: 'assessment',
        //   i18nKey: '@@navigation.reports',
        // },
        {
          label: 'Настройки',
          route: '/settings',
          icon: 'settings',
          i18nKey: '@@navigation.settings',
        }
        // {
        //   label: 'Резервные копии',
        //   route: '/backups',
        //   icon: 'backup',
        //   i18nKey: '@@navigation.backups',
        // },
        // {
        //   label: 'Логи',
        //   route: '/logs',
        //   icon: 'description',
        //   i18nKey: '@@navigation.logs',
        // }
      );
    }

    // Статистика только для админа
    if (role === UserRole.ADMIN) {
      items.push({
        label: 'Статистика',
        route: '/statistics',
        icon: 'analytics',
        i18nKey: '@@navigation.statistics',
      });
    }

    // Заказы только для менеджеров и инженеров (НЕ для админа)
    if (role === UserRole.MANAGER || role === UserRole.USER) {
      items.push({
        label: 'Заказы',
        route: '/orders',
        icon: 'shopping_cart',
        i18nKey: '@@navigation.orders',
      });
    }

    // Базовые разделы для всех ролей
    items.push(
      { label: 'Профиль', route: '/profile', icon: 'person', i18nKey: '@@navigation.profile' },
      {
        label: 'Уведомления',
        route: '/notifications',
        icon: 'notifications',
        badge: this.unreadCount(),
        i18nKey: '@@navigation.notifications',
      }
    );

    // Добавляем кнопки переключения ролей для пользователей с несколькими ролями
    if (this.canSwitchRoles()) {
      this.availableRoles().forEach(role => {
        if (!this.isRoleActive(role)) {
          items.push({
            label: this.getRoleDisplayName(role),
            route: '#',
            icon: this.getRoleIcon(role),
            i18nKey: `@@navigation.switchTo${role}`,
          });
        }
      });
    }

    console.log(
      '🧭 Navigation - Final items:',
      items.map(item => item.label)
    );
    return items;
  });

  ngOnInit(): void {
    console.log('🧭 NavigationComponent initialized');
    console.log('🧭 Initial auth state:', this.isAuthenticated());
    console.log('🧭 Current user:', this.currentUser());

    // Load notifications only once if authenticated
    // Signals will handle reactive updates automatically
    if (this.isAuthenticated()) {
      this.loadNotifications();
      this.loadUnreadCount();
    }

    // Force change detection once to ensure initial UI updates
    this.cdr.detectChanges();
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
    // Subscribe to unread count observable (will be updated when count changes)
    this.subscriptions.push(
      this.notificationsService.unreadCount$.subscribe(count => {
        this.unreadCount.set(count);
      })
    );

    // Initial load once - subsequent updates will come through the observable
    this.subscriptions.push(
      this.notificationsService.getUnreadCount().subscribe({
        error: error => {
          console.error('Failed to load unread count:', error);
        },
      })
    );
  }

  logout(): void {
    console.log('🚪 Logout button clicked');
    // alert('Logout clicked!'); // Temporary alert for testing
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
    return this.authService.getRoleDisplayName(role);
  }

  getRoleIcon(role: UserRole): string {
    return this.authService.getRoleIcon(role);
  }

  switchRole(newRole: UserRole): void {
    if (this.isLoadingRoleSwitch()) return;

    this.isLoadingRoleSwitch.set(true);

    this.authService.switchRole(newRole).subscribe({
      next: response => {
        console.log('✅ Role switched successfully in navigation');
        this.isLoadingRoleSwitch.set(false);

        // Reload the page to reflect new role permissions
        window.location.reload();
      },
      error: error => {
        console.error('❌ Failed to switch role:', error);
        this.isLoadingRoleSwitch.set(false);
        alert('Не удалось переключить роль. Попробуйте снова.');
      },
    });
  }

  isRoleActive(role: UserRole): boolean {
    return this.activeRole() === role;
  }

  getPriorityColor(priority: string): string {
    return this.notificationsService.getPriorityColor(priority);
  }

  getPriorityIcon(priority: string): string {
    return this.notificationsService.getPriorityIcon(priority);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  getThemeTooltip(): string {
    const theme = this.currentTheme();
    const themeLabels: Record<string, string> = {
      light: 'Переключить на темную тему',
      dark: 'Переключить на светлую тему',
      auto: 'Текущая тема: автоматическая',
    };
    return themeLabels[theme] || 'Переключить тему';
  }

  navigateToProfile(): void {
    console.log('👤 Profile button clicked');
    // alert('Profile clicked!'); // Temporary alert for testing
    this.router.navigate(['/profile']);
  }

  onRoleSwitchClick(item: NavigationItem): void {
    // Находим роль по label (теперь label = название роли)
    const role = this.availableRoles().find(r => this.getRoleDisplayName(r) === item.label);

    if (role) {
      this.switchRole(role);
    }
  }
}
