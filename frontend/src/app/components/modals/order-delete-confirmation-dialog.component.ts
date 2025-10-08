import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrdersService } from '../../services/orders.service';
import { ToastService } from '../../services/toast.service';
import { OrderDto } from '@shared/dtos/order.dto';
import { OrderStatusLabel } from '@shared/interfaces/order.interface';

export interface OrderDeleteConfirmationData {
  order: OrderDto;
  title?: string;
  message?: string;
}

@Component({
  selector: 'app-order-delete-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="delete-dialog">
      <div class="delete-header">
        <mat-icon color="warn">warning</mat-icon>
        <h2 mat-dialog-title>{{ data.title || 'Удалить заказ' }}</h2>
      </div>

      <mat-dialog-content>
        <p class="delete-message">
          {{ data.message || 'Вы уверены, что хотите удалить этот заказ?' }}
        </p>
        <div class="order-info" *ngIf="data.order">
          <strong>{{ data.order.title }}</strong
          ><br />
          <small>{{ data.order.location }}</small
          ><br />
          <small class="text-muted">Организация: {{ data.order.organization?.name }}</small
          ><br />
          <small class="text-muted">Статус: {{ getStatusDisplay(data.order.status) }}</small>
        </div>
        <div class="warning-box">
          <mat-icon>warning</mat-icon>
          <div>
            <p class="warning-text">
              <strong>Внимание!</strong> Это действие нельзя отменить.
            </p>
            <p class="warning-text" *ngIf="data.order && data.order.status !== 'waiting'">
              При удалении заказа будут также удалены все связанные данные:
            </p>
            <ul class="cascade-list" *ngIf="data.order && data.order.status !== 'waiting'">
              <li>Отчеты о выполненной работе</li>
              <li>Логи активности</li>
              <li>Прикрепленные файлы</li>
            </ul>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Отмена</button>
        <button
          mat-raised-button
          color="warn"
          (click)="onConfirm()"
          [disabled]="isLoading()"
        >
          <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
          <span *ngIf="!isLoading()">Удалить</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .delete-dialog {
        max-width: 450px;
        border-radius: 12px;
        overflow: hidden;
      }

      .delete-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        padding: 24px 24px 0 24px;
      }

      .delete-header mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .delete-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
        color: #d32f2f;
      }

      .delete-message {
        margin: 0 0 16px 0;
        line-height: 1.5;
        padding: 0 24px;
      }

      .order-info {
        background: #f5f5f5;
        padding: 16px;
        border-radius: 8px;
        margin: 0 24px 16px 24px;
        border-left: 4px solid #d32f2f;
      }

      .order-info strong {
        color: #333;
        font-size: 16px;
      }

      .order-info small {
        color: #666;
        display: block;
        margin-top: 4px;
      }

      .warning-box {
        display: flex;
        gap: 12px;
        background: #fff3e0;
        border-left: 4px solid #ff9800;
        border-radius: 4px;
        padding: 16px;
        margin: 0 24px 16px 24px;
      }

      .warning-box mat-icon {
        color: #ff9800;
        font-size: 24px;
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .warning-text {
        color: #e65100;
        font-weight: 500;
        margin: 0 0 8px 0;
        font-size: 14px;
        line-height: 1.5;
      }

      .warning-text:last-child {
        margin-bottom: 0;
      }

      .cascade-list {
        margin: 8px 0 0 0;
        padding-left: 20px;
        color: #666;
        font-size: 14px;
      }

      .cascade-list li {
        margin-bottom: 4px;
      }

      mat-dialog-content {
        padding: 0 !important;
      }

      mat-dialog-actions {
        padding: 16px 24px 24px 24px;
        margin: 0;
        border-top: 1px solid #e0e0e0;
        justify-content: flex-end;
        gap: 12px;
      }

      button {
        min-width: 80px;
        border-radius: 8px;
        text-transform: uppercase;
        font-weight: 500;
        letter-spacing: 0.5px;
      }

      /* Responsive design */
      @media (max-width: 600px) {
        .delete-dialog {
          margin: 16px;
          max-width: calc(100vw - 32px);
        }

        .delete-header {
          padding: 20px 16px 0 16px;
        }

        .delete-header h2 {
          font-size: 20px;
        }

        .delete-message {
          padding: 0 16px;
        }

        .order-info {
          margin: 0 16px 16px 16px;
          padding: 12px;
        }

        .warning-text {
          padding: 0 16px;
          margin: 0 16px 0 0;
        }

        mat-dialog-actions {
          padding: 12px 16px 20px 16px;
          flex-direction: column;
          gap: 8px;
        }

        button {
          width: 100%;
          min-width: unset;
        }
      }
    `,
  ],
})
export class OrderDeleteConfirmationDialogComponent {
  private dialogRef = inject(MatDialogRef<OrderDeleteConfirmationDialogComponent>);
  private ordersService = inject(OrdersService);
  private toastService = inject(ToastService);

  data: OrderDeleteConfirmationData = inject(MAT_DIALOG_DATA);
  isLoading = signal(false);
  OrderStatusLabel = OrderStatusLabel;

  getStatusDisplay(status: string): string {
    switch (status) {
      case 'waiting':
        return OrderStatusLabel.WAITING;
      case 'processing':
        return OrderStatusLabel.PROCESSING;
      case 'working':
        return OrderStatusLabel.WORKING;
      case 'review':
        return OrderStatusLabel.REVIEW;
      case 'completed':
        return OrderStatusLabel.COMPLETED;
      default:
        return status;
    }
  }

  onConfirm() {
    if (!this.data.order) {
      return;
    }

    this.isLoading.set(true);

    this.ordersService.deleteOrder(this.data.order.id).subscribe({
      next: () => {
        this.toastService.success('Заказ успешно удален');
        this.dialogRef.close(true);
      },
      error: error => {
        console.error('Error deleting order:', error);
        this.toastService.error('Ошибка удаления заказа. Попробуйте еще раз.');
        this.isLoading.set(false);
      },
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
