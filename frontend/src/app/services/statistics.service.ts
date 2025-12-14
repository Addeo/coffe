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
   * Получает комплексную статистику со всеми данными
   * @param year Год для получения статистики
   * @param month Месяц для получения статистики
   * @param options Опции включения различных типов аналитики
   * @returns Observable с комплексной статистикой
   */
  getComprehensiveStatistics(
    year?: number,
    month?: number,
    options?: {
      includeTimeBased?: boolean;
      includeFinancial?: boolean;
      includeRankings?: boolean;
      includeForecast?: boolean;
    }
  ): Observable<ComprehensiveStatisticsDto> {
    let params = [];
    if (year) params.push(`year=${year}`);
    if (month) params.push(`month=${month}`);
    if (options?.includeTimeBased !== undefined)
      params.push(`includeTimeBased=${options.includeTimeBased}`);
    if (options?.includeFinancial !== undefined)
      params.push(`includeFinancial=${options.includeFinancial}`);
    if (options?.includeRankings !== undefined)
      params.push(`includeRankings=${options.includeRankings}`);
    if (options?.includeForecast !== undefined)
      params.push(`includeForecast=${options.includeForecast}`);

    const queryString = params.length > 0 ? '?' + params.join('&') : '';

    return this.http.get<ComprehensiveStatisticsDto>(
      `${environment.apiUrl}/statistics/comprehensive${queryString}`
    );
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

  /**
   * Получить статус автомобильных отчислений
   */
  getCarPaymentStatus(year: number, month: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/statistics/car-payment-status`, {
      params: { year: year.toString(), month: month.toString() },
    });
  }

  /**
   * Получить список организаций с долгами по автомобильным расходам
   */
  getOrganizationCarPayments(year?: number, month?: number): Observable<any> {
    let params: any = {};
    if (year) params['year'] = year.toString();
    if (month) params['month'] = month.toString();
    return this.http.get<any>(`${environment.apiUrl}/statistics/car-payments/organizations`, {
      params,
    });
  }

  /**
   * Получить список инженеров с автомобильными расходами
   */
  getEngineerCarPayments(year?: number, month?: number): Observable<any> {
    let params: any = {};
    if (year) params['year'] = year.toString();
    if (month) params['month'] = month.toString();
    return this.http.get<any>(`${environment.apiUrl}/statistics/car-payments/engineers`, {
      params,
    });
  }
}
