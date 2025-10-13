import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SalaryPaymentService } from '../../services/salary-payment.service';
import { EngineerBalanceCardComponent } from './engineer-balance-card.component';
import { PaymentListComponent } from './payment-list.component';
import { PaymentFormComponent } from './payment-form.component';
import {
  EngineerBalanceDetailDto,
  SalaryPaymentDto,
  CreateSalaryPaymentDto,
} from '../../../../../shared/dtos/salary-payment.dto';

@Component({
  selector: 'app-engineer-payments-page',
  standalone: true,
  imports: [
    CommonModule,
    EngineerBalanceCardComponent,
    PaymentListComponent,
    PaymentFormComponent,
  ],
  template: `
    <div class="payments-page">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">← Назад</button>
        <h1>Выплаты инженера</h1>
      </div>

      <div class="page-content" *ngIf="balanceDetail()">
        <div class="balance-section">
          <app-engineer-balance-card [balance]="balanceDetail()!"></app-engineer-balance-card>
        </div>

        <div class="calculations-section" *ngIf="balanceDetail()!.recentCalculations.length > 0">
          <div class="section-card">
            <h3>Начисления</h3>
            <div class="calculations-list">
              <div class="calculation-item" *ngFor="let calc of balanceDetail()!.recentCalculations">
                <div class="calc-info">
                  <span class="calc-period">{{ getMonthName(calc.month) }} {{ calc.year }}</span>
                  <span class="calc-status" [class]="calc.status">{{ getStatusLabel(calc.status) }}</span>
                </div>
                <div class="calc-amounts">
                  <div class="calc-amount-row">
                    <span>Начислено:</span>
                    <strong>{{ calc.totalAmount | number: '1.2-2' }} ₽</strong>
                  </div>
                  <div class="calc-amount-row">
                    <span>Выплачено:</span>
                    <strong class="paid">{{ calc.paidAmount | number: '1.2-2' }} ₽</strong>
                  </div>
                  <div class="calc-amount-row" *ngIf="calc.remainingAmount > 0">
                    <span>Осталось:</span>
                    <strong class="remaining">{{ calc.remainingAmount | number: '1.2-2' }} ₽</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="payments-section">
          <app-payment-list
            [payments]="balanceDetail()!.recentPayments"
            (addPayment)="showPaymentForm()"
            (editPayment)="editPayment($event)"
            (deletePayment)="deletePayment($event)"
          ></app-payment-list>
        </div>
      </div>

      <div class="loading" *ngIf="!balanceDetail()">
        <p>Загрузка...</p>
      </div>

      <app-payment-form
        *ngIf="isFormVisible()"
        [engineerId]="engineerId()"
        [isEdit]="isEditMode()"
        (save)="savePayment($event)"
        (cancel)="hidePaymentForm()"
      ></app-payment-form>
    </div>
  `,
  styles: [`
    .payments-page {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .btn-back {
      padding: 8px 16px;
      background: #f5f5f5;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }

    .btn-back:hover {
      background: #e0e0e0;
    }

    .page-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }

    .page-content {
      display: grid;
      gap: 24px;
    }

    .section-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .section-card h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .calculations-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .calculation-item {
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .calc-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .calc-period {
      font-weight: 600;
      color: #333;
    }

    .calc-status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .calc-status.calculated {
      background: #e3f2fd;
      color: #1976d2;
    }

    .calc-status.paid {
      background: #e8f5e9;
      color: #388e3c;
    }

    .calc-amounts {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .calc-amount-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }

    .calc-amount-row strong.paid {
      color: #4caf50;
    }

    .calc-amount-row strong.remaining {
      color: #f57c00;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    @media (min-width: 768px) {
      .page-content {
        grid-template-columns: 1fr 1fr;
      }

      .payments-section {
        grid-column: 1 / -1;
      }
    }
  `],
})
export class EngineerPaymentsPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salaryPaymentService = inject(SalaryPaymentService);

  engineerId = signal<number>(0);
  balanceDetail = signal<EngineerBalanceDetailDto | null>(null);
  isFormVisible = signal<boolean>(false);
  isEditMode = signal<boolean>(false);

  months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.engineerId.set(parseInt(id, 10));
      this.loadBalanceDetail();
    }
  }

  loadBalanceDetail(): void {
    this.salaryPaymentService.getEngineerBalanceDetail(this.engineerId()).subscribe({
      next: (detail) => {
        this.balanceDetail.set(detail);
      },
      error: (error) => {
        console.error('Error loading balance detail:', error);
        alert('Ошибка загрузки данных');
      },
    });
  }

  showPaymentForm(): void {
    this.isEditMode.set(false);
    this.isFormVisible.set(true);
  }

  hidePaymentForm(): void {
    this.isFormVisible.set(false);
  }

  savePayment(payment: CreateSalaryPaymentDto): void {
    this.salaryPaymentService.createPayment(payment).subscribe({
      next: () => {
        this.hidePaymentForm();
        this.loadBalanceDetail();
        alert('Выплата успешно создана');
      },
      error: (error) => {
        console.error('Error creating payment:', error);
        alert('Ошибка при создании выплаты');
      },
    });
  }

  editPayment(payment: SalaryPaymentDto): void {
    // TODO: Implement edit functionality
    console.log('Edit payment:', payment);
  }

  deletePayment(payment: SalaryPaymentDto): void {
    this.salaryPaymentService.deletePayment(payment.id).subscribe({
      next: () => {
        this.loadBalanceDetail();
        alert('Выплата удалена');
      },
      error: (error) => {
        console.error('Error deleting payment:', error);
        alert('Ошибка при удалении выплаты');
      },
    });
  }

  getMonthName(month: number): string {
    return this.months[month - 1] || '';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      draft: 'Черновик',
      calculated: 'Рассчитано',
      approved: 'Утверждено',
      paid: 'Оплачено',
    };
    return labels[status] || status;
  }

  goBack(): void {
    this.router.navigate(['/salary-calculations']);
  }
}

