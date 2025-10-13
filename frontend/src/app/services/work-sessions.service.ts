import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  WorkSessionDto,
  CreateWorkSessionDto,
  UpdateWorkSessionDto,
  WorkSessionSummaryDto,
} from '../../../../shared/dtos/work-session.dto';

@Injectable({
  providedIn: 'root',
})
export class WorkSessionsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/work-sessions`;

  /**
   * Получить одну рабочую сессию по ID
   */
  getWorkSessionById(sessionId: number): Observable<WorkSessionDto> {
    return this.http.get<WorkSessionDto>(`${this.apiUrl}/${sessionId}`);
  }

  /**
   * Получить свои рабочие сессии (для инженера)
   */
  getMyWorkSessions(startDate?: string, endDate?: string): Observable<WorkSessionDto[]> {
    let url = `${this.apiUrl}/my/sessions`;
    const params: string[] = [];
    
    if (startDate) {
      params.push(`startDate=${startDate}`);
    }
    if (endDate) {
      params.push(`endDate=${endDate}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    return this.http.get<WorkSessionDto[]>(url);
  }

  /**
   * Создать рабочую сессию для заказа
   */
  createWorkSession(
    orderId: number,
    data: CreateWorkSessionDto,
  ): Observable<WorkSessionDto> {
    return this.http.post<WorkSessionDto>(
      `${environment.apiUrl}/orders/${orderId}/work-sessions`,
      data,
    );
  }

  /**
   * Получить все рабочие сессии по заказу
   */
  getOrderWorkSessions(orderId: number): Observable<WorkSessionDto[]> {
    return this.http.get<WorkSessionDto[]>(
      `${environment.apiUrl}/orders/${orderId}/work-sessions`,
    );
  }

  /**
   * Обновить рабочую сессию
   */
  updateWorkSession(
    sessionId: number,
    data: UpdateWorkSessionDto,
  ): Observable<WorkSessionDto> {
    return this.http.patch<WorkSessionDto>(`${this.apiUrl}/${sessionId}`, data);
  }

  /**
   * Удалить рабочую сессию
   */
  deleteWorkSession(sessionId: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${sessionId}`);
  }

  /**
   * Рассчитать сводку по сессиям заказа
   */
  calculateSessionsSummary(sessions: WorkSessionDto[]): WorkSessionSummaryDto {
    return sessions.reduce(
      (summary, session) => ({
        totalSessions: summary.totalSessions + 1,
        totalHours: summary.totalHours + session.regularHours + session.overtimeHours,
        totalRegularHours: summary.totalRegularHours + session.regularHours,
        totalOvertimeHours: summary.totalOvertimeHours + session.overtimeHours,
        totalPayment: summary.totalPayment + session.calculatedAmount,
        totalCarUsage: summary.totalCarUsage + session.carUsageAmount,
      }),
      {
        totalSessions: 0,
        totalHours: 0,
        totalRegularHours: 0,
        totalOvertimeHours: 0,
        totalPayment: 0,
        totalCarUsage: 0,
      } as WorkSessionSummaryDto,
    );
  }

  /**
   * Форматировать дату для API
   */
  formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Парсить дату из строки
   */
  parseDate(dateString: string | Date): Date {
    if (dateString instanceof Date) {
      return dateString;
    }
    return new Date(dateString);
  }
}

