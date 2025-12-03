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
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

import { MaterialModule } from '../../shared/material/material.module';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { NotificationsService, NotificationDto } from '../../services/notifications.service';
import { OrdersService } from '../../services/orders.service';
import { UserRole } from '../../../../shared/interfaces/user.interface';
import { OrderStatsDto } from '../../../../shared/dtos/order.dto';

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
  public router = inject(Router);
  private notificationsService = inject(NotificationsService);
  private ordersService = inject(OrdersService);
  private cdr = inject(ChangeDetectorRef);
  private snackBar = inject(MatSnackBar);
  private breakpointObserver = inject(BreakpointObserver);
  private subscriptions: Subscription[] = [];

  // ... (existing code)

  // Check if mobile view (using signal for template)
  isMobileView = signal(false);

  // Export UserRole for template use
  readonly UserRole = UserRole;

  // Reactive signals
  unreadCount = signal(0);
  recentNotifications = signal<NotificationDto[]>([]);
  orderStats = signal<OrderStatsDto | null>(null);

  // Check if current route is orders page
  isOrdersPage = computed(() => {
    return this.router.url.startsWith('/orders');
  });

  // Get home route based on user role
  homeRoute = computed(() => {
    const role = this.userRole();
    if (role === UserRole.ADMIN) {
      return '/statistics';
    }
    return '/orders';
  });

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

  // Role indicator visibility
  isRoleIndicatorHidden = signal(false);

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
    const items: NavigationItem[] = [];

    // Админские разделы
    if (role === UserRole.ADMIN) {
      items.push(
        { label: 'Пользователи', route: '/users', icon: 'people', i18nKey: '@@navigation.users' },
        {
          label: 'Организации',
          route: '/organizations',
          icon: 'business',
          i18nKey: '@@navigation.organizations',
        },
        {
          label: 'Настройки',
          route: '/settings',
          icon: 'settings',
          i18nKey: '@@navigation.settings',
        },
        {
          label: 'Статистика',
          route: '/statistics',
          icon: 'analytics',
          i18nKey: '@@navigation.statistics',
        }
      );
    }

    // Заявки для менеджеров и инженеров
    if (role === UserRole.MANAGER || role === UserRole.USER) {
      items.push({
        label: 'Заявки',
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

    return items;
  });

  ngOnInit(): void {
    // Проверяем состояние индикатора при инициализации
    if (this.isRoleIndicatorHidden()) {
      document.body.classList.add('role-indicator-hidden');
    } else {
      // Auto-hide role indicator after 10 seconds
      setTimeout(() => {
        this.hideRoleIndicator();
      }, 10000);
    }

    // Subscribe to breakpoint changes
    this.subscriptions.push(
      this.breakpointObserver
        .observe([Breakpoints.Handset, Breakpoints.Tablet])
        .subscribe(result => {
          this.isMobileView.set(result.matches);
        })
    );

    // Load notifications only once if authenticated
    if (this.isAuthenticated()) {
      this.loadNotifications();
      this.loadUnreadCount();
    }

    // Subscribe to router events to load order stats when on orders page
    this.subscriptions.push(
      this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
        if (this.isOrdersPage() && this.isAuthenticated()) {
          this.loadOrderStats();
        } else {
          this.orderStats.set(null);
        }
      })
    );

    // Load order stats if already on orders page
    if (this.isOrdersPage() && this.isAuthenticated()) {
      this.loadOrderStats();
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

  private loadOrderStats(): void {
    this.subscriptions.push(
      this.ordersService.getOrderStats().subscribe({
        next: stats => {
          this.orderStats.set(stats);
        },
        error: error => {
          console.error('Failed to load order stats:', error);
          this.orderStats.set(null);
        },
      })
    );
  }

  logout(): void {
    this.authService.logout();
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

  hideRoleIndicator(): void {
    this.isRoleIndicatorHidden.set(true);
    // Добавляем класс к body для изменения margin-top у main-content
    document.body.classList.add('role-indicator-hidden');
  }

  switchRole(newRole: UserRole): void {
    if (this.isLoadingRoleSwitch()) return;

    this.isLoadingRoleSwitch.set(true);

    this.authService.switchRole(newRole).subscribe({
      next: response => {
        console.log('✅ Role switched successfully in navigation');
        this.isLoadingRoleSwitch.set(false);
        this.isRoleIndicatorHidden.set(false);

        // Определяем доступную страницу для новой роли
        let redirectPath: string;

        switch (newRole) {
          case UserRole.ADMIN:
            redirectPath = '/statistics';
            break;
          case UserRole.MANAGER:
          case UserRole.USER:
            redirectPath = '/orders';
            break;
          default:
            redirectPath = '/orders';
            break;
        }

        // Проверяем текущий URL - если он недоступен для новой роли, перенаправляем
        const currentUrl = this.router.url;
        const currentPath = currentUrl.split('?')[0]; // Убираем query params

        // Список страниц, доступных только админу
        const adminOnlyRoutes = [
          '/users',
          '/organizations',
          '/statistics',
          '/reports',
          '/settings',
          '/dashboard',
        ];

        // Список страниц, доступных только менеджеру/админу (не инженеру)
        const managerOnlyRoutes = ['/engineer-rates'];

        // Для админа всегда перенаправляем на страницу статистики
        if (newRole === UserRole.ADMIN) {
          console.log(`🔄 Redirecting ${newRole} from ${currentPath} to ${redirectPath}`);
          this.router.navigate([redirectPath]);
        }
        // Если менеджер/инженер пытается попасть на админскую страницу или dashboard - перенаправляем
        else if (
          (newRole === UserRole.MANAGER || newRole === UserRole.USER) &&
          adminOnlyRoutes.includes(currentPath)
        ) {
          console.log(`🔄 Redirecting ${newRole} from ${currentPath} to ${redirectPath}`);
          this.router.navigate([redirectPath]);
        }
        // Если инженер пытается попасть на страницу менеджера - перенаправляем
        else if (newRole === UserRole.USER && managerOnlyRoutes.includes(currentPath)) {
          console.log(`🔄 Redirecting ${newRole} from ${currentPath} to ${redirectPath}`);
          this.router.navigate([redirectPath]);
        }
        // Если текущая страница доступна - остаемся на ней
        else {
          console.log(`✅ Current page ${currentPath} is accessible for ${newRole}, staying here`);
          // Просто обновляем сигналы, не перезагружаем страницу
          // Сигналы уже обновлены в authService.switchRole
        }
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
    this.router.navigate(['/profile']);
  }
}
