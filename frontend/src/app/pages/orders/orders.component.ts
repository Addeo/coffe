import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
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
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { OrdersService } from '../../services/orders.service';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { OrderDto, OrdersQueryDto } from '../../../../shared/dtos/order.dto';
import { OrderStatus, OrderStatusLabel } from '../../../../shared/interfaces/order.interface';
import { UserRole } from '../../../../shared/interfaces/user.interface';
import { OrderDialogComponent } from '../../components/modals/order-dialog.component';
import { OrderDeleteConfirmationDialogComponent } from '../../components/modals/order-delete-confirmation-dialog.component';
import { AssignEngineerDialogComponent } from '../../components/modals/assign-engineer-dialog.component';
import { WorkCompletionDialogComponent } from '../../components/modals/work-completion-dialog.component';
import { OrderStatusDialogComponent } from '../../components/modals/order-status-dialog.component';
import { EarningsSummaryComponent } from '../../components/earnings-summary/earnings-summary.component';

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
    OrderDialogComponent,
    OrderDeleteConfirmationDialogComponent,
    AssignEngineerDialogComponent,
    WorkCompletionDialogComponent,
    OrderStatusDialogComponent,
    EarningsSummaryComponent,
  ],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss', './orders-stats.scss'],
})
export class OrdersComponent implements OnInit {
  private ordersService = inject(OrdersService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  displayedColumns: string[] = [
    'id',
    'title',
    'organization',
    'assignedEngineer',
    'status',
    'paymentStatus',
    'createdAt',
    'actions',
  ];
  dataSource = new MatTableDataSource<OrderDto>([]);
  isLoading = signal(false);
  orderStats = signal({
    total: 0,
    waiting: 0,
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
  });

  // Role-based permissions
  readonly canCreateOrders = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canAssignEngineers = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canViewAllOrders = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canEditOrders = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canDeleteOrders = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canExportOrders = this.authService.hasRole(UserRole.ADMIN);

  // Engineers can edit their assigned orders
  canEditOrder(order: OrderDto): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    // Don't show regular edit button for completed orders (use special 24h edit button instead)
    if (order.status === OrderStatus.COMPLETED) return false;

    // Admins and managers can always edit non-completed orders
    if (this.canEditOrders) return true;

    // Engineers can only edit their own assigned orders
    return currentUser.role === UserRole.USER && order.assignedEngineerId === currentUser.id;
  }

  // Engineers can update status of their assigned orders
  canUpdateOrderStatus(order: OrderDto): boolean {
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      return false;
    }

    // Admins and managers can always update
    if (this.canEditOrders) {
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
    if (!this.canEditOrders) return false;

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
    if (this.canEditOrders) {
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
    if (this.canEditOrders && order.status === OrderStatus.COMPLETED) {
      return [OrderStatus.COMPLETED, OrderStatus.PAID_TO_ENGINEER];
    }

    return [];
  }

  statusOptions = Object.values(OrderStatus);
  selectedStatus = signal<OrderStatus | ''>('');
  readonly assignedStatus = OrderStatus.ASSIGNED;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    console.log('🚀 OrdersComponent initialized');
    console.log('🚀 Initial selected status:', this.selectedStatus());
    console.log('🚀 Status options:', this.statusOptions);

    this.loadOrders();
    this.loadOrderStats();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
        this.orderStats.set(stats);
      },
      error: error => {
        console.error('Ошибка загрузки статистики заказов:', error);
      },
    });
  }

  onStatusFilterChange(status: OrderStatus | '') {
    console.log('🔄 Status filter changed to:', status);
    this.selectedStatus.set(status);
    this.loadOrders();
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

  // Mobile view detection
  isMobileView(): boolean {
    return window.innerWidth <= 768;
  }

  // Toggle order statistics visibility
  toggleOrderStats() {
    this.orderStatsCollapsed.set(!this.orderStatsCollapsed());
  }

  // Get unaccepted orders count
  getUnacceptedOrdersCount(): number {
    return this.dataSource.data.filter(order => order.status === OrderStatus.ASSIGNED).length;
  }

  // Check if current user has unaccepted orders
  hasUnacceptedOrders(): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    if (this.canViewAllOrders) {
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
      labels: ['Ожидают', 'В обработке', 'В работе', 'На проверке', 'Завершено', 'Выплачено инженеру'],
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
      labels: ['Получено от организаций', 'Ожидает от организаций', 'Выплачено инженерам', 'Ожидает выплаты'],
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
      { label: 'Получено от организаций', value: this.orderStats().paymentStats.receivedFromOrganization, color: '#4CAF50' },
      { label: 'Ожидает от организаций', value: this.orderStats().paymentStats.pendingFromOrganization, color: '#FF9800' },
      { label: 'Выплачено инженерам', value: this.orderStats().paymentStats.paidToEngineer, color: '#2196F3' },
      { label: 'Ожидает выплаты', value: this.orderStats().paymentStats.pendingToEngineer, color: '#FFC107' },
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
      const totalHours = (order.regularHours ?? 0) + (order.overtimeHours ?? 0);
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
    if (!this.paginator) {
      return index + 1;
    }

    const currentPage = this.paginator.pageIndex;
    const pageSize = this.paginator.pageSize;

    return currentPage * pageSize + index + 1;
  }
}
