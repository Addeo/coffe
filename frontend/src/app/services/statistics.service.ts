import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
}
