import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EngineerBalanceDto } from '../../../../../shared/dtos/salary-payment.dto';

@Component({
  selector: 'app-engineer-balance-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="balance-card" [class.negative]="balance && balance.balance < 0">
      <div class="balance-header">
        <h3>{{ balance?.engineerName || 'Баланс инженера' }}</h3>
        <span
          class="balance-status"
          [class.debt]="balance && balance.balance > 0"
          [class.overpaid]="balance && balance.balance < 0"
        >
          {{ getBalanceStatus() }}
        </span>
      </div>

      <div class="balance-amounts" *ngIf="balance">
        <div class="amount-item">
          <span class="amount-label">Начислено:</span>
          <span class="amount-value accrued">{{ balance.totalAccrued | number: '1.2-2' }} ₽</span>
        </div>

        <div class="amount-item">
          <span class="amount-label">Выплачено:</span>
          <span class="amount-value paid">{{ balance.totalPaid | number: '1.2-2' }} ₽</span>
        </div>

        <div class="amount-item total">
          <span class="amount-label">Баланс:</span>
          <span
            class="amount-value balance"
            [class.positive]="balance.balance > 0"
            [class.negative]="balance.balance < 0"
          >
            {{ balance.balance | number: '1.2-2' }} ₽
          </span>
        </div>
      </div>

      <div class="balance-footer" *ngIf="balance">
        <div class="footer-item" *ngIf="balance.lastAccrualDate">
          <small>Последнее начисление: {{ balance.lastAccrualDate | date: 'dd.MM.yyyy' }}</small>
        </div>
        <div class="footer-item" *ngIf="balance.lastPaymentDate">
          <small>Последняя выплата: {{ balance.lastPaymentDate | date: 'dd.MM.yyyy' }}</small>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .balance-card {
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: all 0.3s;
      }

      .balance-card.negative {
        border-left: 4px solid #f44336;
      }

      .balance-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #e0e0e0;
      }

      .balance-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .balance-status {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }

      .balance-status.debt {
        background: #fff3e0;
        color: #f57c00;
      }

      .balance-status.overpaid {
        background: #e8f5e9;
        color: #388e3c;
      }

      .balance-amounts {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .amount-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
      }

      .amount-item.total {
        margin-top: 8px;
        padding-top: 16px;
        border-top: 2px solid #e0e0e0;
      }

      .amount-label {
        color: #666;
        font-size: 14px;
      }

      .amount-value {
        font-size: 18px;
        font-weight: 600;
      }

      .amount-value.accrued {
        color: #2196f3;
      }

      .amount-value.paid {
        color: #4caf50;
      }

      .amount-value.balance.positive {
        color: #f57c00;
      }

      .amount-value.balance.negative {
        color: #f44336;
      }

      .amount-item.total .amount-value {
        font-size: 24px;
      }

      .balance-footer {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .footer-item small {
        color: #999;
        font-size: 12px;
      }
    `,
  ],
})
export class EngineerBalanceCardComponent {
  @Input() balance: EngineerBalanceDto | null = null;

  getBalanceStatus(): string {
    if (!this.balance) return '';

    if (this.balance.balance > 0) {
      return 'К выплате';
    } else if (this.balance.balance < 0) {
      return 'Переплата';
    } else {
      return 'Погашено';
    }
  }
}
