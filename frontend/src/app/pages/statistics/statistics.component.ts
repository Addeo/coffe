import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { StatisticsService } from '../../services/statistics.service';
import {
  MonthlyStatisticsDto,
  AgentEarningsData,
  OrganizationEarningsData,
  OvertimeStatisticsData,
} from '@shared/dtos/reports.dto';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTabsModule,
  ],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
})
export class StatisticsComponent implements OnInit {
  private statisticsService = inject(StatisticsService);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  statistics = signal<MonthlyStatisticsDto | null>(null);

  // Month and year selection
  selectedYear = signal(new Date().getFullYear());
  selectedMonth = signal(new Date().getMonth() + 1);

  // Available years and months
  availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  availableMonths = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  // Table columns
  agentEarningsColumns = ['agentName', 'totalEarnings', 'completedOrders', 'averageOrderValue'];
  organizationEarningsColumns = [
    'organizationName',
    'totalRevenue',
    'totalCosts',
    'totalProfit',
    'profitMargin',
    'totalOrders',
    'totalHours',
  ];
  overtimeColumns = [
    'agentName',
    'overtimeHours',
    'regularHours',
    'totalHours',
    'overtimePercentage',
  ];

  ngOnInit() {
    this.loadStatistics();
  }

  loadStatistics() {
    this.isLoading.set(true);
    this.statisticsService
      .getMonthlyStatistics(this.selectedYear(), this.selectedMonth())
      .subscribe({
        next: data => {
          this.statistics.set(data);
          this.isLoading.set(false);
        },
        error: error => {
          console.error('Error loading statistics:', error);
          this.snackBar.open('Failed to load statistics', 'Close', { duration: 3000 });
          this.isLoading.set(false);
        },
      });
  }

  onYearChange(year: number) {
    this.selectedYear.set(year);
    this.loadStatistics();
  }

  onMonthChange(month: number) {
    this.selectedMonth.set(month);
    this.loadStatistics();
  }

  refreshStatistics() {
    this.loadStatistics();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('ru-RU').format(value);
  }

  getProgressBarWidth(percentage: number): string {
    return `${Math.min(percentage, 100)}%`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  getProfitColor(profit: number): string {
    if (profit > 0) return '#4caf50'; // green for profit
    if (profit < 0) return '#f44336'; // red for loss
    return '#666'; // gray for zero
  }

  getProfitMarginColor(margin: number): string {
    if (margin >= 20) return '#4caf50'; // green for good margin
    if (margin >= 10) return '#ff9800'; // orange for ok margin
    if (margin > 0) return '#ffeb3b'; // yellow for low margin
    return '#f44336'; // red for negative margin
  }
}
