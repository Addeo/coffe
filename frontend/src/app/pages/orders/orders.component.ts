import {
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  OnDestroy,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { Router, NavigationEnd } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { OrdersService } from '../../services/orders.service';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { StatisticsService } from '../../services/statistics.service';
import { UsersService } from '../../services/users.service';
import {
  OrderDto,
  OrdersQueryDto,
  OrderStatsDto,
  EngineerOrderSummaryDto,
} from '../../../../shared/dtos/order.dto';
import { OrderStatus, OrderStatusLabel } from '../../../../shared/interfaces/order.interface';
import { UserRole } from '../../../../shared/interfaces/user.interface';
import { OrderDialogComponent } from '../../components/modals/order-dialog.component';
import { OrderDeleteConfirmationDialogComponent } from '../../components/modals/order-delete-confirmation-dialog.component';
import { AssignEngineerDialogComponent } from '../../components/modals/assign-engineer-dialog.component';
import { WorkCompletionDialogComponent } from '../../components/modals/work-completion-dialog.component';
import { OrderStatusDialogComponent } from '../../components/modals/order-status-dialog.component';
import { EngineerSummaryCardComponent } from '../../components/engineer-summary-card/engineer-summary-card.component';
import { HoursProgressItemComponent } from '../../components/hours-progress-item/hours-progress-item.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatPaginatorModule,
    MatCardModule,
    MatSortModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatButtonToggleModule,
    MatProgressBarModule,
    MatDividerModule,
    BaseChartDirective,
    EngineerSummaryCardComponent,
    HoursProgressItemComponent,
    OrderDialogComponent,
    OrderDeleteConfirmationDialogComponent,
    AssignEngineerDialogComponent,
    WorkCompletionDialogComponent,
    OrderStatusDialogComponent,
  ],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss', './orders-stats.scss'],
})
export class OrdersComponent implements OnInit, OnDestroy {
  private ordersService = inject(OrdersService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private statisticsService = inject(StatisticsService);
  private usersService = inject(UsersService);

  OrderStatus = OrderStatus;

  // Dynamic columns based on user role
  displayedColumns = computed(() => {
    // Engineers see only relevant columns
    if (this.isEngineerView()) {
      return ['id', 'title', 'organization', 'status', 'createdAt', 'actions'];
    }

    // Managers and admins see all columns
    return [
      'id',
      'title',
      'organization',
      'assignedEngineer',
      'status',
      'paymentStatus',
      'createdAt',
      'actions',
    ];
  });
  dataSource = new MatTableDataSource<OrderDto>([]);
  isLoading = signal(false);
  orderStats = signal<OrderStatsDto>({
    total: 0,
    waiting: 0,
    assigned: 0,
    processing: 0,
    working: 0,
    review: 0,
    completed: 0,
    paid_to_engineer: 0,
    bySource: {
      manual: 0,
      automatic: 0,
      email: 0,
      api: 0,
    },
    paymentStats: {
      totalCompleted: 0,
      receivedFromOrganization: 0,
      pendingFromOrganization: 0,
      paidToEngineer: 0,
      pendingToEngineer: 0,
    },
    engineerSummary: null,
  });

  // Role-based permissions - using computed signals for reactivity
  readonly canCreateOrders = computed(() =>
    this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER])
  );
  readonly canAssignEngineers = computed(() =>
    this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER])
  );
  readonly canViewAllOrders = computed(() =>
    this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER])
  );
  readonly canEditOrders = computed(() =>
    this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER])
  );
  readonly canDeleteOrders = computed(() =>
    this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER])
  );
  readonly canExportOrders = computed(() =>
    this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER])
  );
  readonly isEngineerView = computed(() => this.authService.hasRole(UserRole.USER));
  readonly isManager = computed(() => this.authService.hasRole(UserRole.MANAGER));
  readonly engineerSummary = computed<EngineerOrderSummaryDto | null>(() => {
    if (!this.isEngineerView()) {
      return null;
    }

    const statsSummary = this.orderStats().engineerSummary;
    const now = new Date();

    const planHours = statsSummary?.planHours ?? 120;

    return {
      engineerId: statsSummary?.engineerId ?? 0,
      month: statsSummary?.month ?? now.getMonth() + 1,
      year: statsSummary?.year ?? now.getFullYear(),
      planHours,
      workedHours: statsSummary?.workedHours ?? 0,
      overtimeHours: statsSummary?.overtimeHours ?? 0,
      planEarnings: statsSummary?.planEarnings ?? 0,
      earnedAmount: statsSummary?.earnedAmount ?? 0,
      carPayments: statsSummary?.carPayments ?? 0,
      plannedCarAmount: statsSummary?.plannedCarAmount ?? 0,
    };
  });

  // Engineers can edit their assigned orders
  canEditOrder(order: OrderDto): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    // Don't show regular edit button for completed orders (use special 24h edit button instead)
    if (order.status === OrderStatus.COMPLETED) return false;

    // Admins and managers can always edit non-completed orders
    if (this.canEditOrders()) return true;

    // Engineers cannot edit orders (only complete work)
    if (currentUser.role === UserRole.USER) return false;

    return false;
  }

  // Engineers can update status of their assigned orders
  canUpdateOrderStatus(order: OrderDto): boolean {
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      return false;
    }

    // Admins and managers can always update
    if (this.canEditOrders()) {
      return true;
    }

    // Engineers can only update their own assigned orders
    if (currentUser.role === UserRole.USER && order.assignedEngineerId === currentUser.id) {
      // Engineers can change status from PROCESSING to WORKING, or WORKING to COMPLETED
      return order.status === OrderStatus.PROCESSING || order.status === OrderStatus.WORKING;
    }

    return false;
  }

  canManagePaymentStatus(order: OrderDto): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    // Only admins and managers can manage payment status
    if (!this.canEditOrders()) return false;

    // Can only manage payment status for completed orders
    return order.status === OrderStatus.COMPLETED || order.status === OrderStatus.PAID_TO_ENGINEER;
  }

  // Get available status options for the current user and order
  getAvailableStatuses(order: OrderDto): OrderStatus[] {
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      return [];
    }

    // Admins and managers can set any status
    if (this.canEditOrders()) {
      return Object.values(OrderStatus);
    }

    // Engineers can only change specific statuses
    if (currentUser.role === UserRole.USER && order.assignedEngineerId === currentUser.id) {
      if (order.status === OrderStatus.PROCESSING) {
        return [OrderStatus.WORKING];
      } else if (order.status === OrderStatus.WORKING) {
        return [OrderStatus.COMPLETED];
      }
    }

    // Only admins and managers can set PAID_TO_ENGINEER status
    if (this.canEditOrders() && order.status === OrderStatus.COMPLETED) {
      return [OrderStatus.COMPLETED, OrderStatus.PAID_TO_ENGINEER];
    }

    return [];
  }

  statusOptions = Object.values(OrderStatus);
  selectedStatus = signal<OrderStatus | ''>('');
  readonly assignedStatus = OrderStatus.ASSIGNED;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('mobilePaginator') mobilePaginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Manager statistics for engineer hours
  managerEngineerHoursStats = signal<{
    engineers: Array<{
      engineerId: number;
      engineerName: string;
      totalHours: number;
      regularHours: number;
      overtimeHours: number;
      planHours: number;
      completedOrders: number;
      averageHoursPerOrder?: number;
      earnedAmount?: number; // Оплата за часы
      carPayments?: number; // Оплата за авто
      engineerType?: string; // STAFF или CONTRACT
    }>;
    totalHours: number;
    totalOrders: number;
  }>({
    engineers: [],
    totalHours: 0,
    totalOrders: 0,
  });

  // Engineers list collapse state
  engineersListCollapsed = signal(true);
  isLoadingManagerStats = signal(false);
  managerStatsMonth = signal(new Date().getMonth() + 1);
  managerStatsYear = signal(new Date().getFullYear());

  // Track previous role to detect role changes
  private previousRole: UserRole | null = null;

  // Router subscription for navigation events
  private routerSubscription?: Subscription;

  constructor() {
    // Track role changes and reload data when role changes
    effect(() => {
      const currentRole = this.authService.activeRole();

      // Skip on initial load (when previousRole is null)
      if (this.previousRole !== null && this.previousRole !== currentRole) {
        console.log('🔄 Role changed detected:', {
          previous: this.previousRole,
          current: currentRole,
        });

        // Reload all data when role changes
        this.loadOrders();
        this.loadOrderStats();

        // Load manager statistics if user switched to manager role
        if (this.isManager()) {
          this.loadManagerEngineerHoursStats();
        } else {
          // Clear manager stats if switched away from manager role
          this.managerEngineerHoursStats.set({
            engineers: [],
            totalHours: 0,
            totalOrders: 0,
          });
        }

        // Log column changes for debugging
        console.log('📊 Displayed columns updated:', this.displayedColumns());
      }

      // Update previous role
      this.previousRole = currentRole ?? null;
    });
  }

  ngOnInit() {
    console.log('🚀 OrdersComponent initialized');
    console.log('🚀 Initial selected status:', this.selectedStatus());
    console.log('🚀 Status options:', this.statusOptions);

    // Set initial role
    this.previousRole = this.authService.activeRole() ?? null;

    // Подписка на события роутера для автоматической перезагрузки при переходе на страницу для диспетчера
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Если диспетчер (MANAGER) и перешли на страницу orders, перезагружаем страницу
        if (
          this.isManager() &&
          event.url === '/orders' &&
          !sessionStorage.getItem('orders-page-reloaded')
        ) {
          sessionStorage.setItem('orders-page-reloaded', 'true');
          setTimeout(() => {
            window.location.reload();
          }, 100);
        } else if (event.url !== '/orders') {
          // Сбрасываем флаг при переходе на другую страницу
          sessionStorage.removeItem('orders-page-reloaded');
        }
      });

    this.loadOrders();
    this.loadOrderStats();

    // Load manager statistics if user is manager
    if (this.isManager()) {
      this.loadManagerEngineerHoursStats();
    }
  }

  ngAfterViewInit() {
    // Set paginator and sort after a slight delay to ensure view is fully initialized
    setTimeout(() => {
      // Use mobile paginator if in mobile view, otherwise use desktop paginator
      if (this.isMobileView() && this.mobilePaginator) {
        this.dataSource.paginator = this.mobilePaginator;
        console.log('📄 Mobile paginator initialized:', this.mobilePaginator);
      } else if (this.paginator) {
        this.dataSource.paginator = this.paginator;
        console.log('📄 Desktop paginator initialized:', this.paginator);
      }

      this.dataSource.sort = this.sort;
      console.log('📄 DataSource length:', this.dataSource.data.length);
    });
  }

  private loadOrders(query: OrdersQueryDto = {}) {
    this.isLoading.set(true);

    if (this.selectedStatus()) {
      query.status = this.selectedStatus() as OrderStatus;
    }

    console.log('🔍 Loading orders with query:', query);
    console.log('🔍 Selected status:', this.selectedStatus());

    this.ordersService.getOrders(query).subscribe({
      next: response => {
        console.log('📊 Orders API response:', response);
        console.log('📊 Orders data:', response.data);
        console.log('📊 Orders count:', response.data?.length);

        this.dataSource.data = response.data || [];
        this.isLoading.set(false);

        // Re-assign paginator after data loads (important for mobile view)
        setTimeout(() => {
          if (this.isMobileView() && this.mobilePaginator) {
            this.dataSource.paginator = this.mobilePaginator;
          } else if (this.paginator) {
            this.dataSource.paginator = this.paginator;
          }
        }, 100);

        console.log('📊 DataSource data after update:', this.dataSource.data);
        console.log('📊 DataSource data length:', this.dataSource.data.length);
      },
      error: error => {
        console.error('❌ Error loading orders:', error);
        this.toastService.error('Ошибка загрузки заказов');
        this.isLoading.set(false);
      },
    });
  }

  private loadOrderStats() {
    this.ordersService.getOrderStats().subscribe({
      next: stats => {
        this.orderStats.set({
          ...stats,
          engineerSummary: stats.engineerSummary ?? null,
        });
      },
      error: error => {
        console.error('Ошибка загрузки статистики заказов:', error);
      },
    });
  }

  // Month navigation for engineer summary
  private currentYear = signal(new Date().getFullYear());
  private currentMonth = signal(new Date().getMonth() + 1);

  private readonly monthNames = [
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

  getMonthName(month: number): string {
    return this.monthNames[month - 1] || '';
  }

  previousMonth(): void {
    let newMonth = this.currentMonth() - 1;
    let newYear = this.currentYear();

    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    this.currentMonth.set(newMonth);
    this.currentYear.set(newYear);
    this.loadEngineerStatsForMonth(newYear, newMonth);
  }

  nextMonth(): void {
    let newMonth = this.currentMonth() + 1;
    let newYear = this.currentYear();

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }

    this.currentMonth.set(newMonth);
    this.currentYear.set(newYear);
    this.loadEngineerStatsForMonth(newYear, newMonth);
  }

  onEngineerMonthChanged(event: { year: number; month: number }): void {
    this.currentMonth.set(event.month);
    this.currentYear.set(event.year);
    this.loadEngineerStatsForMonth(event.year, event.month);
  }

  private loadEngineerStatsForMonth(year: number, month: number): void {
    console.log('Loading engineer stats for:', { year, month });
    this.isLoading.set(true);

    // Load orders stats with engineer summary for the selected month
    // Since backend getOrderStats doesn't support month/year params,
    // we need to manually calculate from orders
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 1);

    // Load orders for the selected month
    this.ordersService
      .getOrders({
        actualStartDateFrom: startOfMonth,
        actualStartDateTo: endOfMonth,
      } as OrdersQueryDto)
      .subscribe({
        next: response => {
          // Calculate engineer summary from orders
          const currentUser = this.authService.currentUser();
          if (currentUser && this.isEngineerView()) {
            const userOrders = response.data.filter(
              order => order.assignedEngineerId === currentUser.id
            );

            let workedHours = 0;
            let overtimeHours = 0;
            let earnedAmount = 0;
            let carPayments = 0;

            userOrders.forEach(order => {
              const regularHours = Number(order.regularHours ?? 0);
              const overtime = Number(order.overtimeHours ?? 0);
              // ВАЖНО: Часы рассчитываются с учетом коэффициента
              // Используем дефолтный коэффициент 1.6 (для Orders мы не имеем доступа к WorkSession напрямую)
              const overtimeCoefficient = 1.6;
              const totalWorkedHours = regularHours + overtime * overtimeCoefficient;
              workedHours += totalWorkedHours;
              overtimeHours += overtime;
              earnedAmount += Number(order.calculatedAmount ?? 0);
              carPayments += Number(order.carUsageAmount ?? 0);
            });

            // Get current engineer profile for plan data
            const currentSummary = this.orderStats().engineerSummary;
            const updatedSummary: EngineerOrderSummaryDto = {
              engineerId: currentSummary?.engineerId ?? 0,
              month,
              year,
              planHours: currentSummary?.planHours ?? 120,
              workedHours,
              overtimeHours,
              planEarnings: currentSummary?.planEarnings ?? 0,
              earnedAmount,
              carPayments,
              plannedCarAmount: currentSummary?.plannedCarAmount ?? 0,
            };

            // Update orderStats with new engineer summary
            this.orderStats.update(stats => ({
              ...stats,
              engineerSummary: updatedSummary,
            }));
          }
          this.isLoading.set(false);
        },
        error: error => {
          console.error('Error loading engineer stats for month:', error);
          this.toastService.error('Ошибка загрузки статистики за месяц');
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Load engineer hours statistics for manager
   */
  private loadManagerEngineerHoursStats(): void {
    if (!this.isManager()) {
      return;
    }

    this.isLoadingManagerStats.set(true);
    const year = this.managerStatsYear();
    const month = this.managerStatsMonth();

    // Load statistics and engineer profiles in parallel
    forkJoin({
      statistics: this.statisticsService.getMonthlyStatistics(year, month),
      engineers: this.usersService.getUsers({ role: UserRole.USER }), // Get all engineers
    }).subscribe({
      next: ({ statistics: data, engineers: usersResponse }) => {
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
            engineerType?: string; // STAFF или CONTRACT
            earnedAmount?: number; // Оплата за часы
            carPayments?: number; // Оплата за авто
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
          });
        });

        // Then, add completedOrders from agentEarnings and calculate averageHoursPerOrder
        data.agentEarnings.forEach(agent => {
          const existing = engineerMap.get(agent.agentId);
          if (existing) {
            existing.completedOrders = agent.completedOrders || 0;
            existing.averageHoursPerOrder =
              existing.completedOrders > 0 ? existing.totalHours / existing.completedOrders : 0;
            existing.earnedAmount = agent.earnedAmount || 0; // Оплата за часы
            existing.carPayments = agent.carPayments || 0; // Оплата за авто
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
              earnedAmount: agent.earnedAmount || 0, // Оплата за часы
              carPayments: agent.carPayments || 0, // Оплата за авто
              engineerType,
            });
          }
        });

        const engineers = Array.from(engineerMap.values());
        const totalHours = engineers.reduce((sum, eng) => sum + eng.totalHours, 0);
        const totalOrders = engineers.reduce((sum, eng) => sum + eng.completedOrders, 0);

        this.managerEngineerHoursStats.set({
          engineers,
          totalHours,
          totalOrders,
        });
        this.isLoadingManagerStats.set(false);
      },
      error: error => {
        console.error('Error loading manager engineer hours stats:', error);
        this.toastService.error('Ошибка загрузки статистики по часам инженеров');
        this.isLoadingManagerStats.set(false);
      },
    });
  }

  /**
   * Load orders for manager's selected month
   */
  private loadManagerOrdersForMonth(): void {
    if (!this.isManager()) {
      return;
    }

    const year = this.managerStatsYear();
    const month = this.managerStatsMonth();
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 1);

    // Load orders for the selected month
    this.loadOrders({
      actualStartDateFrom: startOfMonth,
      actualStartDateTo: endOfMonth,
    } as OrdersQueryDto);
  }

  /**
   * Navigate to previous month for manager statistics
   */
  previousManagerMonth(): void {
    let month = this.managerStatsMonth();
    let year = this.managerStatsYear();

    if (month === 1) {
      month = 12;
      year--;
    } else {
      month--;
    }

    this.managerStatsMonth.set(month);
    this.managerStatsYear.set(year);
    this.loadManagerEngineerHoursStats();
    this.loadManagerOrdersForMonth();
  }

  /**
   * Navigate to next month for manager statistics
   */
  nextManagerMonth(): void {
    let month = this.managerStatsMonth();
    let year = this.managerStatsYear();

    if (month === 12) {
      month = 1;
      year++;
    } else {
      month++;
    }

    this.managerStatsMonth.set(month);
    this.managerStatsYear.set(year);
    this.loadManagerEngineerHoursStats();
    this.loadManagerOrdersForMonth();
  }

  getEarningsProgress(summary: EngineerOrderSummaryDto): number {
    if (!summary.planEarnings || summary.planEarnings <= 0) {
      return 0;
    }
    return Math.min(100, ((summary.earnedAmount ?? 0) / summary.planEarnings) * 100);
  }

  getHoursProgress(summary: EngineerOrderSummaryDto): number {
    if (!summary.planHours || summary.planHours <= 0) {
      return 0;
    }
    return Math.min(100, ((summary.workedHours ?? 0) / summary.planHours) * 100);
  }

  onStatusFilterChange(status: OrderStatus | '') {
    console.log('🔄 Status filter changed to:', status);
    this.selectedStatus.set(status);
    this.loadOrders();
  }

  onSummaryStatusClick(
    key?:
      | 'total'
      | 'waiting'
      | 'processing'
      | 'working'
      | 'review'
      | 'completed'
      | 'paid_to_engineer'
  ): void {
    let status: OrderStatus | '' = '';

    switch (key) {
      case 'waiting':
        status = OrderStatus.WAITING;
        break;
      case 'processing':
        status = OrderStatus.PROCESSING;
        break;
      case 'working':
        status = OrderStatus.WORKING;
        break;
      case 'review':
        status = OrderStatus.REVIEW;
        break;
      case 'completed':
        status = OrderStatus.COMPLETED;
        break;
      case 'paid_to_engineer':
        status = OrderStatus.PAID_TO_ENGINEER;
        break;
      case 'total':
      case undefined:
      default:
        status = '';
        break;
    }

    this.onStatusFilterChange(status);
  }

  onSummaryStatusKeydown(
    event: KeyboardEvent,
    key?:
      | 'total'
      | 'waiting'
      | 'processing'
      | 'working'
      | 'review'
      | 'completed'
      | 'paid_to_engineer'
      | 'create'
  ): void {
    const { code } = event;

    // Handle Enter and Space
    if (code === 'Enter' || code === 'Space') {
      event.preventDefault();
      event.stopPropagation();

      if (key === 'create') {
        this.scrollToMainContent();
      } else {
        this.onSummaryStatusClick(key);
      }
    }
  }

  onEditOrder(order: OrderDto) {
    // Перенаправляем на страницу редактирования заказа
    this.router.navigate(['/orders', order.id, 'edit']);
  }

  onViewOrder(order: OrderDto) {
    const dialogRef = this.modalService.openDialog(
      OrderDialogComponent,
      {
        order,
        isEdit: true,
      },
      {
        disableClose: false,
        data: { readonly: true },
      }
    );

    dialogRef.subscribe(result => {
      if (result) {
        this.loadOrders();
        this.loadOrderStats();
      }
    });
  }

  onUpdateStatus(order: OrderDto, newStatus: OrderStatus) {
    console.log('🔄 onUpdateStatus called for order:', order.id, 'new status:', newStatus);

    let updateObservable;

    switch (newStatus) {
      case OrderStatus.WORKING:
        updateObservable = this.ordersService.startOrder(order.id);
        break;
      case OrderStatus.COMPLETED:
        updateObservable = this.ordersService.completeOrder(order.id);
        break;
      default:
        updateObservable = this.ordersService.updateOrder(order.id, { status: newStatus });
    }

    updateObservable.subscribe({
      next: updatedOrder => {
        // Update the order in the data source
        const index = this.dataSource.data.findIndex(o => o.id === order.id);
        if (index !== -1) {
          this.dataSource.data[index] = updatedOrder;
          this.dataSource._updateChangeSubscription();
        }
        this.loadOrderStats(); // Refresh stats
        this.toastService.success(`Статус заказа изменен на ${this.getStatusDisplay(newStatus)}`);
      },
      error: error => {
        console.error('Ошибка обновления статуса заказа:', error);
        this.toastService.error('Ошибка обновления статуса заказа');
      },
    });
  }

  onOpenStatusDialog(order: OrderDto): void {
    console.log('🔄 Opening status dialog for order:', order.id);

    const availableStatuses = this.getAvailableStatuses(order);

    const dialogRef = this.dialog.open(OrderStatusDialogComponent, {
      data: {
        order,
        availableStatuses,
      },
      width: '500px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('🔄 Status dialog result:', result);
      if (result) {
        this.onUpdateStatus(order, result);
      }
    });
  }

  onTogglePaymentStatus(order: OrderDto): void {
    const newStatus = !order.receivedFromOrganization;
    const updateData = {
      receivedFromOrganization: newStatus,
      receivedFromOrganizationDate: newStatus ? new Date() : undefined,
    };

    this.ordersService.updateOrder(order.id, updateData).subscribe({
      next: updatedOrder => {
        // Update the order in the data source
        const index = this.dataSource.data.findIndex(o => o.id === order.id);
        if (index !== -1) {
          this.dataSource.data[index] = updatedOrder;
          this.dataSource._updateChangeSubscription();
        }

        const statusText = newStatus ? 'отмечен как оплаченный' : 'отмечен как неоплаченный';
        this.toastService.success(`Заказ ${statusText}`);
      },
      error: error => {
        console.error('Ошибка обновления статуса оплаты:', error);
        this.toastService.error('Ошибка обновления статуса оплаты');
      },
    });
  }

  onAssignEngineer(order: OrderDto) {
    console.log('onAssignEngineer', order);
    const dialogRef = this.modalService.openDialog(AssignEngineerDialogComponent, {
      order,
      title: order.assignedEngineerId ? 'Переназначить инженера' : 'Назначить инженера',
    });

    dialogRef.subscribe((result: OrderDto | null) => {
      if (result) {
        // Update the order in the dataSource
        const index = this.dataSource.data.findIndex(o => o.id === result.id);
        if (index !== -1) {
          this.dataSource.data[index] = result;
          this.dataSource._updateChangeSubscription();
        }
        // Success message is already shown in the dialog component
      }
    });
  }

  onDeleteOrder(order: OrderDto) {
    const dialogRef = this.modalService.openDialog(OrderDeleteConfirmationDialogComponent, {
      order,
      title: 'Удалить заказ',
      message: `Вы уверены, что хотите удалить заказ "${order.title}"?`,
    });

    dialogRef.subscribe(result => {
      if (result) {
        this.loadOrders();
        this.loadOrderStats();
      }
    });
  }

  onCreateOrder() {
    const dialogRef = this.modalService.openDialog(OrderDialogComponent, {
      isEdit: false,
    });

    dialogRef.subscribe(result => {
      if (result) {
        this.loadOrders();
        this.loadOrderStats();
      }
    });
  }

  /**
   * Engineer confirms order (assigned → working)
   */
  onAcceptOrder(order: OrderDto) {
    this.ordersService.acceptOrder(order.id).subscribe({
      next: (updatedOrder: OrderDto) => {
        // Update the order in the dataSource
        const index = this.dataSource.data.findIndex(o => o.id === updatedOrder.id);
        if (index !== -1) {
          this.dataSource.data[index] = updatedOrder;
          this.dataSource._updateChangeSubscription();
        }
        this.toastService.success('Заявка подтверждена и перешла в работу');
        this.loadOrderStats();
      },
      error: error => {
        console.error('Error accepting order:', error);
        this.toastService.error('Ошибка при подтверждении заявки');
      },
    });
  }

  /**
   * Engineer completes work (opens form to enter work data)
   */
  onCompleteWork(order: OrderDto) {
    const dialogRef = this.modalService.openDialog(WorkCompletionDialogComponent, {
      order,
      title: 'Внести данные о выполненной работе',
    });

    dialogRef.subscribe((updatedOrder: OrderDto | null) => {
      if (updatedOrder) {
        // Update the order in the dataSource
        const index = this.dataSource.data.findIndex(o => o.id === updatedOrder.id);
        if (index !== -1) {
          this.dataSource.data[index] = updatedOrder;
          this.dataSource._updateChangeSubscription();
        }
        this.loadOrderStats();
      }
    });
  }

  /**
   * Check if engineer can accept order (assigned status)
   */
  canAcceptOrder(order: OrderDto): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser || currentUser.role !== UserRole.USER) {
      return false;
    }
    // Engineer can accept only assigned orders that are assigned to them
    return order.status === OrderStatus.ASSIGNED && order.assignedEngineerId !== undefined;
  }

  /**
   * Check if engineer can complete work (working status)
   */
  canCompleteWork(order: OrderDto): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser || currentUser.role !== UserRole.USER) {
      return false;
    }
    // Engineer can complete work only on working orders assigned to them
    return order.status === OrderStatus.WORKING && order.assignedEngineerId !== undefined;
  }

  /**
   * Check if admin/manager can edit completed order (within 24 hours)
   */
  canEditCompletedOrder(order: OrderDto): boolean {
    const currentUser = this.authService.currentUser();

    // Only admins and managers
    if (
      !currentUser ||
      (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER)
    ) {
      return false;
    }

    // Only completed orders
    if (order.status !== OrderStatus.COMPLETED) {
      return false;
    }

    // Check if within 24 hours
    if (!order.completionDate) {
      return false;
    }

    const completionTime = new Date(order.completionDate).getTime();
    const now = new Date().getTime();
    const hoursPassed = (now - completionTime) / (1000 * 60 * 60);

    return hoursPassed <= 24;
  }

  getOrganizationName(order: OrderDto): string {
    return order.organization?.name || 'N/A';
  }

  trackByOrderId(index: number, order: OrderDto): number {
    return order.id;
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  getEngineerName(order: OrderDto): string {
    if (!order.assignedEngineer) return 'Не назначен';

    // Try to get name from user object first, then fallback to direct properties
    const firstName =
      order.assignedEngineer.user?.firstName || order.assignedEngineer.firstName || '';
    const lastName = order.assignedEngineer.user?.lastName || order.assignedEngineer.lastName || '';

    if (!firstName && !lastName) return 'Не назначен';
    return `${firstName} ${lastName}`.trim();
  }

  getCreatorName(order: OrderDto): string {
    return `${order.createdBy.firstName} ${order.createdBy.lastName}`;
  }

  getStatusColor(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.COMPLETED:
        return 'primary';
      case OrderStatus.PAID_TO_ENGINEER:
        return 'accent';
      case OrderStatus.WORKING:
        return 'accent';
      case OrderStatus.ASSIGNED:
        return 'warn';
      case OrderStatus.PROCESSING:
        return 'accent';
      case OrderStatus.REVIEW:
        return 'warn';
      case OrderStatus.WAITING:
        return 'basic';
      default:
        return 'basic';
    }
  }

  getStatusDisplay(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.WAITING:
        return OrderStatusLabel.WAITING;
      case OrderStatus.ASSIGNED:
        return OrderStatusLabel.ASSIGNED;
      case OrderStatus.PROCESSING:
        return OrderStatusLabel.PROCESSING;
      case OrderStatus.WORKING:
        return OrderStatusLabel.WORKING;
      case OrderStatus.REVIEW:
        return OrderStatusLabel.REVIEW;
      case OrderStatus.COMPLETED:
        return OrderStatusLabel.COMPLETED;
      case OrderStatus.PAID_TO_ENGINEER:
        return OrderStatusLabel.PAID_TO_ENGINEER;
      default:
        return status;
    }
  }

  // Method for displayWith in mat-select filter (deprecated, not used)
  getStatusDisplayForFilter = (status: OrderStatus | string | null): string => {
    if (!status || status === '') return 'Все статусы';
    if (typeof status === 'string' && status !== '') return 'Все статусы';
    return this.getStatusDisplay(status as OrderStatus);
  };

  getStatusIcon(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.WAITING:
        return 'schedule';
      case OrderStatus.ASSIGNED:
        return 'assignment_ind';
      case OrderStatus.PROCESSING:
        return 'person_add';
      case OrderStatus.WORKING:
        return 'build';
      case OrderStatus.REVIEW:
        return 'visibility';
      case OrderStatus.COMPLETED:
        return 'check_circle';
      case OrderStatus.PAID_TO_ENGINEER:
        return 'paid';
      default:
        return 'help';
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  refreshData() {
    this.loadOrders();
    this.loadOrderStats();
  }

  // Stats view switcher
  statsView: 'compact' | 'charts' | 'progress' = 'charts'; // По умолчанию графики

  // Order statistics collapse state
  orderStatsCollapsed = signal(false);

  // Collapse states for blocks
  ordersOverviewCollapsed = signal(false);
  ordersHeaderCollapsed = signal(false);
  engineerSummaryCollapsed = signal(true);
  mobileStatisticsCollapsed = signal(false);
  managerStatsCollapsed = signal(false);

  // Mobile view detection - reactive signal
  private windowWidth = signal(window.innerWidth);
  isMobileView = computed(() => this.windowWidth() <= 768);

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.windowWidth.set(window.innerWidth);
    // Re-assign paginator when view changes
    setTimeout(() => {
      if (this.isMobileView() && this.mobilePaginator) {
        this.dataSource.paginator = this.mobilePaginator;
      } else if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    }, 100);
  }

  // Toggle order statistics visibility
  toggleOrderStats() {
    this.orderStatsCollapsed.set(!this.orderStatsCollapsed());
  }

  // Toggle orders overview block
  toggleOrdersOverview() {
    this.ordersOverviewCollapsed.set(!this.ordersOverviewCollapsed());
  }

  // Toggle orders header block
  toggleOrdersHeader() {
    this.ordersHeaderCollapsed.set(!this.ordersHeaderCollapsed());
  }

  // Toggle engineer summary block
  toggleEngineerSummary() {
    this.engineerSummaryCollapsed.set(!this.engineerSummaryCollapsed());
  }

  // Toggle mobile statistics block
  toggleMobileStatistics() {
    this.mobileStatisticsCollapsed.set(!this.mobileStatisticsCollapsed());
  }

  // Toggle manager stats block
  toggleManagerStats() {
    this.managerStatsCollapsed.set(!this.managerStatsCollapsed());
  }

  // Toggle engineers list
  toggleEngineersList() {
    this.engineersListCollapsed.set(!this.engineersListCollapsed());
  }

  // Scroll to main content (lower functional field)
  scrollToMainContent() {
    const mainContent = document.querySelector('mat-card.main-content');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Then open create order dialog
      setTimeout(() => {
        this.onCreateOrder();
      }, 300);
    } else {
      this.onCreateOrder();
    }
  }

  // Get unaccepted orders count
  getUnacceptedOrdersCount(): number {
    return this.dataSource.data.filter(order => order.status === OrderStatus.ASSIGNED).length;
  }

  // Check if current user has unaccepted orders
  hasUnacceptedOrders(): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    if (this.canViewAllOrders()) {
      // Admin/Manager sees all unaccepted orders
      return this.getUnacceptedOrdersCount() > 0;
    } else {
      // Engineer sees only their own unaccepted orders
      return this.dataSource.data.some(
        order =>
          order.status === OrderStatus.ASSIGNED && order.assignedEngineerId === currentUser.id
      );
    }
  }

  // Данные для графика статусов (Donut)
  get statusChartData(): ChartData<'doughnut'> {
    return {
      labels: [
        'Ожидают',
        'В обработке',
        'В работе',
        'На проверке',
        'Завершено',
        'Выплачено инженеру',
      ],
      datasets: [
        {
          data: [
            this.orderStats().waiting,
            this.orderStats().processing,
            this.orderStats().working,
            this.orderStats().review,
            this.orderStats().completed,
            this.orderStats().paid_to_engineer,
          ],
          backgroundColor: [
            '#FFA726', // Оранжевый - Ожидают
            '#42A5F5', // Синий - В обработке
            '#66BB6A', // Зелёный - В работе
            '#FFCA28', // Жёлтый - На проверке
            '#26A69A', // Бирюзовый - Завершено
            '#2196F3', // Синий - Выплачено инженеру
          ],
          borderWidth: 0,
          hoverOffset: 10,
        },
      ],
    };
  }

  // Данные для графика источников (Bar)
  get sourceChartData(): ChartData<'bar'> {
    return {
      labels: ['Вручную', 'Автоматически', 'Email', 'API'],
      datasets: [
        {
          label: 'Количество заказов',
          data: [
            this.orderStats().bySource.manual,
            this.orderStats().bySource.automatic,
            this.orderStats().bySource.email,
            this.orderStats().bySource.api,
          ],
          backgroundColor: '#3f51b5',
          borderRadius: 4,
        },
      ],
    };
  }

  // Опции для Donut графика
  doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: context => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = (context.dataset.data as number[]).reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Опции для Bar графика
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: context => {
            return `Заказов: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  // Данные для графика платежей (Donut)
  get paymentChartData(): ChartData<'doughnut'> {
    return {
      labels: [
        'Получено от организаций',
        'Ожидает от организаций',
        'Выплачено инженерам',
        'Ожидает выплаты',
      ],
      datasets: [
        {
          data: [
            this.orderStats().paymentStats.receivedFromOrganization,
            this.orderStats().paymentStats.pendingFromOrganization,
            this.orderStats().paymentStats.paidToEngineer,
            this.orderStats().paymentStats.pendingToEngineer,
          ],
          backgroundColor: [
            '#4CAF50', // Зелёный - Получено от организаций
            '#FF9800', // Оранжевый - Ожидает от организаций
            '#2196F3', // Синий - Выплачено инженерам
            '#FFC107', // Жёлтый - Ожидает выплаты
          ],
          borderWidth: 0,
          hoverOffset: 10,
        },
      ],
    };
  }

  // Статистика для бейджей под графиком статусов
  get statusStats() {
    return [
      { label: 'Ожидают', value: this.orderStats().waiting, color: '#FFA726' },
      { label: 'В обработке', value: this.orderStats().processing, color: '#42A5F5' },
      { label: 'В работе', value: this.orderStats().working, color: '#66BB6A' },
      { label: 'На проверке', value: this.orderStats().review, color: '#FFCA28' },
      { label: 'Завершено', value: this.orderStats().completed, color: '#26A69A' },
      { label: 'Выплачено инженеру', value: this.orderStats().paid_to_engineer, color: '#2196F3' },
    ];
  }

  // Статистика для бейджей под графиком платежей
  get paymentStats() {
    return [
      {
        label: 'Получено от организаций',
        value: this.orderStats().paymentStats.receivedFromOrganization,
        color: '#4CAF50',
      },
      {
        label: 'Ожидает от организаций',
        value: this.orderStats().paymentStats.pendingFromOrganization,
        color: '#FF9800',
      },
      {
        label: 'Выплачено инженерам',
        value: this.orderStats().paymentStats.paidToEngineer,
        color: '#2196F3',
      },
      {
        label: 'Ожидает выплаты',
        value: this.orderStats().paymentStats.pendingToEngineer,
        color: '#FFC107',
      },
    ];
  }

  // Расчёт процента для прогресс-баров
  getProgressPercentage(value: number): number {
    const total = this.orderStats().total;
    return total > 0 ? (value / total) * 100 : 0;
  }

  exportToExcel() {
    // Check if there is data to export
    if (!this.dataSource.data || this.dataSource.data.length === 0) {
      this.toastService.error('Нет данных для экспорта');
      return;
    }

    // Prepare data for export
    const exportData = this.dataSource.data.map(order => {
      // ВАЖНО: Часы рассчитываются с учетом коэффициента
      // Временная заглушка: используем дефолтный коэффициент 1.6
      // TODO: Получить реальный коэффициент из WorkSession для этого заказа
      const overtimeCoefficient = 1.6;
      const regularHours = order.regularHours ?? 0;
      const overtimeHours = order.overtimeHours ?? 0;
      const totalHours = regularHours + overtimeHours * overtimeCoefficient;
      const engineerPayment = (order.calculatedAmount ?? 0) + (order.carUsageAmount ?? 0);

      return {
        'ID заказа': order.id,
        'Название заказа': order.title,
        'Организация-заказчик': order.organization?.name ?? 'N/A',
        Инженер: this.getEngineerName(order),
        Статус: this.getStatusDisplay(order.status),
        'Ставка оплаты от организации (₽/час)': order.organizationBaseRate ?? 0,
        'Коэффициент переработки организации': order.organizationOvertimeMultiplier ?? 0,
        'Ставка оплаты инженера (₽/час)': order.engineerBaseRate ?? 0,
        'Ставка переработки инженера (₽/час)': order.engineerOvertimeRate ?? 0,
        'Обычные часы': order.regularHours ?? 0,
        'Часы переработки': order.overtimeHours ?? 0,
        'Всего часов': totalHours,
        'Сумма к оплате от организации (₽)': order.organizationPayment ?? 0,
        'Оплата инженеру за работу (₽)': order.calculatedAmount ?? 0,
        'Доплата за автомобиль (₽)': order.carUsageAmount ?? 0,
        'Всего к оплате инженеру (₽)': engineerPayment,
        'ДОХОД (₽)': order.profit ?? (order.organizationPayment ?? 0) - engineerPayment,
        'Дата создания': order.createdAt
          ? new Date(order.createdAt).toLocaleDateString('ru-RU')
          : '',
        'Дата начала работ': order.actualStartDate
          ? new Date(order.actualStartDate).toLocaleDateString('ru-RU')
          : '',
        'Дата завершения': order.completionDate
          ? new Date(order.completionDate).toLocaleDateString('ru-RU')
          : '',
      };
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 10 }, // ID заказа
      { wch: 30 }, // Название заказа
      { wch: 25 }, // Организация-заказчик
      { wch: 20 }, // Инженер
      { wch: 15 }, // Статус
      { wch: 25 }, // Ставка оплаты от организации
      { wch: 30 }, // Коэффициент переработки
      { wch: 25 }, // Ставка оплаты инженера
      { wch: 30 }, // Ставка переработки инженера
      { wch: 15 }, // Обычные часы
      { wch: 18 }, // Часы переработки
      { wch: 12 }, // Всего часов
      { wch: 30 }, // Сумма к оплате от организации
      { wch: 25 }, // Оплата инженеру за работу
      { wch: 20 }, // Доплата за автомобиль
      { wch: 25 }, // Всего к оплате инженеру
      { wch: 15 }, // ДОХОД
      { wch: 15 }, // Дата создания
      { wch: 18 }, // Дата начала работ
      { wch: 18 }, // Дата завершения
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Заказы');

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `orders_export_${currentDate}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);

    this.toastService.success('Данные успешно экспортированы в Excel');
  }

  exportStatisticsToExcel() {
    const stats = this.orderStats();

    // Prepare statistics data for export
    const statsData = [
      {
        Категория: 'Всего заказов',
        Количество: stats.total,
        Описание: 'Общее количество заказов в системе',
      },
      {
        Категория: 'Ожидают назначения',
        Количество: stats.waiting,
        Описание: 'Заказы в статусе "Ожидают"',
      },
      {
        Категория: 'В обработке',
        Количество: stats.processing,
        Описание: 'Заказы в статусе "В обработке"',
      },
      {
        Категория: 'В работе',
        Количество: stats.working,
        Описание: 'Заказы в статусе "В работе"',
      },
      {
        Категория: 'На проверке',
        Количество: stats.review,
        Описание: 'Заказы в статусе "На проверке"',
      },
      {
        Категория: 'Завершено',
        Количество: stats.completed,
        Описание: 'Заказы в статусе "Завершено"',
      },
      {
        Категория: 'Ручное создание',
        Количество: stats.bySource.manual,
        Описание: 'Заказы, созданные вручную',
      },
      {
        Категория: 'Автоматическое создание',
        Количество: stats.bySource.automatic,
        Описание: 'Заказы, созданные автоматически',
      },
      {
        Категория: 'Из email',
        Количество: stats.bySource.email,
        Описание: 'Заказы, созданные из email',
      },
      {
        Категория: 'Через API',
        Количество: stats.bySource.api,
        Описание: 'Заказы, созданные через API',
      },
    ];

    // Create worksheet for statistics
    const statsWorksheet = XLSX.utils.json_to_sheet(statsData);

    // Set column widths
    statsWorksheet['!cols'] = [
      { wch: 25 }, // Категория
      { wch: 15 }, // Количество
      { wch: 40 }, // Описание
    ];

    // Create workbook with statistics
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Статистика заказов');

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `orders_statistics_${currentDate}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);

    this.toastService.success('Статистика успешно экспортирована в Excel');
  }

  /**
   * Calculate the row index based on current page and page size
   * @param index - The current row index on the page (0-based)
   * @returns The sequential index number (1-based)
   */
  getRowIndex(index: number): number {
    // Use appropriate paginator based on view
    const activePaginator =
      this.isMobileView() && this.mobilePaginator ? this.mobilePaginator : this.paginator;

    if (!activePaginator) {
      return index + 1;
    }

    const currentPage = activePaginator.pageIndex;
    const pageSize = activePaginator.pageSize;

    return currentPage * pageSize + index + 1;
  }

  ngOnDestroy(): void {
    // Отписка от событий роутера
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
