import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MonthlyStatisticsDto,
  AgentEarningsData,
  OrganizationEarningsData,
  OvertimeStatisticsData,
  EngineerDetailedStatsDto,
} from '@shared/dtos/reports.dto';

export interface EarningsComparison {
  currentMonth: {
    totalEarnings: number;
    completedOrders: number;
  } | null;
  previousMonth: {
    totalEarnings: number;
    completedOrders: number;
  } | null;
  growth: number;
}

export interface AdminEngineerStats {
  engineerId: number;
  engineerName: string;
  email: string;
  completedOrders: number;
  totalHours: number;
  engineerEarnings: number;
  carUsageAmount: number;
  totalEarnings: number;
  organizationPayments: number;
  profit: number;
  profitMargin: number;
}

export interface AdminEngineerStatistics {
  year: number;
  month: number;
  engineers: AdminEngineerStats[];
  totals: {
    completedOrders: number;
    totalHours: number;
    engineerEarnings: number;
    carUsageAmount: number;
    totalEarnings: number;
    organizationPayments: number;
    profit: number;
    profitMargin: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class StatisticsService {
  private http = inject(HttpClient);

  getEarningsComparison(): Observable<EarningsComparison> {
    return this.http.get<EarningsComparison>(
      `${environment.apiUrl}/statistics/earnings/comparison`
    );
  }

  getMonthlyStatistics(year?: number, month?: number): Observable<MonthlyStatisticsDto> {
    let params = '';
    if (year || month) {
      const queryParams = [];
      if (year) queryParams.push(`year=${year}`);
      if (month) queryParams.push(`month=${month}`);
      params = '?' + queryParams.join('&');
    }

    return this.http.get<MonthlyStatisticsDto>(`${environment.apiUrl}/statistics/monthly${params}`);
  }

  /**
   * Получает детальную статистику для инженера (текущего пользователя)
   * @param year Год для получения статистики (по умолчанию - текущий год)
   * @param month Месяц для получения статистики (по умолчанию - текущий месяц)
   * @returns Observable с детальной статистикой инженера
   */
  getEngineerDetailedStats(year?: number, month?: number): Observable<EngineerDetailedStatsDto> {
    let params = '';
    if (year || month) {
      const queryParams = [];
      if (year) queryParams.push(`year=${year}`);
      if (month) queryParams.push(`month=${month}`);
      params = '?' + queryParams.join('&');
    }

    return this.http.get<EngineerDetailedStatsDto>(
      `${environment.apiUrl}/statistics/engineer/detailed${params}`
    );
  }

  /**
   * Получает статистику по всем инженерам для админа
   * @param year Год для получения статистики (по умолчанию - текущий год)
   * @param month Месяц для получения статистики (по умолчанию - текущий месяц)
   * @returns Observable со статистикой по всем инженерам
   */
  getAdminEngineerStatistics(year?: number, month?: number): Observable<AdminEngineerStatistics> {
    let params = '';
    if (year || month) {
      const queryParams = [];
      if (year) queryParams.push(`year=${year}`);
      if (month) queryParams.push(`month=${month}`);
      params = '?' + queryParams.join('&');
    }

    return this.http.get<AdminEngineerStatistics>(
      `${environment.apiUrl}/statistics/admin/engineers${params}`
    );
  }
}
