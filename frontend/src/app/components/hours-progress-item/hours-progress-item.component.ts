import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface HoursStatistics {
  regularHours?: number;
  overtimeHours?: number;
  completedOrders?: number;
  averageHoursPerOrder?: number;
  efficiency?: number;
  earnedAmount?: number; // Оплата за часы
  carPayments?: number; // Оплата за авто
  [key: string]: any; // Для дополнительных полей
}

@Component({
  selector: 'app-hours-progress-item',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './hours-progress-item.component.html',
  styleUrls: ['./hours-progress-item.component.scss'],
})
export class HoursProgressItemComponent {
  @Input() workedHours: number = 0;
  @Input() planHours: number = 0;
  @Input() label: string = 'Итого часов:';
  @Input() icon: string = 'schedule';
  @Input() iconColor: string = 'accent';
  @Input() showProgressBar: boolean = true;
  @Input() statistics?: HoursStatistics; // Дополнительная статистика для раскрывающегося блока

  // Collapsed state
  isCollapsed = signal(true);
  
  // Payment buttons collapsed state
  showHoursPayments = signal(false);
  showCarPayments = signal(false);

  // Computed signal for progress percentage
  progressPercentage = computed(() => {
    if (!this.planHours || this.planHours <= 0) {
      return 0;
    }
    return Math.min(100, ((this.workedHours ?? 0) / this.planHours) * 100);
  });

  // Computed signal for progress color
  progressColor = computed(() => {
    const percentage = this.progressPercentage();
    if (percentage < 50) {
      return 'warn'; // красный
    } else if (percentage < 80) {
      return 'accent'; // желтый
    } else {
      return 'primary'; // зеленый
    }
  });

  // Computed signal for progress color class
  progressColorClass = computed(() => {
    const percentage = this.progressPercentage();
    if (percentage < 50) {
      return 'progress-low';
    } else if (percentage < 80) {
      return 'progress-medium';
    } else {
      return 'progress-high';
    }
  });

  // Computed signal for worked hours color class
  workedHoursColorClass = computed(() => {
    return this.progressColorClass();
  });

  toggleCollapse() {
    this.isCollapsed.update(value => !value);
  }
  
  toggleHoursPayments() {
    this.showHoursPayments.update(value => !value);
  }
  
  toggleCarPayments() {
    this.showCarPayments.update(value => !value);
  }
}

