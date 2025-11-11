import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EngineerOrderSummaryDto } from '@shared/dtos/order.dto';

@Component({
  selector: 'app-engineer-summary-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './engineer-summary-card.component.html',
  styleUrls: ['./engineer-summary-card.component.scss'],
})
export class EngineerSummaryCardComponent {
  @Input({ required: true }) summary!: EngineerOrderSummaryDto;
  @Output() monthChanged = new EventEmitter<{ year: number; month: number }>();

  private readonly monthNames = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];

  getMonthName(month: number): string {
    return this.monthNames[month - 1] || '';
  }

  previousMonth(): void {
    let newMonth = this.summary.month - 1;
    let newYear = this.summary.year;

    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    this.monthChanged.emit({ year: newYear, month: newMonth });
  }

  nextMonth(): void {
    let newMonth = this.summary.month + 1;
    let newYear = this.summary.year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }

    this.monthChanged.emit({ year: newYear, month: newMonth });
  }

  get totalEarned(): number {
    return (this.summary.earnedAmount ?? 0) + (this.summary.carPayments ?? 0);
  }

  get earningsProgress(): number {
    if (!this.summary.planEarnings || this.summary.planEarnings <= 0) {
      return 0;
    }
    return Math.min(
      100,
      ((this.summary.earnedAmount ?? 0) / this.summary.planEarnings) * 100
    );
  }

  get hoursProgress(): number {
    if (!this.summary.planHours || this.summary.planHours <= 0) {
      return 0;
    }
    return Math.min(
      100,
      ((this.summary.workedHours ?? 0) / this.summary.planHours) * 100
    );
  }
}


