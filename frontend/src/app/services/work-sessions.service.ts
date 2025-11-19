import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  WorkSessionDto,
  CreateWorkSessionDto,
  UpdateWorkSessionDto,
  WorkSessionSummaryDto,
} from '../../../shared/dtos/work-session.dto';

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
  createWorkSession(orderId: number, data: CreateWorkSessionDto): Observable<WorkSessionDto> {
    return this.http.post<WorkSessionDto>(
      `${environment.apiUrl}/orders/${orderId}/work-sessions`,
      data
    );
  }

  /**
   * Получить все рабочие сессии по заказу
   */
  getOrderWorkSessions(orderId: number): Observable<WorkSessionDto[]> {
    return this.http.get<WorkSessionDto[]>(`${environment.apiUrl}/orders/${orderId}/work-sessions`);
  }

  /**
   * Обновить рабочую сессию
   */
  updateWorkSession(sessionId: number, data: UpdateWorkSessionDto): Observable<WorkSessionDto> {
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
   * ВАЖНО: Часы рассчитываются с учетом коэффициента сверхурочных
   * Формула: regularHours + (overtimeHours * overtimeCoefficient)
   */
  calculateSessionsSummary(sessions: WorkSessionDto[]): WorkSessionSummaryDto {
    let totalCoefficientSum = 0;
    let coefficientCount = 0;

    return sessions.reduce(
      (summary, session) => {
        // ВАЖНО: Часы рассчитываются с учетом коэффициента
        const overtimeCoefficient = (session as any).engineerOvertimeCoefficient ?? 1.6; // дефолтный коэффициент
        const regularHours = session.regularHours || 0;
        const overtimeHours = session.overtimeHours || 0;
        const totalWorkedHours = regularHours + (overtimeHours * overtimeCoefficient);

        // Для расчета среднего коэффициента
        if (overtimeHours > 0) {
          totalCoefficientSum += overtimeCoefficient;
          coefficientCount++;
        }

        return {
          totalSessions: summary.totalSessions + 1,
          totalHours: summary.totalHours + totalWorkedHours, // Используем расчет с коэффициентом
          totalRegularHours: summary.totalRegularHours + regularHours,
          totalOvertimeHours: summary.totalOvertimeHours + overtimeHours,
          totalOvertimeCoefficient: coefficientCount > 0 
            ? totalCoefficientSum / coefficientCount 
            : 1.6, // средний коэффициент
          totalPayment: summary.totalPayment + session.calculatedAmount,
          totalCarUsage: summary.totalCarUsage + session.carUsageAmount,
        };
      },
      {
        totalSessions: 0,
        totalHours: 0,
        totalRegularHours: 0,
        totalOvertimeHours: 0,
        totalOvertimeCoefficient: 1.6,
        totalPayment: 0,
        totalCarUsage: 0,
      } as WorkSessionSummaryDto
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
