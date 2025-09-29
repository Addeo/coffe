import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from '../../shared/material/material.module';

import { AuthService } from '../../services/auth.service';
import { OrdersService } from '../../services/orders.service';
import { UsersService } from '../../services/users.service';
import { StatisticsService, EarningsComparison } from '../../services/statistics.service';
import { UserRole } from '@shared/interfaces/user.interface';

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

  // Reactive signals
  isLoading = signal(false);
  currentUser = this.authService.currentUser;
  userRole = computed(() => this.currentUser()?.role);

  // Dashboard data signals
  orderStats = signal({
    total: 0,
    waiting: 0,
    processing: 0,
    working: 0,
    review: 0,
    completed: 0,
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

  // Computed values for role-based content
  dashboardTitle = computed(() => {
    const role = this.userRole();
    switch (role) {
      case UserRole.ADMIN:
        return 'Панель администратора';
      case UserRole.MANAGER:
        return 'Панель менеджера';
      case UserRole.USER:
        return 'Моя панель';
      default:
        return 'Панель управления';
    }
  });

  showUserStats = computed(() => this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]));

  showEarningsStats = computed(() =>
    this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.USER])
  );

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
}
