import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationDto {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  status: 'unread' | 'read';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationsResponse {
  notifications: NotificationDto[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private http = inject(HttpClient);

  // Reactive state
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  getNotifications(page: number = 1, limit: number = 20, status?: 'unread' | 'read'): Observable<NotificationsResponse> {
    let params: any = { page, limit };
    if (status) {
      params.status = status;
    }

    return this.http.get<NotificationsResponse>(`${environment.apiUrl}/notifications`, { params });
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/unread-count`).pipe(
      tap(response => this.unreadCountSubject.next(response.count))
    );
  }

  markAsRead(notificationId: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiUrl}/notifications/${notificationId}/read`, {}).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  markAllAsRead(): Observable<{ markedAsRead: number }> {
    return this.http.post<{ markedAsRead: number }>(`${environment.apiUrl}/notifications/mark-all-read`, {}).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  deleteNotification(notificationId: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/notifications/${notificationId}`);
  }

  private refreshUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }

  // Utility methods
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'warn';
      case 'high':
        return 'accent';
      case 'medium':
        return 'primary';
      case 'low':
        return 'basic';
      default:
        return 'basic';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'info_outline';
      default:
        return 'notifications';
    }
  }
}
