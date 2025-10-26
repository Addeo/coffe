import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SalaryPaymentDto,
  PaymentType,
  PaymentMethod,
} from '../../../../../shared/dtos/salary-payment.dto';

@Component({
  selector: 'app-payment-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="payment-list">
      <div class="list-header">
        <h3>История выплат</h3>
        <button class="btn-primary" (click)="onAddPayment()">+ Добавить выплату</button>
      </div>

      <div class="payments" *ngIf="payments && payments.length > 0">
        <div class="payment-item" *ngFor="let payment of payments">
          <div class="payment-info">
            <div class="payment-main">
              <span class="payment-amount">{{ payment.amount | number: '1.2-2' }} ₽</span>
              <span class="payment-type" [class]="payment.type">{{
                getPaymentTypeLabel(payment.type)
              }}</span>
            </div>
            <div class="payment-details">
              <span class="payment-date">{{ payment.paymentDate | date: 'dd.MM.yyyy' }}</span>
              <span class="payment-method">{{ getPaymentMethodLabel(payment.method) }}</span>
              <span class="payment-period" *ngIf="payment.month && payment.year">
                {{ getMonthName(payment.month) }} {{ payment.year }}
              </span>
            </div>
            <div class="payment-notes" *ngIf="payment.notes">
              <small>{{ payment.notes }}</small>
            </div>
          </div>
          <div class="payment-actions">
            <button class="btn-icon" (click)="onEditPayment(payment)" title="Редактировать">
              ✏️
            </button>
            <button class="btn-icon danger" (click)="onDeletePayment(payment)" title="Удалить">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!payments || payments.length === 0">
        <p>Выплаты отсутствуют</p>
      </div>
    </div>
  `,
  styles: [
    `
      .payment-list {
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #e0e0e0;
      }

      .list-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .btn-primary {
        padding: 8px 16px;
        background: #2196f3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.3s;
      }

      .btn-primary:hover {
        background: #1976d2;
      }

      .payments {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .payment-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: #f5f5f5;
        border-radius: 8px;
        transition: all 0.3s;
      }

      .payment-item:hover {
        background: #eeeeee;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .payment-info {
        flex: 1;
      }

      .payment-main {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .payment-amount {
        font-size: 20px;
        font-weight: 600;
        color: #333;
      }

      .payment-type {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
      }

      .payment-type.regular {
        background: #e3f2fd;
        color: #1976d2;
      }

      .payment-type.advance {
        background: #fff3e0;
        color: #f57c00;
      }

      .payment-type.bonus {
        background: #e8f5e9;
        color: #388e3c;
      }

      .payment-type.adjustment {
        background: #fce4ec;
        color: #c2185b;
      }

      .payment-details {
        display: flex;
        gap: 16px;
        color: #666;
        font-size: 14px;
      }

      .payment-notes {
        margin-top: 8px;
        color: #999;
      }

      .payment-actions {
        display: flex;
        gap: 8px;
      }

      .btn-icon {
        padding: 8px;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 16px;
        border-radius: 4px;
        transition: background 0.3s;
      }

      .btn-icon:hover {
        background: #e0e0e0;
      }

      .btn-icon.danger:hover {
        background: #ffebee;
      }

      .empty-state {
        text-align: center;
        padding: 40px;
        color: #999;
      }
    `,
  ],
})
export class PaymentListComponent {
  @Input() payments: SalaryPaymentDto[] = [];
  @Output() addPayment = new EventEmitter<void>();
  @Output() editPayment = new EventEmitter<SalaryPaymentDto>();
  @Output() deletePayment = new EventEmitter<SalaryPaymentDto>();

  onAddPayment(): void {
    this.addPayment.emit();
  }

  onEditPayment(payment: SalaryPaymentDto): void {
    this.editPayment.emit(payment);
  }

  onDeletePayment(payment: SalaryPaymentDto): void {
    if (confirm(`Удалить выплату на сумму ${payment.amount} ₽?`)) {
      this.deletePayment.emit(payment);
    }
  }

  getPaymentTypeLabel(type: PaymentType): string {
    const labels: Record<PaymentType, string> = {
      [PaymentType.REGULAR]: 'Зарплата',
      [PaymentType.ADVANCE]: 'Аванс',
      [PaymentType.BONUS]: 'Премия',
      [PaymentType.ADJUSTMENT]: 'Корректировка',
    };
    return labels[type] || type;
  }

  getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'Наличные',
      [PaymentMethod.BANK_TRANSFER]: 'Перевод',
      [PaymentMethod.CARD]: 'На карту',
      [PaymentMethod.OTHER]: 'Другое',
    };
    return labels[method] || method;
  }

  getMonthName(month: number): string {
    const months = [
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
    return months[month - 1] || '';
  }
}
