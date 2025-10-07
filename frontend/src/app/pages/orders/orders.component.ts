import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { OrdersService } from '../../services/orders.service';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { OrderDto, OrdersQueryDto } from '@shared/dtos/order.dto';
import { OrderStatus, OrderStatusLabel } from '@shared/interfaces/order.interface';
import { UserRole } from '@shared/interfaces/user.interface';
import { OrderDialogComponent } from '../../components/modals/order-dialog.component';
import { OrderDeleteConfirmationDialogComponent } from '../../components/modals/order-delete-confirmation-dialog.component';
import { AssignEngineerDialogComponent } from '../../components/modals/assign-engineer-dialog.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
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
    AssignEngineerDialogComponent,
  ],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
})
export class OrdersComponent implements OnInit {
  private ordersService = inject(OrdersService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);

  displayedColumns: string[] = [
    'id',
    'title',
    'organization',
    'assignedEngineer',
    'status',
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
  });

  // Role-based permissions
  readonly canCreateOrders = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canAssignEngineers = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canViewAllOrders = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canEditOrders = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canDeleteOrders = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);

  // Engineers can update status of their assigned orders
  canUpdateOrderStatus(order: OrderDto): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    // Admins and managers can always update
    if (this.canEditOrders) return true;

    // Engineers can only update their own assigned orders
    if (currentUser.role === UserRole.USER && order.assignedEngineerId === currentUser.id) {
      // Engineers can change status from PROCESSING to WORKING, or WORKING to COMPLETED
      return order.status === OrderStatus.PROCESSING || order.status === OrderStatus.WORKING;
    }

    return false;
  }

  // Get available status options for the current user and order
  getAvailableStatuses(order: OrderDto): OrderStatus[] {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];

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

    return [];
  }

  statusOptions = Object.values(OrderStatus);
  selectedStatus = signal<OrderStatus | ''>('');

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
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

    this.ordersService.getOrders(query).subscribe({
      next: response => {
        this.dataSource.data = response.data;
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Error loading orders:', error);
        this.toastService.error('Error loading orders');
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
        console.error('Error loading order stats:', error);
      },
    });
  }

  onStatusFilterChange(status: OrderStatus | '') {
    this.selectedStatus.set(status);
    this.loadOrders();
  }

  onEditOrder(order: OrderDto) {
    const dialogRef = this.modalService.openDialog(OrderDialogComponent, {
      order,
      isEdit: true,
    });

    dialogRef.subscribe(result => {
      if (result) {
        this.loadOrders();
        this.loadOrderStats();
      }
    });
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
        this.toastService.success(`Order status updated to ${newStatus}`);
      },
      error: error => {
        console.error('Error updating order status:', error);
        this.toastService.error('Error updating order status');
      },
    });
  }

  onAssignEngineer(order: OrderDto) {
    console.log('onAssignEngineer', order);
    const dialogRef = this.modalService.openDialog(AssignEngineerDialogComponent, {
      order,
      title: 'Назначить инженера',
    });

    dialogRef.subscribe((result: OrderDto | null) => {
      if (result) {
        // Update the order in the dataSource
        const index = this.dataSource.data.findIndex(o => o.id === result.id);
        if (index !== -1) {
          this.dataSource.data[index] = result;
          this.dataSource._updateChangeSubscription();
        }
        this.toastService.success('Инженер назначен на заказ');
      }
    });
  }

  onDeleteOrder(order: OrderDto) {
    const dialogRef = this.modalService.openDialog(OrderDeleteConfirmationDialogComponent, {
      order,
      title: 'Delete Order',
      message: `Are you sure you want to delete order "${order.title}"?`,
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

  getOrganizationName(order: OrderDto): string {
    return order.organization?.name || 'N/A';
  }

  getEngineerName(order: OrderDto): string {
    if (!order.assignedEngineer) return 'Unassigned';
    return `${order.assignedEngineer.firstName} ${order.assignedEngineer.lastName}`;
  }

  getCreatorName(order: OrderDto): string {
    return `${order.createdBy.firstName} ${order.createdBy.lastName}`;
  }

  getStatusColor(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.COMPLETED:
        return 'primary';
      case OrderStatus.WORKING:
        return 'accent';
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
      case OrderStatus.PROCESSING:
        return OrderStatusLabel.PROCESSING;
      case OrderStatus.WORKING:
        return OrderStatusLabel.WORKING;
      case OrderStatus.REVIEW:
        return OrderStatusLabel.REVIEW;
      case OrderStatus.COMPLETED:
        return OrderStatusLabel.COMPLETED;
      default:
        return status;
    }
  }

  getStatusIcon(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.WAITING:
        return 'schedule';
      case OrderStatus.PROCESSING:
        return 'person_add';
      case OrderStatus.WORKING:
        return 'build';
      case OrderStatus.REVIEW:
        return 'visibility';
      case OrderStatus.COMPLETED:
        return 'check_circle';
      default:
        return 'help';
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
}
