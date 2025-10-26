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
import { AuthService } from '../../services/auth.service';
import { UserRole } from '@shared/interfaces/user.interface';
import {
  MonthlyStatisticsDto,
  AgentEarningsData,
  OrganizationEarningsData,
  OvertimeStatisticsData,
} from '@shared/dtos/reports.dto';

// Временный интерфейс до обновления shared модуля
interface ComprehensiveStatisticsDto {
  year: number;
  month: number;
  monthName: string;
  agentEarnings: AgentEarningsData[];
  organizationEarnings: OrganizationEarningsData[];
  overtimeStatistics: OvertimeStatisticsData[];
  totalEarnings: number;
  totalOrders: number;
  totalOvertimeHours: number;
  timeBasedAnalytics?: {
    salaryChart: any[];
    hoursChart: any[];
  };
  financialAnalytics?: {
    breakdown: any[];
    monthlyComparison: {
      currentMonth: AgentEarningsData[];
      previousMonth: AgentEarningsData[];
    };
  };
  rankings?: {
    topEarners: any[];
    topByHours: any[];
    efficiency: any[];
  };
  forecast?: {
    currentWorkPace: number;
    monthEndForecast: number;
    growthPotential: number;
    actualData: any[];
    forecastData: any[];
  };
}

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
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  // Плагины для диаграмм
  chartPlugins = [];

  isLoading = signal(false);
  statistics = signal<MonthlyStatisticsDto | null>(null);
  comprehensiveStatistics = signal<ComprehensiveStatisticsDto | null>(null);

  // User statistics
  userStats = signal({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    usersByRole: {
      admin: 0,
      manager: 0,
      user: 0,
    },
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

  // User role checks
  readonly isAdmin = this.authService.hasRole(UserRole.ADMIN);
  readonly isManager = this.authService.hasRole(UserRole.MANAGER);
  readonly isEngineer = this.authService.hasRole(UserRole.USER);
  readonly canViewAllData = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly currentUser = this.authService.currentUser;

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
  financialDetailsColumns = [
    'engineerName',
    'fixedSalary',
    'additionalEarnings',
    'carPayment',
    'totalEarnings',
  ];

  // Organization columns for detailed analytics
  organizationColumns = [
    'organizationName',
    'totalRevenue',
    'totalCosts',
    'totalProfit',
    'profitMargin',
    'totalOrders',
    'totalHours',
    'averageOrderValue',
  ];

  // Agent columns for detailed analytics
  agentColumns = [
    'agentName',
    'totalEarnings',
    'completedOrders',
    'averageOrderValue',
    'hourlyRate',
    'overtimeRate',
    'companyDifference',
  ];

  // New data sources
  financialDetailsData = signal<any[]>([]);
  topEarners = signal<any[]>([]);
  topByHours = signal<any[]>([]);
  currentWorkPace = signal<number>(0);
  monthEndForecast = signal<number>(0);
  growthPotential = signal<number>(0);

  // Data source for table
  get financialDetailsDataSource() {
    return this.financialDetailsData();
  }

  get organizationDataSource() {
    return this.statistics()?.organizationEarnings || [];
  }

  get agentDataSource() {
    return this.statistics()?.agentEarnings || [];
  }

  // Organization analytics methods
  getTotalOrganizationRevenue(): number {
    const data = this.statistics()?.organizationEarnings || [];
    return data.reduce((sum, org) => sum + org.totalRevenue, 0);
  }

  getAverageOrganizationRate(): number {
    const data = this.statistics()?.organizationEarnings || [];
    if (data.length === 0) return 0;
    const totalHours = data.reduce((sum, org) => sum + org.totalHours, 0);
    const totalRevenue = this.getTotalOrganizationRevenue();
    return totalHours > 0 ? totalRevenue / totalHours : 0;
  }

  getTotalOrganizationOrders(): number {
    const data = this.statistics()?.organizationEarnings || [];
    return data.reduce((sum, org) => sum + org.totalOrders, 0);
  }

  // Agent analytics methods
  getTotalAgentEarnings(): number {
    const data = this.statistics()?.agentEarnings || [];
    return data.reduce((sum, agent) => sum + agent.totalEarnings, 0);
  }

  getAverageAgentRate(): number {
    const data = this.statistics()?.agentEarnings || [];
    if (data.length === 0) return 0;
    const totalOrders = data.reduce((sum, agent) => sum + agent.completedOrders, 0);
    const totalEarnings = this.getTotalAgentEarnings();
    // Предполагаем 8 часов на заказ
    const totalHours = totalOrders * 8;
    return totalHours > 0 ? totalEarnings / totalHours : 0;
  }

  getCompanyAgentDifference(): number {
    const agentEarnings = this.getTotalAgentEarnings();
    const organizationRevenue = this.getTotalOrganizationRevenue();
    return organizationRevenue - agentEarnings;
  }

  getAgentHourlyRate(agent: any): number {
    // Предполагаем 8 часов на заказ
    const totalHours = agent.completedOrders * 8;
    return totalHours > 0 ? agent.totalEarnings / totalHours : 0;
  }

  getAgentOvertimeRate(agent: any): number {
    // Сверхурочная ставка обычно в 1.5 раза больше обычной
    return this.getAgentHourlyRate(agent) * 1.5;
  }

  getAgentCompanyDifference(agent: any): number {
    // Упрощенный расчет разницы между тем, что заработала компания и агентом
    const agentEarnings = agent.totalEarnings;
    const companyRevenue = agent.averageOrderValue * agent.completedOrders;
    return companyRevenue - agentEarnings;
  }

  // Временные геттеры для новых полей до обновления shared модуля
  get totalOrganizationRevenue(): number {
    return this.getTotalOrganizationRevenue();
  }

  get totalOrganizationPaid(): number {
    return this.getTotalOrganizationRevenue(); // Пока считаем что все заплатили
  }

  get totalAgentEarnings(): number {
    return this.getTotalAgentEarnings();
  }

  get totalCompanyRevenue(): number {
    return this.getTotalOrganizationRevenue();
  }

  get totalAgentPayments(): number {
    return this.getTotalAgentEarnings(); // Пока считаем что все выплатили
  }

  get companyProfit(): number {
    return this.getCompanyAgentDifference();
  }

  // Chart data for Agent Earnings (Bar Chart)
  get agentEarningsChartData(): ChartData<'bar'> {
    const data = this.statistics()?.agentEarnings || [];
    return {
      labels: data.map(a => a.agentName),
      datasets: [
        {
          label: 'Начислено инженерам (₽)',
          data: data.map(a => a.totalEarnings),
          backgroundColor: '#3f51b5',
          borderRadius: 6,
        },
      ],
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
        },
      ],
    };
  }

  // Chart data for Profit Margin (Line Chart)
  get profitMarginChartData(): ChartData<'line'> {
    const data = this.statistics()?.organizationEarnings || [];
    return {
      labels: data.map(o => o.organizationName),
      datasets: [
        {
          label: 'Маржа прибыли (%)',
          data: data.map(o => o.profitMargin),
          borderColor: '#e91e63',
          backgroundColor: 'rgba(233, 30, 99, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
  }

  // Chart data for Overtime (Doughnut Chart)
  get overtimeChartData(): ChartData<'doughnut'> {
    const data = this.statistics()?.overtimeStatistics || [];
    const totalOvertime = data.reduce((sum, a) => sum + a.overtimeHours, 0);
    const totalRegular = data.reduce((sum, a) => sum + a.regularHours, 0);

    return {
      labels: ['Сверхурочные часы', 'Обычные часы'],
      datasets: [
        {
          data: [totalOvertime, totalRegular],
          backgroundColor: ['#ff5722', '#66BB6A'],
          borderWidth: 0,
          hoverOffset: 10,
        },
      ],
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
        },
      ],
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
          label: context => {
            const label = context.dataset.label || '';
            const value = new Intl.NumberFormat('ru-RU', {
              style: 'currency',
              currency: 'RUB',
            }).format(context.parsed?.y || 0);
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: value => {
            return (
              new Intl.NumberFormat('ru-RU', {
                notation: 'compact',
                compactDisplay: 'short',
              }).format(value as number) + ' ₽'
            );
          },
        },
      },
    },
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
          label: context => {
            return `Маржа: ${context.parsed?.y?.toFixed(2) || '0.00'}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: value => `${value}%`,
        },
      },
    },
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
            size: 12,
          },
          generateLabels: chart => {
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
                  index: index,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: context => {
            const label = context.label || '';
            const value = context.parsed;
            const total = (context.dataset.data as number[]).reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} ч (${percentage}%)`;
          },
        },
      },
    },
    // Добавляем анимацию для лучшего восприятия
    animation: {
      duration: 1000,
    },
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
          callback: value => `${value} ч`,
        },
      },
    },
  };

  ngOnInit() {
    this.loadStatistics();
    this.loadUserStats();
  }

  loadStatistics() {
    this.isLoading.set(true);

    // Для инженеров загружаем только их статистику
    if (this.isEngineer) {
      this.loadEngineerStatistics();
    } else {
      // Для админов/менеджеров загружаем общую статистику
      this.loadAdminStatistics();
    }
  }

  private loadEngineerStatistics() {
    const currentUser = this.currentUser();
    if (!currentUser) {
      this.isLoading.set(false);
      return;
    }

    // Use engineer-specific endpoint instead of admin endpoint
    this.statisticsService
      .getEngineerDetailedStats(this.selectedYear(), this.selectedMonth())
      .subscribe({
        next: (data: any) => {
          // Create statistics object for the engineer
          const engineerStats = {
            year: this.selectedYear(),
            month: this.selectedMonth(),
            monthName: this.getMonthName(this.selectedMonth()),
            agentEarnings: [
              {
                agentId: data.engineerId || currentUser.id,
                agentName: data.engineerName || `${currentUser.firstName} ${currentUser.lastName}`,
                totalEarnings: data.totalEarnings || 0,
                completedOrders: data.totalOrders || 0,
                averageOrderValue:
                  data.totalOrders > 0 ? (data.totalEarnings || 0) / data.totalOrders : 0,
              },
            ],
            organizationEarnings: [],
            overtimeStatistics: [],
            totalEarnings: data.totalEarnings || 0,
            totalOrders: data.totalOrders || 0,
            totalOvertimeHours: 0,
          };

          this.statistics.set(engineerStats);
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('Error loading engineer statistics:', error);
          // Create empty statistics on error
          this.statistics.set({
            year: this.selectedYear(),
            month: this.selectedMonth(),
            monthName: this.getMonthName(this.selectedMonth()),
            agentEarnings: [],
            organizationEarnings: [],
            overtimeStatistics: [],
            totalEarnings: 0,
            totalOrders: 0,
            totalOvertimeHours: 0,
          });
          this.isLoading.set(false);
        },
      });
  }

  private loadAdminStatistics() {
    this.statisticsService
      .getComprehensiveStatistics(this.selectedYear(), this.selectedMonth(), {
        includeTimeBased: true,
        includeFinancial: true,
        includeRankings: true,
        includeForecast: true,
      })
      .subscribe({
        next: data => {
          this.comprehensiveStatistics.set(data);
          // Извлекаем базовую статистику для обратной совместимости
          this.statistics.set({
            year: data.year,
            month: data.month,
            monthName: data.monthName,
            agentEarnings: data.agentEarnings,
            organizationEarnings: data.organizationEarnings,
            overtimeStatistics: data.overtimeStatistics,
            totalEarnings: data.totalEarnings,
            totalOrders: data.totalOrders,
            totalOvertimeHours: data.totalOvertimeHours,
          });
          this.loadAdditionalData();
          this.isLoading.set(false);
        },
        error: error => {
          console.error('Error loading admin statistics:', error);
          this.snackBar.open('Ошибка загрузки статистики', 'Закрыть', { duration: 3000 });
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

  // Engineer personal statistics methods
  getMyEarnings(): number {
    if (!this.isEngineer || !this.statistics()) return 0;
    const currentUser = this.currentUser();
    if (!currentUser) return 0;

    const myAgentData = this.statistics()?.agentEarnings?.find(
      agent => agent.agentId === currentUser.id
    );
    return myAgentData?.totalEarnings || 0;
  }

  getMyOrders(): number {
    if (!this.isEngineer || !this.statistics()) return 0;
    const currentUser = this.currentUser();
    if (!currentUser) return 0;

    const myAgentData = this.statistics()?.agentEarnings?.find(
      agent => agent.agentId === currentUser.id
    );
    return myAgentData?.completedOrders || 0;
  }

  getMyHours(): number {
    if (!this.isEngineer || !this.statistics()) return 0;
    const currentUser = this.currentUser();
    if (!currentUser) return 0;

    const myAgentData = this.statistics()?.agentEarnings?.find(
      agent => agent.agentId === currentUser.id
    );
    // Предполагаем 8 часов на заказ
    return myAgentData?.completedOrders ? myAgentData.completedOrders * 8 : 0;
  }

  getMyAverageOrder(): number {
    const orders = this.getMyOrders();
    if (orders === 0) return 0;
    return this.getMyEarnings() / orders;
  }

  getMonthName(month: number): string {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return monthNames[month - 1] || 'Unknown';
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
      datasets: [
        {
          data: [stats.usersByRole.admin, stats.usersByRole.manager, stats.usersByRole.user],
          backgroundColor: ['#f44336', '#ff9800', '#4caf50'],
          borderWidth: 0,
          hoverOffset: 10,
        },
      ],
    };
  }

  // Получение цвета для статистики сверхурочных
  getOvertimeColor(stat: any): string {
    const colors = ['#f44336', '#ff9800', '#4caf50', '#2196f3', '#9c27b0', '#00bcd4'];
    const index = this.statistics()?.overtimeStatistics?.indexOf(stat) || 0;
    return colors[index % colors.length];
  }

  // New chart data methods
  get salaryTimeChartData(): ChartData<'line'> {
    const comprehensiveData = this.comprehensiveStatistics();
    const timeBasedData = comprehensiveData?.timeBasedAnalytics?.salaryChart || [];

    if (timeBasedData.length === 0) {
      return {
        labels: Array.from({ length: 31 }, (_, i) => `${i + 1}`),
        datasets: [
          {
            label: 'Накопительные зарплаты',
            data: Array.from({ length: 31 }, () => Math.random() * 10000),
            borderColor: '#3f51b5',
            backgroundColor: 'rgba(63, 81, 181, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      };
    }

    const colors = ['#3f51b5', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];
    const datasets = timeBasedData.map((engineer: any, index: number) => ({
      label: engineer.engineerName,
      data: engineer.data.map((point: any) => point.value),
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + '20',
      tension: 0.4,
      fill: false,
    }));

    return {
      labels: timeBasedData[0]?.data.map((point: any) => point.date) || [],
      datasets,
    };
  }

  get hoursTimeChartData(): ChartData<'line'> {
    const comprehensiveData = this.comprehensiveStatistics();
    const timeBasedData = comprehensiveData?.timeBasedAnalytics?.hoursChart || [];

    if (timeBasedData.length === 0) {
      return {
        labels: Array.from({ length: 31 }, (_, i) => `${i + 1}`),
        datasets: [
          {
            label: 'Накопительные часы',
            data: Array.from({ length: 31 }, () => Math.random() * 8),
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      };
    }

    const colors = ['#4caf50', '#3f51b5', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];
    const datasets = timeBasedData.map((engineer: any, index: number) => ({
      label: engineer.engineerName,
      data: engineer.data.map((point: any) => point.value),
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + '20',
      tension: 0.4,
      fill: false,
    }));

    return {
      labels: timeBasedData[0]?.data.map((point: any) => point.date) || [],
      datasets,
    };
  }

  get salaryBreakdownChartData(): ChartData<'bar'> {
    // TODO: Implement salary breakdown data
    const data = this.statistics()?.agentEarnings || [];
    return {
      labels: data.map(a => a.agentName),
      datasets: [
        {
          label: 'Фиксированная зарплата',
          data: data.map(() => Math.random() * 30000),
          backgroundColor: '#ff9800',
        },
        {
          label: 'Дополнительная оплата',
          data: data.map(() => Math.random() * 15000),
          backgroundColor: '#2196f3',
        },
        {
          label: 'Оплата за автомобиль',
          data: data.map(() => Math.random() * 5000),
          backgroundColor: '#4caf50',
        },
      ],
    };
  }

  get monthlyComparisonChartData(): ChartData<'bar'> {
    const comprehensiveData = this.comprehensiveStatistics();
    const financialData = comprehensiveData?.financialAnalytics?.monthlyComparison;

    if (!financialData) {
      const data = this.statistics()?.agentEarnings || [];
      return {
        labels: data.map(a => a.agentName),
        datasets: [
          {
            label: 'Текущий месяц',
            data: data.map(a => a.totalEarnings),
            backgroundColor: '#3f51b5',
          },
          {
            label: 'Предыдущий месяц',
            data: data.map(() => Math.random() * 50000),
            backgroundColor: '#ff9800',
          },
        ],
      };
    }

    return {
      labels: financialData.currentMonth.map((a: any) => a.agentName),
      datasets: [
        {
          label: 'Текущий месяц',
          data: financialData.currentMonth.map((a: any) => a.totalEarnings),
          backgroundColor: '#3f51b5',
        },
        {
          label: 'Предыдущий месяц',
          data: financialData.previousMonth.map((a: any) => a.totalEarnings),
          backgroundColor: '#ff9800',
        },
      ],
    };
  }

  get efficiencyChartData(): ChartData<'bar'> {
    const comprehensiveData = this.comprehensiveStatistics();
    const efficiencyData = comprehensiveData?.rankings?.efficiency || [];

    if (efficiencyData.length === 0) {
      const data = this.statistics()?.agentEarnings || [];
      return {
        labels: data.map(a => a.agentName),
        datasets: [
          {
            label: 'Эффективность (₽/час)',
            data: data.map(a => a.totalEarnings / (a.completedOrders * 8)), // Примерный расчет
            backgroundColor: '#e91e63',
          },
        ],
      };
    }

    return {
      labels: efficiencyData.map((e: any) => e.engineerName),
      datasets: [
        {
          label: 'Эффективность (₽/час)',
          data: efficiencyData.map((e: any) => e.efficiency),
          backgroundColor: '#e91e63',
        },
      ],
    };
  }

  get forecastChartData(): ChartData<'line'> {
    const comprehensiveData = this.comprehensiveStatistics();
    const forecastData = comprehensiveData?.forecast;

    if (!forecastData) {
      return {
        labels: Array.from({ length: 31 }, (_, i) => `${i + 1}`),
        datasets: [
          {
            label: 'Фактический заработок',
            data: Array.from({ length: 15 }, () => Math.random() * 10000),
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
          },
          {
            label: 'Прогноз',
            data: Array.from({ length: 31 }, (_, i) => (i < 15 ? null : Math.random() * 10000)),
            borderColor: '#ff9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            tension: 0.4,
            borderDash: [5, 5],
          },
        ],
      };
    }

    return {
      labels: forecastData.actualData.map((point: any) => point.date),
      datasets: [
        {
          label: 'Фактический заработок',
          data: forecastData.actualData.map((point: any) => point.value),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Прогноз',
          data: forecastData.forecastData.map((point: any) => point.value),
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          tension: 0.4,
          borderDash: [5, 5],
        },
      ],
    };
  }

  // New chart options
  get lineChartTimeOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: context => {
              const label = context.dataset.label || '';
              const value = context.parsed?.y || 0;
              return `${label}: ${new Intl.NumberFormat('ru-RU').format(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'День месяца',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Сумма (₽)',
          },
          beginAtZero: true,
        },
      },
    };
  }

  // Load additional data
  loadAdditionalData() {
    const comprehensiveData = this.comprehensiveStatistics();
    if (!comprehensiveData) return;

    // Загружаем финансовые детали
    if (comprehensiveData.financialAnalytics?.breakdown) {
      this.financialDetailsData.set(comprehensiveData.financialAnalytics.breakdown);
    }

    // Загружаем рейтинги
    if (comprehensiveData.rankings) {
      this.topEarners.set(comprehensiveData.rankings.topEarners);
      this.topByHours.set(comprehensiveData.rankings.topByHours);
    }

    // Загружаем прогнозные данные
    if (comprehensiveData.forecast) {
      this.currentWorkPace.set(comprehensiveData.forecast.currentWorkPace);
      this.monthEndForecast.set(comprehensiveData.forecast.monthEndForecast);
      this.growthPotential.set(comprehensiveData.forecast.growthPotential);
    }
  }
}
