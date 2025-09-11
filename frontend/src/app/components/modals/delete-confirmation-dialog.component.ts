import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsersService } from '../../services/users.service';
import { ToastService } from '../../services/toast.service';
import { UserDto } from '@shared/dtos/user.dto';

export interface DeleteConfirmationData {
  user?: UserDto;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-delete-confirmation-dialog',
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
        <h2 mat-dialog-title>{{ data.title || 'Подтвердить удаление' }}</h2>
      </div>

      <mat-dialog-content>
        <p class="delete-message">
          {{ data.message || 'Вы уверены, что хотите удалить этого пользователя?' }}
        </p>
        <div class="user-info" *ngIf="data.user">
          <strong>{{ data.user.firstName }} {{ data.user.lastName }}</strong
          ><br />
          <small>{{ data.user.email }}</small>
        </div>
        <p class="warning-text">Это действие нельзя отменить.</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">{{ data.cancelText || 'Отмена' }}</button>
        <button mat-raised-button color="warn" (click)="onConfirm()" [disabled]="isLoading()">
          <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
          <span *ngIf="!isLoading()">{{ data.confirmText || 'Удалить' }}</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .delete-dialog {
        max-width: 400px;
      }

      .delete-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .delete-header mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .delete-message {
        margin: 0 0 16px 0;
        line-height: 1.5;
      }

      .user-info {
        background: #f5f5f5;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 16px;
      }

      .user-info strong {
        color: #333;
      }

      .user-info small {
        color: #666;
      }

      .warning-text {
        color: #d32f2f;
        font-weight: 500;
        margin: 0;
      }

      mat-dialog-actions {
        padding: 16px 0 0 0;
      }

      button {
        min-width: 80px;
      }
    `,
  ],
})
export class DeleteConfirmationDialogComponent {
  private dialogRef = inject(MatDialogRef<DeleteConfirmationDialogComponent>);
  private usersService = inject(UsersService);
  private toastService = inject(ToastService);

  data: DeleteConfirmationData = inject(MAT_DIALOG_DATA);
  isLoading = signal(false);

  onConfirm() {
    console.log('🗑️ Dialog onConfirm called with data:', this.data);

    // Если есть пользователь и включена автоматическая обработка
    if (this.data.user && this.shouldAutoDelete()) {
      console.log('🗑️ Auto-deleting user:', this.data.user.id);
      this.isLoading.set(true);
      this.usersService.deleteUser(this.data.user.id).subscribe({
        next: () => {
          this.toastService.showSuccess('User deleted successfully');
          this.dialogRef.close(true);
        },
        error: error => {
          console.error('Error deleting user:', error);
          this.toastService.showError('Error deleting user. Please try again.');
          this.isLoading.set(false);
        },
      });
    } else {
      console.log('🗑️ Returning confirmation (no auto-delete)');
      // Просто возвращаем подтверждение
      this.dialogRef.close(true);
    }
  }

  onCancel() {
    console.log('🗑️ Dialog onCancel called');
    this.dialogRef.close(false);
  }

  private shouldAutoDelete(): boolean {
    // Для совместимости с существующими вызовами пользователей
    return !!this.data.user;
  }
}
