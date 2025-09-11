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
  user: UserDto;
  title?: string;
  message?: string;
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
        <button mat-button (click)="onCancel()">Отмена</button>
        <button mat-raised-button color="warn" (click)="onConfirm()" [disabled]="isLoading()">
          <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
          <span *ngIf="!isLoading()">Удалить</span>
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
    if (!this.data.user) return;

    this.isLoading.set(true);

    this.usersService.deleteUser(this.data.user.id).subscribe({
      next: () => {
        this.toastService.success('User deleted successfully');
        this.dialogRef.close(true);
      },
      error: error => {
        console.error('Error deleting user:', error);
        this.toastService.error('Error deleting user. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
