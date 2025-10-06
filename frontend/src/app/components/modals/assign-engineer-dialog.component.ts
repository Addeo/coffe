import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { OrdersService } from '../../services/orders.service';
import { UsersService } from '../../services/users.service';
import { ToastService } from '../../services/toast.service';
import { OrderDto, AssignEngineerDto } from '../../../../../shared/dtos/order.dto';
import { UserDto } from '../../../../../shared/dtos/user.dto';
import { UserRole } from '../../../../../shared/interfaces/user.interface';

export interface AssignEngineerDialogData {
  order: OrderDto;
}

@Component({
  selector: 'app-assign-engineer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  template: `
    <div class="assign-engineer-dialog">
      <h2 mat-dialog-title>Назначить инженера на заказ</h2>

      <mat-dialog-content>
        <mat-card class="order-info">
          <mat-card-content>
            <h3>{{ data.order.title }}</h3>
            <p><strong>Организация:</strong> {{ getOrganizationName(data.order) }}</p>
            <p><strong>Статус:</strong> {{ getStatusText(data.order.status) }}</p>
            <p *ngIf="data.order.assignedEngineerId">
              <strong>Текущий инженер:</strong> {{ getCurrentEngineerName() }}
            </p>
          </mat-card-content>
        </mat-card>

        <form [formGroup]="assignForm" class="assign-form">
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Выберите инженера</mat-label>
            <mat-select formControlName="engineerId" placeholder="Выберите инженера для назначения">
              <mat-option *ngFor="let engineer of availableEngineers" [value]="engineer.id">
                {{ engineer.firstName }} {{ engineer.lastName }} ({{ engineer.email }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="assignForm.get('engineerId')?.hasError('required')">
              Необходимо выбрать инженера
            </mat-error>
          </mat-form-field>
        </form>

        <div *ngIf="isLoading" class="loading">
          <mat-spinner diameter="30"></mat-spinner>
          <p>Назначаем инженера...</p>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Отмена</button>
        <button
          mat-raised-button
          color="primary"
          (click)="onAssign()"
          [disabled]="assignForm.invalid || isLoading"
        >
          <mat-spinner *ngIf="isLoading" diameter="20"></mat-spinner>
          <span *ngIf="!isLoading">Назначить</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .assign-engineer-dialog {
        min-width: 500px;
        max-width: 90vw;
        border-radius: 12px;
        overflow: hidden;
      }

      h2[mat-dialog-title] {
        margin: 0;
        padding: 24px 24px 16px 24px;
        font-size: 20px;
        font-weight: 500;
        color: #1976d2;
        border-bottom: 1px solid #e0e0e0;
      }

      .order-info {
        margin-bottom: 24px;
        background-color: #f5f5f5 !important;
      }

      .order-info mat-card-content {
        padding: 16px !important;
      }

      .order-info h3 {
        margin: 0 0 12px 0;
        color: #1976d2;
        font-size: 18px;
        font-weight: 500;
      }

      .order-info p {
        margin: 4px 0;
        color: #424242;
        font-size: 14px;
      }

      .assign-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .form-field {
        width: 100%;
      }

      mat-dialog-content {
        padding: 24px !important;
      }

      mat-dialog-actions {
        padding: 16px 24px 24px 24px;
        margin: 0;
        border-top: 1px solid #e0e0e0;
        justify-content: flex-end;
        gap: 12px;
      }

      button {
        min-width: 100px;
        border-radius: 8px;
        text-transform: uppercase;
        font-weight: 500;
        letter-spacing: 0.5px;
      }

      button[color='primary'] {
        background-color: #1976d2;
        color: white;
      }

      button[color='primary']:disabled {
        background-color: #ccc;
        color: #666;
      }

      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        gap: 12px;
        color: #666;
      }

      .loading p {
        margin: 0;
        font-size: 14px;
      }

      .mat-mdc-form-field {
        margin-bottom: 0;
      }

      .mat-mdc-form-field-outline {
        border-radius: 8px;
      }

      .mdc-text-field--outlined .mdc-notched-outline__leading,
      .mdc-text-field--outlined .mdc-notched-outline__notch,
      .mdc-text-field--outlined .mdc-notched-outline__trailing {
        border-radius: 8px;
      }

      mat-error {
        font-size: 12px;
        margin-top: 4px;
      }

      /* Responsive design */
      @media (max-width: 600px) {
        .assign-engineer-dialog {
          min-width: 95vw;
          margin: 16px;
        }

        mat-dialog-content {
          padding: 16px !important;
        }

        h2[mat-dialog-title] {
          padding: 20px 16px 12px 16px;
          font-size: 18px;
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
export class AssignEngineerDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AssignEngineerDialogComponent>);
  private ordersService = inject(OrdersService);
  private usersService = inject(UsersService);
  private toastService = inject(ToastService);

  data: AssignEngineerDialogData = inject(MAT_DIALOG_DATA);

  availableEngineers: UserDto[] = [];
  isLoading = false;

  assignForm: FormGroup = this.fb.group({
    engineerId: ['', [Validators.required]],
  });

  ngOnInit() {
    this.loadAvailableEngineers();
  }

  private loadAvailableEngineers() {
    this.usersService.getUsers().subscribe({
      next: (response: any) => {
        // Filter only active engineers (users with role USER)
        this.availableEngineers = response.data.filter(
          (user: UserDto) => user.role === UserRole.USER && user.isActive
        );
      },
      error: (error: any) => {
        console.error('Error loading engineers:', error);
        this.toastService.error('Ошибка при загрузке списка инженеров');
      },
    });
  }

  onAssign() {
    if (this.assignForm.invalid) {
      return;
    }

    const formValue = this.assignForm.value;
    const assignData: AssignEngineerDto = {
      engineerId: formValue.engineerId,
    };

    this.isLoading = true;

    this.ordersService.assignEngineer(this.data.order.id, assignData).subscribe({
      next: (updatedOrder: OrderDto) => {
        this.toastService.success('Инженер успешно назначен на заказ');
        this.dialogRef.close(updatedOrder);
      },
      error: (error: any) => {
        console.error('Error assigning engineer:', error);
        this.toastService.error('Ошибка при назначении инженера');
        this.isLoading = false;
      },
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  getOrganizationName(order: OrderDto): string {
    // For now, just return the ID. In a real app, you'd have organization names
    return `Организация ${order.organizationId}`;
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      waiting: 'Ожидает',
      processing: 'В обработке',
      completed: 'Завершен',
      cancelled: 'Отменен',
    };
    return statusMap[status] || status;
  }

  getCurrentEngineerName(): string {
    if (!this.data.order.assignedEngineerId) {
      return 'Не назначен';
    }

    // Find the engineer name from available engineers
    const engineer = this.availableEngineers.find(e => e.id === this.data.order.assignedEngineerId);
    if (engineer) {
      return `${engineer.firstName} ${engineer.lastName}`;
    }

    return `Инженер ${this.data.order.assignedEngineerId}`;
  }
}
