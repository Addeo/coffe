import { Component, inject, signal, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as XLSX from 'xlsx';

import { StatisticsService, AdminEngineerStatistics } from '../../services/statistics.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { OrdersService } from '../../services/orders.service';
import { UserRole } from '../../../../shared/interfaces/user.interface';
import { OrderDto } from '../../../../shared/dtos/order.dto';
import { OrderStatus } from '../../../../shared/interfaces/order.interface';

interface EarningsSummary {
  workEarnings: number;
  carEarnings: number;
  totalEarnings: number;
  completedOrders: number;
  totalHours: number;
}

@Component({
  selector: 'app-earnings-summary',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './earnings-summary.component.html',
  styleUrls: ['./earnings-summary.component.scss'],
})
export class EarningsSummaryComponent implements OnInit {
  private statisticsService = inject(StatisticsService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private ordersService = inject(OrdersService);

  @Input() collapsible = true;
  @Output() monthChanged = new EventEmitter<{ month: number; year: number }>();
  @Output() viewUnacceptedOrders = new EventEmitter<void>();

  isLoading = signal(false);
  isCollapsed = signal(false);
  unacceptedOrders = signal<OrderDto[]>([]);
  summary = signal<EarningsSummary>({
    workEarnings: 0,
    carEarnings: 0,
    totalEarnings: 0,
    completedOrders: 0,
    totalHours: 0,
  });

  // Current month and year
  currentYear = signal(new Date().getFullYear());
  currentMonth = signal(new Date().getMonth() + 1);

  // User role check
  readonly isAdmin = this.authService.hasRole(UserRole.ADMIN);
  readonly isManager = this.authService.hasRole(UserRole.MANAGER);
  readonly isEngineer = this.authService.hasRole(UserRole.USER);
  readonly canViewAllOrders = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly currentUser = this.authService.currentUser;

  // Touch event variables for swipe
  private touchStartX = 0;
  private touchEndX = 0;

  ngOnInit() {
    this.loadEarningsData();
    this.loadUnacceptedOrders();
  }

  loadEarningsData() {
    this.isLoading.set(true);
    const year = this.currentYear();
    const month = this.currentMonth();

    if (this.isEngineer && this.currentUser()) {
      // For engineers, use the engineer-specific endpoint
      this.statisticsService.getEngineerDetailedStats(year, month).subscribe({
        next: (data: any) => {
          this.summary.set({
            workEarnings: data.totalEarnings || 0,
            carEarnings: 0, // This would need to come from the engineer endpoint if available
            totalEarnings: data.totalEarnings || 0,
            completedOrders: data.totalOrders || 0,
            totalHours: data.totalHours || 0,
          });
          this.isLoading.set(false);
        },
        error: error => {
          console.error('Error loading engineer earnings data:', error);
          this.summary.set({
            workEarnings: 0,
            carEarnings: 0,
            totalEarnings: 0,
            completedOrders: 0,
            totalHours: 0,
          });
          this.isLoading.set(false);
        },
      });
    } else if (this.isAdmin) {
      // For admin only, use the admin endpoint
      this.statisticsService.getAdminEngineerStatistics(year, month).subscribe({
        next: (data: AdminEngineerStatistics) => {
          this.summary.set({
            workEarnings: data.totals.engineerEarnings,
            carEarnings: data.totals.carUsageAmount,
            totalEarnings: data.totals.totalEarnings,
            completedOrders: data.totals.completedOrders,
            totalHours: data.totals.totalHours,
          });
          this.isLoading.set(false);
        },
        error: error => {
          console.error('Error loading earnings data:', error);
          this.toastService.error('Ошибка загрузки статистики по заработку');
          this.isLoading.set(false);
        },
      });
    } else if (this.isManager) {
      // For managers, use the monthly statistics endpoint (has admin+manager access)
      this.statisticsService.getMonthlyStatistics(year, month).subscribe({
        next: (data: any) => {
          const totals = data.agentEarnings?.reduce(
            (acc: any, agent: any) => ({
              engineerEarnings: (acc.engineerEarnings || 0) + (agent.totalEarnings || 0),
              completedOrders: (acc.completedOrders || 0) + (agent.completedOrders || 0),
              totalHours: (acc.totalHours || 0) + (agent.totalHours || 0),
            }),
            { engineerEarnings: 0, completedOrders: 0, totalHours: 0 }
          ) || { engineerEarnings: 0, completedOrders: 0, totalHours: 0 };

          this.summary.set({
            workEarnings: totals.engineerEarnings || 0,
            carEarnings: 0, // Managers don't see car earnings in this endpoint
            totalEarnings: totals.engineerEarnings || 0,
            completedOrders: totals.completedOrders || 0,
            totalHours: totals.totalHours || 0,
          });
          this.isLoading.set(false);
        },
        error: error => {
          console.error('Error loading manager earnings data:', error);
          this.toastService.error('Ошибка загрузки статистики по заработку');
          this.isLoading.set(false);
        },
      });
    } else {
      // Unknown role - set empty data
      this.summary.set({
        workEarnings: 0,
        carEarnings: 0,
        totalEarnings: 0,
        completedOrders: 0,
        totalHours: 0,
      });
      this.isLoading.set(false);
    }
  }

  toggleCollapse() {
    this.isCollapsed.set(!this.isCollapsed());
  }

  previousMonth() {
    let month = this.currentMonth();
    let year = this.currentYear();

    if (month === 1) {
      month = 12;
      year--;
    } else {
      month--;
    }

    this.currentMonth.set(month);
    this.currentYear.set(year);
    this.loadEarningsData();
    this.monthChanged.emit({ month, year });
  }

  nextMonth() {
    let month = this.currentMonth();
    let year = this.currentYear();

    if (month === 12) {
      month = 1;
      year++;
    } else {
      month++;
    }

    this.currentMonth.set(month);
    this.currentYear.set(year);
    this.loadEarningsData();
    this.monthChanged.emit({ month, year });
  }

  getCurrentMonthName(): string {
    const months = [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ];
    return months[this.currentMonth() - 1];
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Swipe handlers for mobile
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleSwipe();
  }

  private handleSwipe() {
    const swipeThreshold = 50;
    const diff = this.touchStartX - this.touchEndX;

    if (Math.abs(diff) < swipeThreshold) {
      return;
    }

    if (diff > 0) {
      // Swipe left - next month
      this.nextMonth();
    } else {
      // Swipe right - previous month
      this.previousMonth();
    }
  }

  isMobileView(): boolean {
    return window.innerWidth <= 768;
  }

  // Unaccepted orders methods
  loadUnacceptedOrders() {
    this.ordersService.getOrders({ status: OrderStatus.ASSIGNED }).subscribe({
      next: response => {
        const currentUser = this.currentUser();
        if (!currentUser) return;

        let filteredOrders = response.data || [];

        if (!this.canViewAllOrders) {
          // For engineers, show only their own unaccepted orders
          filteredOrders = filteredOrders.filter(
            order => order.assignedEngineerId === currentUser.id
          );
        }

        this.unacceptedOrders.set(filteredOrders);
      },
      error: error => {
        console.error('Error loading unaccepted orders:', error);
      },
    });
  }

  getUnacceptedOrdersCount(): number {
    return this.unacceptedOrders().length;
  }

  hasUnacceptedOrders(): boolean {
    return this.getUnacceptedOrdersCount() > 0;
  }

  onViewUnacceptedOrders() {
    this.viewUnacceptedOrders.emit();
  }

  exportStatisticsToExcel() {
    const stats = this.summary();

    // Prepare statistics data for export
    const statsData = [
      {
        Категория: 'Заработок за работу',
        Сумма: stats.workEarnings,
        Описание: 'Заработок за выполненную работу',
      },
      {
        Категория: 'Заработок за авто',
        Сумма: stats.carEarnings,
        Описание: 'Заработок за использование автомобиля',
      },
      {
        Категория: 'Общий заработок',
        Сумма: stats.totalEarnings,
        Описание: 'Общая сумма заработка',
      },
      {
        Категория: 'Завершенные заказы',
        Количество: stats.completedOrders,
        Описание: 'Количество завершенных заказов',
      },
      {
        Категория: 'Общее количество часов',
        Количество: stats.totalHours,
        Описание: 'Общее количество отработанных часов',
      },
    ];

    // Create worksheet for statistics
    const statsWorksheet = XLSX.utils.json_to_sheet(statsData);

    // Set column widths
    statsWorksheet['!cols'] = [
      { wch: 25 }, // Категория
      { wch: 15 }, // Сумма/Количество
      { wch: 40 }, // Описание
    ];

    // Create workbook with statistics
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Статистика заработка');

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `earnings_statistics_${currentDate}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);

    this.toastService.success('Статистика заработка успешно экспортирована в Excel');
  }
}
