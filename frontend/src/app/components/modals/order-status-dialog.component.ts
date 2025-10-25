import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { OrderDto } from '@shared/dtos/order.dto';
import { OrderStatus, OrderStatusLabel } from '@shared/interfaces/order.interface';

export interface OrderStatusDialogData {
  order: OrderDto;
  availableStatuses: OrderStatus[];
}

@Component({
  selector: 'app-order-status-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatCardModule,
  ],
  template: `
    <mat-card class="status-dialog-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>swap_vert</mat-icon>
          Изменить статус заказа
        </mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <div class="order-info">
          <h3>{{ data.order.title }}</h3>
          <p><strong>Текущий статус:</strong> {{ getStatusDisplay(data.order.status) }}</p>
        </div>

        <mat-form-field appearance="outline" class="status-select">
          <mat-label>Новый статус</mat-label>
          <mat-select [(ngModel)]="selectedStatus">
            <mat-option
              *ngFor="let status of data.availableStatuses"
              [value]="status"
              [disabled]="status === data.order.status"
            >
              <mat-icon [color]="getStatusColor(status)">{{ getStatusIcon(status) }}</mat-icon>
              {{ getStatusDisplay(status) }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </mat-card-content>

      <mat-card-actions align="end">
        <button mat-button (click)="onCancel()">
          <mat-icon>cancel</mat-icon>
          Отмена
        </button>
        <button
          mat-raised-button
          color="primary"
          (click)="onConfirm()"
          [disabled]="!selectedStatus() || selectedStatus() === data.order.status"
        >
          <mat-icon>check</mat-icon>
          Изменить
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      .status-dialog-card {
        min-width: 400px;
        max-width: 500px;
      }

      .order-info {
        margin-bottom: 20px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 8px;
      }

      .order-info h3 {
        margin: 0 0 8px 0;
        color: #333;
      }

      .order-info p {
        margin: 0;
        color: #666;
      }

      .status-select {
        width: 100%;
      }

      mat-card-actions {
        padding: 16px;
      }

      mat-card-actions button {
        margin-left: 8px;
      }
    `,
  ],
})
export class OrderStatusDialogComponent {
  private dialogRef = inject(MatDialogRef<OrderStatusDialogComponent>);
  data = inject<OrderStatusDialogData>(MAT_DIALOG_DATA);

  selectedStatus = signal<OrderStatus | null>(null);

  getStatusDisplay(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.WAITING:
        return OrderStatusLabel.WAITING;
      case OrderStatus.ASSIGNED:
        return OrderStatusLabel.ASSIGNED;
      case OrderStatus.PROCESSING:
        return OrderStatusLabel.PROCESSING;
      case OrderStatus.WORKING:
        return OrderStatusLabel.WORKING;
      case OrderStatus.REVIEW:
        return OrderStatusLabel.REVIEW;
      case OrderStatus.COMPLETED:
        return OrderStatusLabel.COMPLETED;
      default:
        return status;
    }
  }

  getStatusColor(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.COMPLETED:
        return 'primary';
      case OrderStatus.WORKING:
        return 'accent';
      case OrderStatus.ASSIGNED:
        return 'warn';
      case OrderStatus.PROCESSING:
        return 'accent';
      case OrderStatus.REVIEW:
        return 'warn';
      case OrderStatus.WAITING:
        return 'basic';
      default:
        return 'basic';
    }
  }

  getStatusIcon(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.WAITING:
        return 'schedule';
      case OrderStatus.ASSIGNED:
        return 'assignment_ind';
      case OrderStatus.PROCESSING:
        return 'person_add';
      case OrderStatus.WORKING:
        return 'build';
      case OrderStatus.REVIEW:
        return 'visibility';
      case OrderStatus.COMPLETED:
        return 'check_circle';
      default:
        return 'help';
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    if (this.selectedStatus()) {
      this.dialogRef.close(this.selectedStatus());
    }
  }
}
