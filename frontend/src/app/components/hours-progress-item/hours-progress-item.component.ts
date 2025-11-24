import {
  Component,
  Input,
  computed,
  signal,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';

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
    FormsModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonModule,
    MatTooltipModule,
    MatSliderModule,
  ],
  templateUrl: './hours-progress-item.component.html',
  styleUrls: ['./hours-progress-item.component.scss'],
})
export class HoursProgressItemComponent implements OnInit, OnChanges {
  @Input() workedHours: number = 0;
  @Input() planHours: number = 0;
  @Input() label: string = 'Итого часов:';
  @Input() icon: string = 'schedule';
  @Input() iconColor: string = 'accent';
  @Input() showProgressBar: boolean = true;
  @Input() statistics?: HoursStatistics; // Дополнительная статистика для раскрывающегося блока
  @Input() showSlider: boolean = false; // Показывать ли ползунок
  @Input() sliderMin: number = 0; // Минимальное значение ползунка
  @Input() sliderMax: number = 200; // Максимальное значение ползунка
  @Input() sliderStep: number = 0.5; // Шаг изменения ползунка

  // Slider value for display (computed with cyclic logic)
  sliderValue = signal(0);

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
    // Если workedHours превышает planHours, всегда зеленый
    if (this.workedHours > this.planHours && this.planHours > 0) {
      return 'primary'; // зеленый
    }

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
    // Если workedHours превышает planHours, всегда зеленый
    if (this.workedHours > this.planHours && this.planHours > 0) {
      return 'progress-high';
    }

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

  // Computed signal for slider position with cyclic logic
  // When workedHours > planHours, slider goes backwards
  // Examples:
  // 20/100 -> 20 (normal, 20% of plan)
  // 50/100 -> 50 (normal, 50% of plan, middle)
  // 70/100 -> 70 (normal, 70% of plan)
  // 100/100 -> 100 (normal, 100% of plan, end)
  // 140/100 -> 60 (going back: 100 - (140-100) = 60, which is 60% from end)
  // 200/100 -> 50 (going back: 100 - ((200-100) % 100) = 100 - 50 = 50, middle)
  sliderPosition = computed(() => {
    if (!this.planHours || this.planHours <= 0) {
      return 0;
    }

    const worked = this.workedHours ?? 0;

    // If workedHours <= planHours, normal position
    if (worked <= this.planHours) {
      return worked;
    }

    // If workedHours > planHours, calculate cyclic position
    // The slider goes from 0 to planHours, then back from planHours to 0
    // Formula: position = planHours - ((workedHours - planHours) % planHours)
    // This creates a sawtooth pattern: 100->0->100->0...
    const excess = worked - this.planHours;
    const cyclePosition = excess % this.planHours;
    return this.planHours - cyclePosition;
  });

  // Computed signal for slider max (should be planHours for proper visualization)
  sliderMaxValue = computed(() => {
    return this.planHours > 0 ? this.planHours : this.sliderMax;
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

  formatLabel(value: number): string {
    return `${value.toFixed(1)}ч`;
  }

  ngOnInit(): void {
    // Update slider value signal
    this.sliderValue.set(this.sliderPosition());
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update slider value when inputs change
    if (changes['workedHours'] || changes['planHours']) {
      this.sliderValue.set(this.sliderPosition());
    }
  }
}
