import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

import { OrdersService } from '../../services/orders.service';
import { OrderDto } from '@shared/dtos/order.dto';

interface OrderFinancialData {
  orderId: number;
  orderTitle: string;
  organizationName: string;
  organizationRate: number;
  organizationTariff: number;
  engineerRate: number;
  engineerTariff: number;
  hoursInAct: number;
  accountedHours: number;
  organizationPayment: number;
  engineerPayment: number;
  profit: number;
}

interface FinancialSummary {
  totalAccountedHours: number;
  totalEngineerPayment: number;
  totalOrganizationPayment: number;
  totalProfit: number;
}

@Component({
  selector: 'app-order-financial-details',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
  ],
  template: `
    <div class="financial-details-container">
      <mat-card class="financial-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>account_balance</mat-icon>
            Финансовые детали по заявкам
          </mat-card-title>
          <mat-card-subtitle>
            Детальная разбивка доходов и расходов по каждой заявке
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <!-- Loading State -->
          <div class="loading-container" *ngIf="isLoading()">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Загрузка финансовых данных...</p>
          </div>

          <!-- Financial Data Table -->
          <div class="table-container" *ngIf="!isLoading() && financialData().length > 0">
            <table mat-table [dataSource]="financialData()" class="financial-table">
              <!-- Order Info -->
              <ng-container matColumnDef="orderInfo">
                <th mat-header-cell *matHeaderCellDef>Заявка</th>
                <td mat-cell *matCellDef="let element">
                  <div class="order-info">
                    <div class="order-title">{{ element.orderTitle }}</div>
                    <div class="order-organization">{{ element.organizationName }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Organization Rate -->
              <ng-container matColumnDef="organizationRate">
                <th mat-header-cell *matHeaderCellDef>Ставка организации (₽/час)</th>
                <td mat-cell *matCellDef="let element">
                  <div class="rate-info">
                    <div class="rate-value">{{ element.organizationRate | currency:'RUB':'symbol':'1.0-0' }}</div>
                    <div class="rate-tariff">Тариф: {{ element.organizationTariff | currency:'RUB':'symbol':'1.0-0' }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Engineer Rate -->
              <ng-container matColumnDef="engineerRate">
                <th mat-header-cell *matHeaderCellDef>Ставка инженера (₽/час)</th>
                <td mat-cell *matCellDef="let element">
                  <div class="rate-info">
                    <div class="rate-value">{{ element.engineerRate | currency:'RUB':'symbol':'1.0-0' }}</div>
                    <div class="rate-tariff">Тариф: {{ element.engineerTariff | currency:'RUB':'symbol':'1.0-0' }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Hours -->
              <ng-container matColumnDef="hours">
                <th mat-header-cell *matHeaderCellDef>Часы</th>
                <td mat-cell *matCellDef="let element">
                  <div class="hours-info">
                    <div class="hours-act">В акте: {{ element.hoursInAct }}</div>
                    <div class="hours-accounted">Учтено: {{ element.accountedHours }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Payments -->
              <ng-container matColumnDef="payments">
                <th mat-header-cell *matHeaderCellDef>Оплаты</th>
                <td mat-cell *matCellDef="let element">
                  <div class="payments-info">
                    <div class="payment-org">От организации: {{ element.organizationPayment | currency:'RUB':'symbol':'1.0-0' }}</div>
                    <div class="payment-engineer">Инженеру: {{ element.engineerPayment | currency:'RUB':'symbol':'1.0-0' }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Profit -->
              <ng-container matColumnDef="profit">
                <th mat-header-cell *matHeaderCellDef>ДОХОД</th>
                <td mat-cell *matCellDef="let element">
                  <div class="profit-info" [class.profit-positive]="element.profit > 0" [class.profit-negative]="element.profit < 0">
                    {{ element.profit | currency:'RUB':'symbol':'1.0-0' }}
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <!-- Summary Section -->
          <div class="summary-section" *ngIf="!isLoading() && financialData().length > 0">
            <mat-divider></mat-divider>
            
            <div class="summary-title">
              <mat-icon>summarize</mat-icon>
              <h3>Итоговая сводка</h3>
            </div>

            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-icon">
                  <mat-icon>schedule</mat-icon>
                </div>
                <div class="summary-content">
                  <div class="summary-label">Итого учтенных часов</div>
                  <div class="summary-value">{{ summary().totalAccountedHours }}</div>
                </div>
              </div>

              <div class="summary-card">
                <div class="summary-icon">
                  <mat-icon>account_balance_wallet</mat-icon>
                </div>
                <div class="summary-content">
                  <div class="summary-label">Итого оплата инженера</div>
                  <div class="summary-value">{{ summary().totalEngineerPayment | currency:'RUB':'symbol':'1.0-0' }}</div>
                </div>
              </div>

              <div class="summary-card">
                <div class="summary-icon">
                  <mat-icon>business</mat-icon>
                </div>
                <div class="summary-content">
                  <div class="summary-label">Итого оплата от организаций</div>
                  <div class="summary-value">{{ summary().totalOrganizationPayment | currency:'RUB':'symbol':'1.0-0' }}</div>
                </div>
              </div>

              <div class="summary-card profit-card">
                <div class="summary-icon">
                  <mat-icon>trending_up</mat-icon>
                </div>
                <div class="summary-content">
                  <div class="summary-label">Итого ДОХОД</div>
                  <div class="summary-value" [class.profit-positive]="summary().totalProfit > 0" [class.profit-negative]="summary().totalProfit < 0">
                    {{ summary().totalProfit | currency:'RUB':'symbol':'1.0-0' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No Data Message -->
          <div class="no-data" *ngIf="!isLoading() && financialData().length === 0">
            <mat-icon>assignment</mat-icon>
            <h3>Нет данных</h3>
            <p>Финансовые данные по заявкам не найдены</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .financial-details-container {
      width: 100%;
    }

    .financial-card {
      margin: 0;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .financial-card mat-card-header {
      background: linear-gradient(135deg, #1976d2, #1565c0);
      color: white;
      margin: -24px -24px 24px -24px;
      padding: 24px;
    }

    .financial-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .financial-card mat-card-title mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .financial-card mat-card-subtitle {
      color: rgba(255,255,255,0.8);
      margin: 8px 0 0 0;
      font-size: 14px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #666;
    }

    .table-container {
      overflow-x: auto;
      margin-bottom: 24px;
    }

    .financial-table {
      width: 100%;
      min-width: 800px;
    }

    .financial-table th {
      background-color: #f5f5f5;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      padding: 12px 8px;
    }

    .financial-table td {
      padding: 12px 8px;
      border-bottom: 1px solid #e0e0e0;
    }

    .order-info {
      min-width: 150px;
    }

    .order-title {
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
    }

    .order-organization {
      font-size: 12px;
      color: #666;
    }

    .rate-info, .hours-info, .payments-info {
      min-width: 120px;
    }

    .rate-value, .hours-act, .payment-org {
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
    }

    .rate-tariff, .hours-accounted, .payment-engineer {
      font-size: 12px;
      color: #666;
    }

    .profit-info {
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      padding: 8px;
      border-radius: 4px;
    }

    .profit-positive {
      color: #4caf50;
      background-color: #e8f5e9;
    }

    .profit-negative {
      color: #f44336;
      background-color: #ffebee;
    }

    .summary-section {
      margin-top: 24px;
    }

    .summary-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0 16px 0;
    }

    .summary-title h3 {
      margin: 0;
      color: #1976d2;
      font-size: 18px;
      font-weight: 500;
    }

    .summary-title mat-icon {
      color: #1976d2;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .summary-card {
      display: flex;
      align-items: center;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #1976d2;
    }

    .summary-card.profit-card {
      border-left-color: #4caf50;
      background: #e8f5e9;
    }

    .summary-icon {
      margin-right: 12px;
    }

    .summary-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #1976d2;
    }

    .profit-card .summary-icon mat-icon {
      color: #4caf50;
    }

    .summary-content {
      flex: 1;
    }

    .summary-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-value {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .profit-card .summary-value {
      font-size: 18px;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #666;
      text-align: center;
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .no-data h3 {
      margin: 0 0 8px 0;
      color: #999;
    }

    .no-data p {
      margin: 0;
      color: #999;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }

      .financial-table {
        font-size: 12px;
      }

      .financial-table th,
      .financial-table td {
        padding: 8px 4px;
      }
    }
  `]
})
export class OrderFinancialDetailsComponent implements OnInit {
  private ordersService = inject(OrdersService);

  @Input() year: number = new Date().getFullYear();
  @Input() month: number = new Date().getMonth() + 1;

  isLoading = signal(false);
  financialData = signal<OrderFinancialData[]>([]);
  summary = signal<FinancialSummary>({
    totalAccountedHours: 0,
    totalEngineerPayment: 0,
    totalOrganizationPayment: 0,
    totalProfit: 0,
  });

  displayedColumns: string[] = [
    'orderInfo',
    'organizationRate',
    'engineerRate',
    'hours',
    'payments',
    'profit',
  ];

  ngOnInit() {
    this.loadFinancialData();
  }

  loadFinancialData() {
    this.isLoading.set(true);
    
    // TODO: Implement API call to get financial data
    // For now, using mock data
    const mockData: OrderFinancialData[] = [
      {
        orderId: 1,
        orderTitle: 'Ремонт сервера',
        organizationName: 'ООО ТехСервис',
        organizationRate: 1500,
        organizationTariff: 1500,
        engineerRate: 800,
        engineerTariff: 800,
        hoursInAct: 8,
        accountedHours: 8,
        organizationPayment: 12000,
        engineerPayment: 6400,
        profit: 5600,
      },
      {
        orderId: 2,
        orderTitle: 'Настройка сети',
        organizationName: 'ИП Иванов',
        organizationRate: 1200,
        organizationTariff: 1200,
        engineerRate: 700,
        engineerTariff: 700,
        hoursInAct: 6,
        accountedHours: 6,
        organizationPayment: 7200,
        engineerPayment: 4200,
        profit: 3000,
      },
    ];

    this.financialData.set(mockData);
    this.calculateSummary();
    this.isLoading.set(false);
  }

  private calculateSummary() {
    const data = this.financialData();
    const summary: FinancialSummary = {
      totalAccountedHours: data.reduce((sum, item) => sum + item.accountedHours, 0),
      totalEngineerPayment: data.reduce((sum, item) => sum + item.engineerPayment, 0),
      totalOrganizationPayment: data.reduce((sum, item) => sum + item.organizationPayment, 0),
      totalProfit: data.reduce((sum, item) => sum + item.profit, 0),
    };
    this.summary.set(summary);
  }
}
