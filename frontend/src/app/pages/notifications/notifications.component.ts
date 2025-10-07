import { Component, inject, signal, OnInit, AfterViewInit, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

import { MaterialModule } from '../../shared/material/material.module';

import { NotificationsService, NotificationDto } from '../../services/notifications.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
})
export class NotificationsComponent implements OnInit, AfterViewInit {
  private notificationsService = inject(NotificationsService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  // Data sources for different tabs
  allDataSource = new MatTableDataSource<NotificationDto>();
  unreadDataSource = new MatTableDataSource<NotificationDto>();
  readDataSource = new MatTableDataSource<NotificationDto>();

  // UI state
  isLoading = signal(false);
  selectedTabIndex = signal(0);
  searchQuery = signal('');

  // Table columns
  displayedColumns = ['type', 'title', 'message', 'priority', 'createdAt', 'actions'];

  // Column headers
  readonly columnHeaders = {
    type: $localize`:@@notifications.type:Type`,
    title: $localize`:@@notifications.titleColumn:Title`,
    message: $localize`:@@notifications.message:Message`,
    priority: $localize`:@@notifications.priority:Priority`,
    created: $localize`:@@notifications.created:Created`,
    actions: $localize`:@@notifications.actions:Actions`
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor() {
    // Setup data source filter predicates
    const filterPredicate = (data: NotificationDto, filter: string) => {
      if (!filter) return true;
      const searchStr = filter.toLowerCase();
      return (
        data.title.toLowerCase().includes(searchStr) ||
        data.message.toLowerCase().includes(searchStr) ||
        data.type.toLowerCase().includes(searchStr)
      );
    };

    this.allDataSource.filterPredicate = filterPredicate;
    this.unreadDataSource.filterPredicate = filterPredicate;
    this.readDataSource.filterPredicate = filterPredicate;

    // Watch for search query changes
    effect(() => {
      const query = this.searchQuery();
      const currentDataSource = this.getCurrentDataSource();
      currentDataSource.filter = query.trim().toLowerCase();

      if (currentDataSource.paginator) {
        currentDataSource.paginator.firstPage();
      }
    });
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngAfterViewInit(): void {
    this.onTabChange(this.selectedTabIndex());
  }

  loadNotifications(): void {
    this.isLoading.set(true);

    // Load all notifications
    this.notificationsService.getNotifications(1, 100).subscribe({
      next: response => {
        const allNotifications = response.notifications;

        // Split into read/unread
        const unreadNotifications = allNotifications.filter(n => n.status === 'unread');
        const readNotifications = allNotifications.filter(n => n.status === 'read');

        // Set data sources
        this.allDataSource.data = allNotifications;
        this.unreadDataSource.data = unreadNotifications;
        this.readDataSource.data = readNotifications;

        this.isLoading.set(false);
      },
      error: error => {
        console.error('Failed to load notifications:', error);
        this.toastService.showError('Failed to load notifications');
        this.isLoading.set(false);
      },
    });
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    // Update paginator and sort for current tab
    const currentDataSource = this.getCurrentDataSource();
    if (this.paginator) {
      currentDataSource.paginator = this.paginator;
    }
    if (this.sort) {
      currentDataSource.sort = this.sort;
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  getCurrentDataSource(): MatTableDataSource<NotificationDto> {
    switch (this.selectedTabIndex()) {
      case 0:
        return this.allDataSource;
      case 1:
        return this.unreadDataSource;
      case 2:
        return this.readDataSource;
      default:
        return this.allDataSource;
    }
  }

  onMarkAsRead(notification: NotificationDto): void {
    if (notification.status === 'read') return;

    this.notificationsService.markAsRead(notification.id).subscribe({
      next: () => {
        // Update notification status in all data sources
        this.updateNotificationStatus(notification.id, 'read');
        this.toastService.showSuccess('Notification marked as read');
      },
      error: error => {
        console.error('Failed to mark notification as read:', error);
        this.toastService.showError('Failed to mark notification as read');
      },
    });
  }

  onMarkAsUnread(notification: NotificationDto): void {
    if (notification.status === 'unread') return;

    this.notificationsService.markAsUnread(notification.id).subscribe({
      next: () => {
        // Update notification status in all data sources
        this.updateNotificationStatus(notification.id, 'unread');
        this.toastService.showSuccess('Notification marked as unread');
      },
      error: error => {
        console.error('Failed to mark notification as unread:', error);
        this.toastService.showError('Failed to mark notification as unread');
      },
    });
  }

  onMarkAllAsRead(): void {
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        // Update all notifications to read status
        this.updateAllNotificationsStatus('read');
        this.toastService.showSuccess('All notifications marked as read');
      },
      error: error => {
        console.error('Failed to mark all notifications as read:', error);
        this.toastService.showError('Failed to mark all notifications as read');
      },
    });
  }

  onDeleteNotification(notification: NotificationDto): void {
    // TODO: Implement delete notification
    this.toastService.showInfo('Delete notification functionality will be implemented');
  }

  private updateNotificationStatus(notificationId: number, status: 'read' | 'unread'): void {
    const updateNotification = (notifications: NotificationDto[]) => {
      return notifications.map(n => (n.id === notificationId ? { ...n, status } : n));
    };

    this.allDataSource.data = updateNotification(this.allDataSource.data);
    this.unreadDataSource.data = updateNotification(this.unreadDataSource.data).filter(
      n => n.status === 'unread'
    );
    this.readDataSource.data = updateNotification(this.readDataSource.data).filter(
      n => n.status === 'read'
    );
  }

  private updateAllNotificationsStatus(status: 'read' | 'unread'): void {
    const updateNotifications = (notifications: NotificationDto[]) => {
      return notifications.map(n => ({ ...n, status: status as 'read' | 'unread' }));
    };

    this.allDataSource.data = updateNotifications(this.allDataSource.data);
    this.unreadDataSource.data = status === 'unread' ? updateNotifications([]) : [];
    this.readDataSource.data =
      status === 'read' ? updateNotifications(this.allDataSource.data) : [];
  }

  getPriorityColor(priority: string): string {
    return this.notificationsService.getPriorityColor(priority);
  }

  getPriorityIcon(priority: string): string {
    return this.notificationsService.getPriorityIcon(priority);
  }

  getNotificationTypeColor(type: string): string {
    switch (type) {
      case 'order_created_from_email':
        return 'primary';
      case 'order_created':
        return 'accent';
      case 'order_status_changed':
        return 'warn';
      case 'user_activated':
        return 'primary';
      case 'user_deactivated':
        return 'warn';
      case 'system_alert':
        return 'warn';
      default:
        return 'basic';
    }
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getNotificationTypeDisplay(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getUnreadCount(): number {
    return this.unreadDataSource.data.length;
  }

  getReadCount(): number {
    return this.readDataSource.data.length;
  }

  getTotalCount(): number {
    return this.allDataSource.data.length;
  }
}
