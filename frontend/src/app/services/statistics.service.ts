import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MonthlyStatisticsDto,
  AgentEarningsData,
  OrganizationEarningsData,
  OvertimeStatisticsData
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

    return this.http.get<MonthlyStatisticsDto>(
      `${environment.apiUrl}/statistics/monthly${params}`
    );
  }
}
