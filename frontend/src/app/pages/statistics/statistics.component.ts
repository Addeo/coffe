import {
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { StatisticsService } from '../../services/statistics.service';
import { UsersService } from '../../services/users.service';
import { OrganizationsService } from '../../services/organizations.service';
import { AuthService } from '../../services/auth.service';
import { OrdersService } from '../../services/orders.service';
import { ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { EarningsSummaryComponent } from '../../components/earnings-summary/earnings-summary.component';
import { HoursProgressItemComponent } from '../../components/hours-progress-item/hours-progress-item.component';
import { UserRole } from '@shared/interfaces/user.interface';
import { OrganizationDto, OrganizationsQueryDto } from '@shared/dtos/organization.dto';
import { UserDto } from '@shared/dtos/user.dto';
import { EngineerType } from '@shared/interfaces/order.interface';
import { OrganizationDialogComponent } from '../../components/modals/organization-dialog.component';
import { UserDialogComponent } from '../../components/modals/user-dialog.component';
import { DeleteConfirmationDialogComponent } from '../../components/modals/delete-confirmation-dialog.component';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';
import {
  MonthlyStatisticsDto,
  AgentEarningsData,
  OrganizationEarningsData,
  OvertimeStatisticsData,
} from '@shared/dtos/reports.dto';
import { OrderStatsDto } from '@shared/dtos/order.dto';

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
    MatProgressBarModule,
    MatIconModule,
    MatTabsModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatInputModule,
    BaseChartDirective,
    EarningsSummaryComponent,
    HoursProgressItemComponent,
  ],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
})
export class StatisticsComponent implements OnInit, AfterViewInit {
  private statisticsService = inject(StatisticsService);
  private usersService = inject(UsersService);
  private organizationsService = inject(OrganizationsService);
  private authService = inject(AuthService);
  private ordersService = inject(OrdersService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);

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
  // Car payment status
  carPaymentStatus = signal<any>(null);
  carPaymentOrgColumns = [
    'organizationName',
    'totalCarAmount',
    'paidCarAmount',
    'pendingCarAmount',
    'paymentStatus',
  ];
  carPaymentEngineerColumns = [
    'engineerName',
    'totalCarAmount',
    'paidCarAmount',
    'pendingCarAmount',
    'paymentStatus',
  ];

  // Engineer hours statistics (similar to orders component)
  engineerHoursStats = signal<{
    engineers: Array<{
      engineerId: number;
      engineerName: string;
      totalHours: number;
      regularHours: number;
      overtimeHours: number;
      planHours: number;
      completedOrders: number;
      averageHoursPerOrder?: number;
      engineerType?: string;
      earnedAmount?: number;
      carPayments?: number;
    }>;
    totalHours: number;
    totalOrders: number;
  } | null>(null);
  isLoadingEngineerStats = signal(false);

  // Orders statistics for overview
  orderStats = signal<OrderStatsDto | null>(null);
  mobileStatisticsCollapsed = signal(false);

  // Organizations data
  organizations = signal<OrganizationDto[]>([]);
  organizationsDataSource = new MatTableDataSource<OrganizationDto>();
  organizationsLoading = signal(false);
  organizationsSearchQuery = signal('');
  organizationsDisplayedColumns = [
    'name',
    'baseRate',
    'overtimeMultiplier',
    'hasOvertime',
    'isActive',
    'createdAt',
    'actions',
  ];

  // Users data
  usersDataSource = new MatTableDataSource<UserDto>([]);
  usersLoading = signal(false);
  usersDisplayedColumns: string[] = [
    'id',
    'firstName',
    'lastName',
    'email',
    'role',
    'engineerType',
    'isActive',
    'createdAt',
    'actions',
  ];

  @ViewChild('organizationsPaginator') organizationsPaginator!: MatPaginator;
  @ViewChild('organizationsSort') organizationsSort!: MatSort;
  @ViewChild('usersPaginator') usersPaginator!: MatPaginator;
  @ViewChild('usersSort') usersSort!: MatSort;

  // Collapse states for blocks
  earningsSummaryCollapsed = signal(true);
  summaryCardsCollapsed = signal(true);
  financialSummaryCards = signal(true)
  carPaymentsCollapsed = signal(true);
  engineersStatsCollapsed = signal(true);
  statisticsTabsCollapsed = signal(true);
  organizationsCollapsed = signal(true);
  usersCollapsed = signal(true);

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

  // Organizations permissions
  readonly canEditOrganizations = computed(() => {
    const user = this.currentUser();
    return user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;
  });

  readonly canDeleteOrganizations = computed(() => {
    const user = this.currentUser();
    return user?.role === UserRole.ADMIN;
  });

  // Users permissions
  readonly canViewUsers = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canCreateUsers = this.authService.isAdmin();
  readonly canEditUsers = this.authService.isAdmin();
  readonly canDeleteUsers = this.authService.isAdmin();

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

  // Manager summary methods
  getTotalIncomeFromCustomers(): number {
    // Итого доход - вся сумма к оплате от заказчиков
    return this.getTotalOrganizationRevenue();
  }

  getTotalHoursPayment(): number {
    // К оплате за часы - вся сумма к оплате за часы инженерам
    return this.getTotalAgentEarnings();
  }

  getTotalCarPayment(): number {
    // К оплате за авто - вся сумма к оплате за эксплуатацию авто
    const carStatus = this.carPaymentStatus();
    return carStatus?.totalCarAmount || 0;
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

  /**
   * Загрузить статус автомобильных отчислений
   */
  private async loadCarPaymentStatus(): Promise<void> {
    // Загружаем данные только для админов и менеджеров
    if (!this.canViewAllData) {
      return;
    }

    try {
      const year = this.selectedYear();
      const month = this.selectedMonth();

      const response = await this.statisticsService.getCarPaymentStatus(year, month).toPromise();
      this.carPaymentStatus.set(response);
    } catch (error) {
      console.error('Ошибка загрузки статуса автомобильных отчислений:', error);
      this.snackBar.open('Не удалось загрузить данные автомобильных отчислений', 'Закрыть', {
        duration: 3000,
      });
    }
  }

  /**
   * Загрузить статистику по часам инженеров (аналогично orders component)
   */
  private loadEngineerHoursStats(): void {
    if (!this.canViewAllData) {
      return;
    }

    this.isLoadingEngineerStats.set(true);
    const year = this.selectedYear();
    const month = this.selectedMonth();

    // Load statistics, engineer profiles, and car payment status in parallel
    forkJoin({
      statistics: this.statisticsService.getMonthlyStatistics(year, month),
      engineers: this.usersService.getUsers({ role: UserRole.USER }), // Get all engineers
      carPayments: this.statisticsService.getCarPaymentStatus(year, month),
    }).subscribe({
      next: ({ statistics: data, engineers: usersResponse, carPayments }) => {
        // Create a map of engineerId -> planHours and engineerType from user profiles
        const engineerPlanHoursMap = new Map<number, number>();
        const engineerTypeMap = new Map<number, string>();
        usersResponse.data.forEach(user => {
          if (user.engineer) {
            if (user.engineer.planHoursMonth) {
              engineerPlanHoursMap.set(user.id, user.engineer.planHoursMonth);
            }
            if (user.engineer.type) {
              engineerTypeMap.set(user.id, user.engineer.type);
            }
          }
        });

        // Create a map of engineerId -> carPayments
        const carPaymentsMap = new Map<number, number>();
        if (carPayments?.engineerBreakdown) {
          carPayments.engineerBreakdown.forEach((engineer: any) => {
            carPaymentsMap.set(engineer.engineerId, engineer.totalCarAmount || 0);
          });
        }

        // Use overtimeStatistics which has totalHours, regularHours, overtimeHours
        // and merge with agentEarnings for completedOrders
        const engineerMap = new Map<
          number,
          {
            engineerId: number;
            engineerName: string;
            totalHours: number;
            regularHours: number;
            overtimeHours: number;
            planHours: number;
            completedOrders: number;
            averageHoursPerOrder?: number;
            engineerType?: string;
            earnedAmount?: number;
            carPayments?: number;
          }
        >();

        // First, add hours from overtimeStatistics
        data.overtimeStatistics.forEach(stat => {
          const planHours = engineerPlanHoursMap.get(stat.agentId) || 160; // Default 160 if not found
          const engineerType = engineerTypeMap.get(stat.agentId);
          engineerMap.set(stat.agentId, {
            engineerId: stat.agentId,
            engineerName: stat.agentName,
            totalHours: stat.totalHours || 0,
            regularHours: stat.regularHours || 0,
            overtimeHours: stat.overtimeHours || 0,
            planHours,
            completedOrders: 0,
            engineerType,
            carPayments: carPaymentsMap.get(stat.agentId) || 0,
          });
        });

        // Then, add completedOrders from agentEarnings and calculate averageHoursPerOrder
        data.agentEarnings.forEach(agent => {
          const existing = engineerMap.get(agent.agentId);
          if (existing) {
            existing.completedOrders = agent.completedOrders || 0;
            existing.averageHoursPerOrder =
              existing.completedOrders > 0 ? existing.totalHours / existing.completedOrders : 0;
            existing.earnedAmount = agent.totalEarnings || 0; // Оплата за часы
            if (!existing.carPayments) {
              existing.carPayments = carPaymentsMap.get(agent.agentId) || 0;
            }
          } else {
            const planHours = engineerPlanHoursMap.get(agent.agentId) || 160; // Default 160 if not found
            const engineerType = engineerTypeMap.get(agent.agentId);
            engineerMap.set(agent.agentId, {
              engineerId: agent.agentId,
              engineerName: agent.agentName,
              totalHours: 0,
              regularHours: 0,
              overtimeHours: 0,
              planHours,
              completedOrders: agent.completedOrders || 0,
              averageHoursPerOrder: 0,
              earnedAmount: agent.totalEarnings || 0, // Оплата за часы
              carPayments: carPaymentsMap.get(agent.agentId) || 0,
              engineerType,
            });
          }
        });

        const engineers = Array.from(engineerMap.values());
        const totalHours = engineers.reduce((sum, eng) => sum + eng.totalHours, 0);
        const totalOrders = engineers.reduce((sum, eng) => sum + eng.completedOrders, 0);

        this.engineerHoursStats.set({
          engineers,
          totalHours,
          totalOrders,
        });
        this.isLoadingEngineerStats.set(false);
      },
      error: error => {
        console.error('Error loading engineer hours stats:', error);
        this.toastService.showError('Ошибка загрузки статистики по часам инженеров');
        this.isLoadingEngineerStats.set(false);
      },
    });
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

  constructor() {
    // Setup organizations data source filter predicate
    this.organizationsDataSource.filterPredicate = (data: OrganizationDto, filter: string) => {
      return data.name.toLowerCase().includes(filter);
    };

    // Watch for organizations search query changes
    effect(() => {
      const query = this.organizationsSearchQuery();
      this.organizationsDataSource.filter = query.trim().toLowerCase();
    });
  }

  ngOnInit() {
    this.loadStatistics();
    this.loadCarPaymentStatus();
    this.loadUserStats();
    this.loadOrderStats();
    if (this.canViewAllData) {
      this.loadOrganizations();
      this.loadEngineerHoursStats();
      if (this.canViewUsers) {
        this.loadUsers();
      }
    }
  }

  ngAfterViewInit() {
    if (this.organizationsPaginator) {
      this.organizationsDataSource.paginator = this.organizationsPaginator;
    }
    if (this.organizationsSort) {
      this.organizationsDataSource.sort = this.organizationsSort;
    }
    if (this.usersPaginator) {
      this.usersDataSource.paginator = this.usersPaginator;
    }
    if (this.usersSort) {
      this.usersDataSource.sort = this.usersSort;
    }
  }

  loadOrderStats(): void {
    this.ordersService.getOrderStats().subscribe({
      next: stats => {
        this.orderStats.set(stats);
      },
      error: error => {
        console.error('Failed to load order stats:', error);
        this.orderStats.set(null);
      },
    });
  }

  toggleMobileStatistics(): void {
    this.mobileStatisticsCollapsed.set(!this.mobileStatisticsCollapsed());
  }

  // Toggle methods for collapsible blocks
  toggleEarningsSummary(): void {
    this.earningsSummaryCollapsed.set(!this.earningsSummaryCollapsed());
  }

  toggleSummaryCards(): void {
    this.summaryCardsCollapsed.set(!this.summaryCardsCollapsed());
  }

  toggleFinancialSummaryCards(): void {
    this.financialSummaryCards.set(!this.financialSummaryCards());
  }

  toggleCarPayments(): void {
    this.carPaymentsCollapsed.set(!this.carPaymentsCollapsed());
  }

  toggleEngineersStats(): void {
    this.engineersStatsCollapsed.set(!this.engineersStatsCollapsed());
  }

  toggleStatisticsTabs(): void {
    this.statisticsTabsCollapsed.set(!this.statisticsTabsCollapsed());
  }

  toggleOrganizations(): void {
    this.organizationsCollapsed.set(!this.organizationsCollapsed());
  }

  toggleUsers(): void {
    this.usersCollapsed.set(!this.usersCollapsed());
  }

  navigateToOrders(status?: string): void {
    if (status) {
      this.router.navigate(['/orders'], { queryParams: { status } });
    } else {
      this.router.navigate(['/orders']);
    }
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
          this.loadEngineerHoursStats();
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
    this.loadCarPaymentStatus();
    this.loadEngineerHoursStats();
  }

  onMonthChange(month: number) {
    const previousMonth = this.selectedMonth();
    this.selectedMonth.set(month);
    // Автоматически изменяем год при переходе через границы (формат месяца: 1-12)
    if (previousMonth === 12 && month === 1) {
      // Переход с декабря на январь - увеличиваем год
      this.selectedYear.update(year => year + 1);
    } else if (previousMonth === 1 && month === 12) {
      // Переход с января на декабрь - уменьшаем год
      this.selectedYear.update(year => year - 1);
    }
    this.loadStatistics();
    this.loadCarPaymentStatus();
    this.loadEngineerHoursStats();
  }

  onMonthChangedFromEarnings(event: { month: number; year: number }) {
    this.selectedMonth.set(event.month);
    this.selectedYear.set(event.year);
    this.loadStatistics();
    this.loadCarPaymentStatus();
    this.loadEngineerHoursStats();
  }

  previousMonthForEarnings() {
    let month = this.selectedMonth();
    let year = this.selectedYear();

    if (month === 1) {
      month = 12;
      year--;
    } else {
      month--;
    }

    this.selectedMonth.set(month);
    this.selectedYear.set(year);
    this.loadStatistics();
    this.loadCarPaymentStatus();
    this.loadEngineerHoursStats();
  }

  nextMonthForEarnings() {
    let month = this.selectedMonth();
    let year = this.selectedYear();

    if (month === 12) {
      month = 1;
      year++;
    } else {
      month++;
    }

    this.selectedMonth.set(month);
    this.selectedYear.set(year);
    this.loadStatistics();
    this.loadCarPaymentStatus();
    this.loadEngineerHoursStats();
  }

  refreshStatistics() {
    this.loadStatistics();
    this.loadCarPaymentStatus();
    if (this.canViewAllData) {
      this.loadEngineerHoursStats();
    }
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
    return monthNames[month - 1] || 'Неизвестно';
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
      labels: ['Руководители', 'Диспетчеры', 'Инженеры'],
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

  // Organizations methods
  loadOrganizations(query?: OrganizationsQueryDto): void {
    this.organizationsLoading.set(true);
    this.organizationsService.getOrganizations(query).subscribe({
      next: response => {
        const organizations = response.data || [];
        this.organizations.set(organizations);
        this.organizationsDataSource.data = organizations;
        this.organizationsLoading.set(false);
      },
      error: (error: HttpErrorResponse | unknown) => {
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        console.error('Failed to load organizations:', ErrorHandlerUtil.getErrorDetails(error));
        this.toastService.showError(errorMessage);
        this.organizations.set([]);
        this.organizationsDataSource.data = [];
        this.organizationsLoading.set(false);
      },
    });
  }

  onOrganizationsSearchChange(query: string): void {
    this.organizationsSearchQuery.set(query);
  }

  onCreateOrganization(): void {
    const dialogRef = this.dialog.open(OrganizationDialogComponent, {
      data: { isEdit: false },
      width: '600px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const currentOrganizations = this.organizations() || [];
        const updatedOrganizations = [...currentOrganizations, result];
        this.organizations.set(updatedOrganizations);
        this.organizationsDataSource.data = updatedOrganizations;
      }
    });
  }

  onEditOrganization(organization: OrganizationDto): void {
    if (!this.canEditOrganizations()) {
      this.toastService.showError('У вас нет прав на редактирование организаций');
      return;
    }

    const dialogRef = this.dialog.open(OrganizationDialogComponent, {
      data: { organization, isEdit: true },
      width: '600px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const currentOrganizations = this.organizations() || [];
        const updatedOrganizations = currentOrganizations.map(org =>
          org.id === result.id ? result : org
        );
        this.organizations.set(updatedOrganizations);
        this.organizationsDataSource.data = updatedOrganizations;
      }
    });
  }

  onToggleOrganizationStatus(organization: OrganizationDto): void {
    if (!this.canEditOrganizations()) {
      this.toastService.showError('У вас нет прав на изменение статуса организаций');
      return;
    }

    this.organizationsService.toggleOrganizationStatus(organization.id).subscribe({
      next: updatedOrg => {
        const currentOrganizations = this.organizations() || [];
        const updatedOrganizations = currentOrganizations.map(org =>
          org.id === updatedOrg.id ? updatedOrg : org
        );
        this.organizations.set(updatedOrganizations);
        this.organizationsDataSource.data = updatedOrganizations;

        this.toastService.showSuccess(
          `Организация ${updatedOrg.name} ${updatedOrg.isActive ? 'активирована' : 'деактивирована'}`
        );
      },
      error: (error: HttpErrorResponse | unknown) => {
        const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
        console.error(
          'Не удалось изменить статус организации:',
          ErrorHandlerUtil.getErrorDetails(error)
        );
        this.toastService.showError(errorMessage);
      },
    });
  }

  onDeleteOrganization(organization: OrganizationDto): void {
    if (!this.canDeleteOrganizations()) {
      this.toastService.showError(
        'У вас нет прав на удаление организаций. Требуется роль руководителя.'
      );
      return;
    }

    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      data: {
        title: 'Удалить организацию',
        message: `Вы уверены, что хотите удалить организацию "${organization.name}"? Это действие нельзя отменить.`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
      },
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.organizationsService.deleteOrganization(organization.id).subscribe({
          next: () => {
            const currentOrganizations = this.organizations() || [];
            const updatedOrganizations = currentOrganizations.filter(
              org => org.id !== organization.id
            );
            this.organizations.set(updatedOrganizations);
            this.organizationsDataSource.data = updatedOrganizations;

            this.toastService.showSuccess('Организация успешно удалена');
            this.loadOrganizations();
          },
          error: (error: HttpErrorResponse | unknown) => {
            const errorMessage = ErrorHandlerUtil.getErrorMessage(error);
            console.error(
              'Не удалось удалить организацию:',
              ErrorHandlerUtil.getErrorDetails(error)
            );
            this.toastService.showError(errorMessage);
          },
        });
      }
    });
  }

  formatOrganizationCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  formatOrganizationDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('ru-RU');
  }

  getOrganizationStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }

  getOrganizationStatusText(isActive: boolean): string {
    return isActive ? 'Активна' : 'Неактивна';
  }

  // Users methods
  loadUsers(): void {
    this.usersLoading.set(true);
    this.usersService.getUsers().subscribe({
      next: response => {
        this.usersDataSource.data = response.data;
        this.usersLoading.set(false);
      },
      error: error => {
        console.error('Error loading users:', error);
        this.toastService.error('Error loading users');
        this.usersLoading.set(false);
      },
    });
  }

  getFullName(user: UserDto): string {
    return `${user.firstName} ${user.lastName}`;
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

  getEngineerTypeDisplay(type: EngineerType | undefined): string {
    if (!type) {
      return '—';
    }
    switch (type) {
      case EngineerType.STAFF:
        return 'Штатный';
      case EngineerType.CONTRACT:
        return 'Наемный';
      default:
        return type;
    }
  }

  getStatusDisplay(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }

  onEditUser(user: UserDto) {
    this.router.navigate(['/users', user.id, 'edit']);
  }

  onDeleteUser(user: UserDto) {
    this.showCascadeDeleteConfirmation(user);
  }

  private showCascadeDeleteConfirmation(user: UserDto) {
    const dialogRef = this.modalService.openDialog(DeleteConfirmationDialogComponent, {
      user,
      title: 'Удалить пользователя',
      message: `Пользователь ${user.firstName} ${user.lastName} будет удален со всеми связанными данными (профиль инженера, логи активности, уведомления и т.д.).\n\nВы уверены, что хотите продолжить? Это действие нельзя отменить.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
    });

    dialogRef.subscribe(result => {
      if (result) {
        this.performCascadeDelete(user.id);
      }
    });
  }

  private performCascadeDelete(userId: number) {
    this.usersService.deleteUser(userId).subscribe({
      next: () => {
        this.toastService.success('Пользователь и все связанные данные успешно удалены');
        this.loadUsers();
      },
      error: error => {
        console.error('Error deleting user:', error);
        this.usersService.forceDeleteUser(userId).subscribe({
          next: () => {
            this.toastService.success('Пользователь и все связанные данные успешно удалены');
            this.loadUsers();
          },
          error: forceError => {
            console.error('Error force deleting user:', forceError);
            this.toastService.error('Ошибка при удалении пользователя');
          },
        });
      },
    });
  }

  onCreateUser() {
    this.router.navigate(['/users/create']);
  }

  onToggleUserStatus(user: UserDto) {
    const newStatus = !user.isActive;
    this.usersService.updateUser(user.id, { isActive: newStatus }).subscribe({
      next: updatedUser => {
        const index = this.usersDataSource.data.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.usersDataSource.data[index] = updatedUser;
          this.usersDataSource._updateChangeSubscription();
        }
        this.toastService.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      },
      error: error => {
        console.error('Error updating user status:', error);
        this.toastService.error('Error updating user status');
      },
    });
  }

  applyUsersFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.usersDataSource.filter = filterValue.trim().toLowerCase();

    if (this.usersDataSource.paginator) {
      this.usersDataSource.paginator.firstPage();
    }
  }
}
