import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '../../shared/material/material.module';

import { AuthService } from '../../services/auth.service';
import { OrdersService } from '../../services/orders.service';
import { UsersService } from '../../services/users.service';
import {
  StatisticsService,
  EarningsComparison,
  AdminEngineerStatistics,
} from '../../services/statistics.service';
import { UserRole } from '@shared/interfaces/user.interface';
import { EngineerDetailedStatsDto } from '@shared/dtos/reports.dto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private ordersService = inject(OrdersService);
  private usersService = inject(UsersService);
  private statisticsService = inject(StatisticsService);
  private snackBar = inject(MatSnackBar);

  // Reactive signals
  isLoading = signal(false);
  currentUser = this.authService.currentUser;
  userRole = computed(() => this.currentUser()?.role);

  // Dashboard data signals
  orderStats = signal({
    total: 0,
    waiting: 0,
    assigned: 0,
    processing: 0,
    working: 0,
    review: 0,
    completed: 0,
    bySource: {
      manual: 0,
      automatic: 0,
      email: 0,
      api: 0,
    },
  });

  userStats = signal({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
  });

  earningsStats = signal<EarningsComparison>({
    currentMonth: null,
    previousMonth: null,
    growth: 0,
  });

  // Статистика инженера
  engineerStats = signal<EngineerDetailedStatsDto | null>(null);

  // Статистика для админа по всем инженерам
  adminEngineerStats = signal<AdminEngineerStatistics | null>(null);

  // Computed values for role-based content
  dashboardTitle = computed(() => {
    const role = this.userRole();
    switch (role) {
      case UserRole.ADMIN:
        return 'Панель руководителя';
      case UserRole.MANAGER:
        return 'Панель логиста';
      case UserRole.USER:
        return 'Моя панель';
      default:
        return 'Панель управления';
    }
  });

  showUserStats = computed(() => this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]));

  showEarningsStats = computed(() =>
    this.authService.hasAnyRole([UserRole.MANAGER, UserRole.USER])
  );

  // Показывать детальную статистику только для инженеров (роль USER)
  showEngineerStats = computed(() => this.userRole() === UserRole.USER);

  // Показывать статистику по всем инженерам только для админа
  showAdminEngineerStats = computed(() => this.userRole() === UserRole.ADMIN);

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData() {
    this.isLoading.set(true);

    // Load order statistics
    this.ordersService.getOrderStats().subscribe({
      next: stats => {
        this.orderStats.set(stats);
      },
      error: error => {
        console.error('Failed to load order stats:', error);
      },
    });

    // Load user statistics (only for admin/manager)
    if (this.showUserStats()) {
      this.loadUserStats();
    }

    // Load earnings statistics
    if (this.showEarningsStats()) {
      this.loadEarningsStats();
    }

    // Загрузка детальной статистики для инженера
    if (this.showEngineerStats()) {
      this.loadEngineerStats();
    }

    // Загрузка статистики по всем инженерам для админа
    if (this.showAdminEngineerStats()) {
      this.loadAdminEngineerStats();
    }

    this.isLoading.set(false);
  }

  private loadUserStats() {
    this.usersService.getUsers().subscribe({
      next: response => {
        const users = response.data;
        this.userStats.set({
          totalUsers: users.length,
          activeUsers: users.filter(u => u.isActive).length,
          newUsersThisMonth: users.filter(u => {
            const userDate = new Date(u.createdAt);
            const now = new Date();
            return (
              userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear()
            );
          }).length,
        });
      },
      error: error => {
        console.error('Failed to load user stats:', error);
      },
    });
  }

  private loadEarningsStats() {
    this.statisticsService.getEarningsComparison().subscribe({
      next: (comparison: EarningsComparison) => {
        this.earningsStats.set(comparison);
      },
      error: (error: any) => {
        console.error('Failed to load earnings stats:', error);
      },
    });
  }

  getStatusDisplay(status: string): string {
    switch (status) {
      case 'waiting':
        return 'В ожидании';
      case 'assigned':
        return 'Назначен';
      case 'processing':
        return 'В обработке';
      case 'working':
        return 'В работе';
      case 'review':
        return 'На проверке';
      case 'completed':
        return 'Законченный';
      default:
        return status;
    }
  }

  getSourceDisplay(source: string): string {
    switch (source) {
      case 'manual':
        return 'Вручную';
      case 'automatic':
        return 'Автоматически';
      case 'email':
        return 'Из Email';
      case 'api':
        return 'Через API';
      default:
        return source;
    }
  }

  getGrowthColor(growth: number): string {
    if (growth > 0) return 'primary';
    if (growth < 0) return 'warn';
    return 'accent';
  }

  getGrowthIcon(growth: number): string {
    if (growth > 0) return 'trending_up';
    if (growth < 0) return 'trending_down';
    return 'trending_flat';
  }

  /**
   * Загружает детальную статистику для инженера
   */
  private loadEngineerStats(): void {
    // Получаем текущий месяц и год
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // getMonth() возвращает месяц от 0 до 11
    const currentYear = now.getFullYear();

    this.statisticsService.getEngineerDetailedStats(currentYear, currentMonth).subscribe({
      next: (stats: EngineerDetailedStatsDto) => {
        this.engineerStats.set(stats);
      },
      error: (error: any) => {
        console.error('Failed to load engineer statistics:', error);
      },
    });
  }

  /**
   * Загружает статистику по всем инженерам для админа
   */
  private loadAdminEngineerStats(): void {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    this.statisticsService.getAdminEngineerStatistics(currentYear, currentMonth).subscribe({
      next: (stats: AdminEngineerStatistics) => {
        this.adminEngineerStats.set(stats);
      },
      error: (error: any) => {
        console.error('Failed to load admin engineer statistics:', error);
      },
    });
  }

  /**
   * Форматирует число часов в удобочитаемый формат
   * @param hours Количество часов
   */
  formatHours(hours: number): string {
    if (hours == null || isNaN(hours)) return '0 ч';
    return hours.toFixed(1) + ' ч';
  }

  /**
   * Форматирует сумму в рублях
   * @param amount Сумма в рублях
   */
  formatAmount(amount: number): string {
    if (amount == null) return '0 ₽';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '0 ₽';
    return `${numAmount.toFixed(2)} ₽`;
  }

  // Новые методы для улучшенного Dashboard
  showDetailedStats = signal(false);

  /**
   * Переключает отображение детальной статистики
   */
  toggleStatsView(): void {
    this.showDetailedStats.set(!this.showDetailedStats());
  }

  /**
   * Обновляет данные панели управления
   */
  refreshData(): void {
    this.loadDashboardData();
    this.snackBar.open('Данные обновлены', 'Закрыть', { duration: 2000 });
  }

  /**
   * Экспортирует данные панели управления
   */
  exportDashboard(): void {
    // TODO: Реализовать экспорт данных
    this.snackBar.open('Функция экспорта в разработке', 'Закрыть', { duration: 2000 });
  }
}
