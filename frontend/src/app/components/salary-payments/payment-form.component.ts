import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CreateSalaryPaymentDto,
  PaymentType,
  PaymentMethod,
} from '../../../../../shared/dtos/salary-payment.dto';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="payment-form-overlay" (click)="onCancel()">
      <div class="payment-form-modal" (click)="$event.stopPropagation()">
        <div class="form-header">
          <h2>{{ isEdit ? 'Редактировать выплату' : 'Новая выплата' }}</h2>
          <button class="btn-close" (click)="onCancel()">✕</button>
        </div>

        <form (ngSubmit)="onSubmit()" #paymentForm="ngForm">
          <div class="form-group">
            <label for="amount">Сумма *</label>
            <input
              type="number"
              id="amount"
              name="amount"
              [(ngModel)]="formData.amount"
              required
              min="0"
              step="0.01"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="type">Тип выплаты *</label>
            <select
              id="type"
              name="type"
              [(ngModel)]="formData.type"
              required
              class="form-control"
            >
              <option value="regular">Зарплата</option>
              <option value="advance">Аванс</option>
              <option value="bonus">Премия</option>
              <option value="adjustment">Корректировка</option>
            </select>
          </div>

          <div class="form-group">
            <label for="method">Способ оплаты *</label>
            <select
              id="method"
              name="method"
              [(ngModel)]="formData.method"
              required
              class="form-control"
            >
              <option value="bank_transfer">Банковский перевод</option>
              <option value="cash">Наличные</option>
              <option value="card">На карту</option>
              <option value="other">Другое</option>
            </select>
          </div>

          <div class="form-group">
            <label for="paymentDate">Дата выплаты *</label>
            <input
              type="date"
              id="paymentDate"
              name="paymentDate"
              [(ngModel)]="formData.paymentDate"
              required
              class="form-control"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="month">Месяц</label>
              <select
                id="month"
                name="month"
                [(ngModel)]="formData.month"
                class="form-control"
              >
                <option [value]="null">-</option>
                <option *ngFor="let m of months; let i = index" [value]="i + 1">
                  {{ m }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="year">Год</label>
              <input
                type="number"
                id="year"
                name="year"
                [(ngModel)]="formData.year"
                min="2020"
                [max]="currentYear + 1"
                class="form-control"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="documentNumber">Номер документа</label>
            <input
              type="text"
              id="documentNumber"
              name="documentNumber"
              [(ngModel)]="formData.documentNumber"
              class="form-control"
              placeholder="Необязательно"
            />
          </div>

          <div class="form-group">
            <label for="notes">Комментарий</label>
            <textarea
              id="notes"
              name="notes"
              [(ngModel)]="formData.notes"
              rows="3"
              class="form-control"
              placeholder="Необязательно"
            ></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="onCancel()">
              Отмена
            </button>
            <button 
              type="submit" 
              class="btn-primary" 
              [disabled]="!paymentForm.form.valid"
            >
              {{ isEdit ? 'Сохранить' : 'Создать' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .payment-form-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .payment-form-modal {
      background: white;
      border-radius: 8px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .form-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.3s;
    }

    .btn-close:hover {
      background: #f5f5f5;
      color: #333;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #555;
    }

    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      transition: border-color 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #2196f3;
    }

    .form-control:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }

    textarea.form-control {
      resize: vertical;
      font-family: inherit;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .btn-primary,
    .btn-secondary {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1976d2;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #333;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }
  `],
})
export class PaymentFormComponent implements OnInit {
  @Input() engineerId!: number;
  @Input() calculationId?: number;
  @Input() isEdit = false;
  @Output() save = new EventEmitter<CreateSalaryPaymentDto>();
  @Output() cancel = new EventEmitter<void>();

  formData: CreateSalaryPaymentDto = {
    engineerId: 0,
    amount: 0,
    type: PaymentType.REGULAR,
    method: PaymentMethod.BANK_TRANSFER,
    paymentDate: new Date().toISOString().split('T')[0],
  };

  currentYear = new Date().getFullYear();

  months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  ngOnInit(): void {
    this.formData.engineerId = this.engineerId;
    if (this.calculationId) {
      this.formData.salaryCalculationId = this.calculationId;
    }
  }

  onSubmit(): void {
    this.save.emit(this.formData);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}

