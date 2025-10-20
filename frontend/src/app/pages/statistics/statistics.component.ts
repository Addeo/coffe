import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { StatisticsService } from '../../services/statistics.service';
import { UsersService } from '../../services/users.service';
import {
  MonthlyStatisticsDto,
  AgentEarningsData,
  OrganizationEarningsData,
  OvertimeStatisticsData,
} from '@shared/dtos/reports.dto';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTabsModule,
    MatButtonToggleModule,
    BaseChartDirective,
  ],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
})
export class StatisticsComponent implements OnInit {
  private statisticsService = inject(StatisticsService);
  private usersService = inject(UsersService);
  private snackBar = inject(MatSnackBar);

  // Плагины для диаграмм
  chartPlugins = [];

  isLoading = signal(false);
  statistics = signal<MonthlyStatisticsDto | null>(null);
  
  // User statistics
  userStats = signal({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    usersByRole: {
      admin: 0,
      manager: 0,
      user: 0,
    }
  });

  // Month and year selection
  selectedYear = signal(new Date().getFullYear());
  selectedMonth = signal(new Date().getMonth() + 1);

  // Available years and months
  availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  availableMonths = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  // View mode toggle
  viewMode: 'charts' | 'tables' = 'charts';

  // Mobile view detection
  isMobileView(): boolean {
    return window.innerWidth <= 768;
  }

  // Table columns
  agentEarningsColumns = ['agentName', 'totalEarnings', 'completedOrders', 'averageOrderValue'];
  organizationEarningsColumns = [
    'organizationName',
    'totalRevenue',
    'totalCosts',
    'totalProfit',
    'profitMargin',
    'totalOrders',
    'totalHours',
  ];
  overtimeColumns = [
    'agentName',
    'overtimeHours',
    'regularHours',
    'totalHours',
    'overtimePercentage',
  ];

  // Chart data for Agent Earnings (Bar Chart)
  get agentEarningsChartData(): ChartData<'bar'> {
    const data = this.statistics()?.agentEarnings || [];
    return {
      labels: data.map(a => a.agentName),
      datasets: [{
        label: 'Начислено инженерам (₽)',
        data: data.map(a => a.totalEarnings),
        backgroundColor: '#3f51b5',
        borderRadius: 6,
      }]
    };
  }

  // Chart data for Organization Earnings (Grouped Bar Chart)
  get organizationEarningsChartData(): ChartData<'bar'> {
    const data = this.statistics()?.organizationEarnings || [];
    return {
      labels: data.map(o => o.organizationName),
      datasets: [
        {
          label: 'Выручка (₽)',
          data: data.map(o => o.totalRevenue),
          backgroundColor: '#4caf50',
          borderRadius: 4,
        },
        {
          label: 'Затраты (₽)',
          data: data.map(o => o.totalCosts),
          backgroundColor: '#ff9800',
          borderRadius: 4,
        },
        {
          label: 'Прибыль (₽)',
          data: data.map(o => o.totalProfit),
          backgroundColor: '#2196f3',
          borderRadius: 4,
        }
      ]
    };
  }

  // Chart data for Profit Margin (Line Chart)
  get profitMarginChartData(): ChartData<'line'> {
    const data = this.statistics()?.organizationEarnings || [];
    return {
      labels: data.map(o => o.organizationName),
      datasets: [{
        label: 'Маржа прибыли (%)',
        data: data.map(o => o.profitMargin),
        borderColor: '#e91e63',
        backgroundColor: 'rgba(233, 30, 99, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8,
      }]
    };
  }

  // Chart data for Overtime (Doughnut Chart)
  get overtimeChartData(): ChartData<'doughnut'> {
    const data = this.statistics()?.overtimeStatistics || [];
    const totalOvertime = data.reduce((sum, a) => sum + a.overtimeHours, 0);
    const totalRegular = data.reduce((sum, a) => sum + a.regularHours, 0);
    
    return {
      labels: ['Сверхурочные часы', 'Обычные часы'],
      datasets: [{
        data: [totalOvertime, totalRegular],
        backgroundColor: ['#ff5722', '#66BB6A'],
        borderWidth: 0,
        hoverOffset: 10
      }]
    };
  }

  // Chart data for Agent Overtime Distribution (Bar Chart)
  get agentOvertimeChartData(): ChartData<'bar'> {
    const data = this.statistics()?.overtimeStatistics || [];
    return {
      labels: data.map(a => a.agentName),
      datasets: [
        {
          label: 'Обычные часы',
          data: data.map(a => a.regularHours),
          backgroundColor: '#66BB6A',
          borderRadius: 4,
        },
        {
          label: 'Сверхурочные часы',
          data: data.map(a => a.overtimeHours),
          backgroundColor: '#ff5722',
          borderRadius: 4,
        }
      ]
    };
  }

  // Chart options
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = new Intl.NumberFormat('ru-RU', {
              style: 'currency',
              currency: 'RUB',
            }).format(context.parsed?.y || 0);
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => {
            return new Intl.NumberFormat('ru-RU', {
              notation: 'compact',
              compactDisplay: 'short'
            }).format(value as number) + ' ₽';
          }
        }
      }
    }
  };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `Маржа: ${context.parsed?.y?.toFixed(2) || '0.00'}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value}%`
        }
      }
    }
  };

  doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          },
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels && data.datasets && data.datasets[0]) {
              const dataset = data.datasets[0];
              const total = (dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
              
              return data.labels.map((label, index) => {
                const value = dataset.data[index] as number;
                const percentage = ((value / total) * 100).toFixed(1);
                const bgColor = Array.isArray(dataset.backgroundColor) 
                  ? dataset.backgroundColor[index] 
                  : dataset.backgroundColor;
                const borderColor = Array.isArray(dataset.borderColor)
                  ? dataset.borderColor[index]
                  : dataset.borderColor;
                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: bgColor || '#000',
                  strokeStyle: borderColor || '#000',
                  lineWidth: 2,
                  pointStyle: 'circle',
                  hidden: false,
                  index: index
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = (context.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} ч (${percentage}%)`;
          }
        }
      }
    },
    // Добавляем анимацию для лучшего восприятия
    animation: {
      duration: 1000
    }
  };

  stackedBarChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value} ч`
        }
      }
    }
  };

  ngOnInit() {
    this.loadStatistics();
    this.loadUserStats();
  }

  loadStatistics() {
    this.isLoading.set(true);
    this.statisticsService
      .getMonthlyStatistics(this.selectedYear(), this.selectedMonth())
      .subscribe({
        next: data => {
          this.statistics.set(data);
          this.isLoading.set(false);
        },
        error: error => {
          console.error('Error loading statistics:', error);
          this.snackBar.open('Failed to load statistics', 'Close', { duration: 3000 });
          this.isLoading.set(false);
        },
      });
  }

  onYearChange(year: number) {
    this.selectedYear.set(year);
    this.loadStatistics();
  }

  onMonthChange(month: number) {
    this.selectedMonth.set(month);
    this.loadStatistics();
  }

  refreshStatistics() {
    this.loadStatistics();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('ru-RU').format(value);
  }

  getProgressBarWidth(percentage: number): string {
    return `${Math.min(percentage, 100)}%`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  getProfitColor(profit: number): string {
    if (profit > 0) return '#4caf50'; // green for profit
    if (profit < 0) return '#f44336'; // red for loss
    return '#666'; // gray for zero
  }

  getProfitMarginColor(margin: number): string {
    if (margin >= 20) return '#4caf50'; // green for good margin
    if (margin >= 10) return '#ff9800'; // orange for ok margin
    if (margin > 0) return '#ffeb3b'; // yellow for low margin
    return '#f44336'; // red for negative margin
  }

  loadUserStats() {
    this.usersService.getUsers().subscribe({
      next: response => {
        const users = response.data;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const usersByRole = {
          admin: 0,
          manager: 0,
          user: 0,
        };
        
        users.forEach(user => {
          switch (user.role) {
            case 'admin':
              usersByRole.admin++;
              break;
            case 'manager':
              usersByRole.manager++;
              break;
            case 'user':
              usersByRole.user++;
              break;
          }
        });
        
        this.userStats.set({
          totalUsers: users.length,
          activeUsers: users.filter(u => u.isActive).length,
          newUsersThisMonth: users.filter(u => {
            const userDate = new Date(u.createdAt);
            return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
          }).length,
          usersByRole,
        });
      },
      error: error => {
        console.error('Failed to load user stats:', error);
      },
    });
  }

  // Chart data for User Statistics (Doughnut Chart)
  get userStatsChartData(): ChartData<'doughnut'> {
    const stats = this.userStats();
    return {
      labels: ['Администраторы', 'Менеджеры', 'Инженеры'],
      datasets: [{
        data: [stats.usersByRole.admin, stats.usersByRole.manager, stats.usersByRole.user],
        backgroundColor: ['#f44336', '#ff9800', '#4caf50'],
        borderWidth: 0,
        hoverOffset: 10
      }]
    };
  }

  // Получение цвета для статистики сверхурочных
  getOvertimeColor(stat: any): string {
    const colors = ['#f44336', '#ff9800', '#4caf50', '#2196f3', '#9c27b0', '#00bcd4'];
    const index = this.statistics()?.overtimeStatistics?.indexOf(stat) || 0;
    return colors[index % colors.length];
  }
}
