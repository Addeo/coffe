import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { EngineerOrganizationRatesService } from '../../../services/engineer-organization-rates.service';
import { UsersService } from '../../../services/users.service';
import { OrganizationsService } from '../../../services/organizations.service';
import { ToastService } from '../../../services/toast.service';
import {
  EngineerOrganizationRateDto,
  CreateEngineerOrganizationRateDto,
  UpdateEngineerOrganizationRateDto,
} from '@shared/dtos/engineer-organization-rate.dto';
import { UserDto } from '@shared/dtos/user.dto';
import { OrganizationDto } from '@shared/dtos/organization.dto';
import { UserRole } from '@shared/interfaces/user.interface';

export interface EngineerRateDialogData {
  rate?: EngineerOrganizationRateDto;
  isEdit?: boolean;
}

@Component({
  selector: 'app-engineer-rate-dialog',
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
    MatSlideToggleModule,
    MatTabsModule,
  ],
  template: `
    <div class="engineer-rate-dialog">
      <h2 mat-dialog-title>
        {{ data.isEdit ? 'Редактировать ставки инженера' : 'Создать конфигурацию ставок' }}
      </h2>

      <mat-dialog-content>
        <form [formGroup]="rateForm" class="rate-form">
          <!-- Engineer and Organization Selection (only for create) -->
          <div *ngIf="!data.isEdit" class="selection-section">
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Инженер</mat-label>
                <mat-select formControlName="engineerId" required>
                  <mat-option *ngFor="let engineer of engineers()" [value]="engineer.id">
                    {{ engineer.firstName }} {{ engineer.lastName }}
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="rateForm.get('engineerId')?.hasError('required')">
                  Выберите инженера
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Организация</mat-label>
                <mat-select formControlName="organizationId" required>
                  <mat-option *ngFor="let org of organizations()" [value]="org.id">
                    {{ org.name }}
                  </mat-option>
                </mat-select>
                <mat-error *ngIf="rateForm.get('organizationId')?.hasError('required')">
                  Выберите организацию
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Display info for edit mode -->
          <div *ngIf="data.isEdit && data.rate" class="info-section">
            <div class="info-item">
              <strong>Инженер:</strong> {{ getEngineerName(data.rate.engineerId) }}
            </div>
            <div class="info-item">
              <strong>Организация:</strong> {{ data.rate.organizationName }}
            </div>
          </div>

          <!-- Rates Table -->
          <div class="rates-table-container">
            <table class="rates-table">
              <thead>
                <tr>
                  <th>Тип ставки</th>
                  <th>Значение (руб)</th>
                  <th>Описание</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="rate-label">Базовая ставка</td>
                  <td class="rate-input">
                    <mat-form-field appearance="outline">
                      <input
                        matInput
                        formControlName="customBaseRate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="По умолчанию"
                      />
                    </mat-form-field>
                  </td>
                  <td class="rate-description">Базовая ставка за час работы</td>
                </tr>

                <tr>
                  <td class="rate-label">Ставка переработки</td>
                  <td class="rate-input">
                    <mat-form-field appearance="outline">
                      <input
                        matInput
                        formControlName="customOvertimeRate"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="По умолчанию"
                      />
                    </mat-form-field>
                  </td>
                  <td class="rate-description">Фиксированная ставка за переработку</td>
                </tr>

                <tr class="zone-separator">
                  <td colspan="3">
                    <div class="zone-header">
                      <mat-icon>location_on</mat-icon>
                      <span>Зональные надбавки</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td class="rate-label">Надбавка за зону 1</td>
                  <td class="rate-input">
                    <mat-form-field appearance="outline">
                      <input
                        matInput
                        formControlName="customZone1Extra"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="По умолчанию"
                      />
                    </mat-form-field>
                  </td>
                  <td class="rate-description">Дополнительная оплата за зону 1</td>
                </tr>

                <tr>
                  <td class="rate-label">Надбавка за зону 2</td>
                  <td class="rate-input">
                    <mat-form-field appearance="outline">
                      <input
                        matInput
                        formControlName="customZone2Extra"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="По умолчанию"
                      />
                    </mat-form-field>
                  </td>
                  <td class="rate-description">Дополнительная оплата за зону 2</td>
                </tr>

                <tr>
                  <td class="rate-label">Надбавка за зону 3</td>
                  <td class="rate-input">
                    <mat-form-field appearance="outline">
                      <input
                        matInput
                        formControlName="customZone3Extra"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="По умолчанию"
                      />
                    </mat-form-field>
                  </td>
                  <td class="rate-description">Дополнительная оплата за зону 3</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Active status toggle -->
          <div class="form-row status-row">
            <div class="toggle-field">
              <mat-slide-toggle formControlName="isActive">
                Активная конфигурация
              </mat-slide-toggle>
              <span class="toggle-hint">
                Отключите, чтобы временно деактивировать индивидуальные ставки
              </span>
            </div>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Отмена</button>
        <button
          mat-raised-button
          color="primary"
          (click)="onSave()"
          [disabled]="rateForm.invalid || isLoading()"
        >
          <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
          <span *ngIf="!isLoading()">{{ data.isEdit ? 'Обновить' : 'Создать' }}</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .engineer-rate-dialog {
        min-width: 700px;
        max-width: 90vw;
        border-radius: 12px;
        overflow: hidden;
      }

      h2[mat-dialog-title] {
        margin: 0;
        padding: 24px 24px 16px 24px;
        font-size: 24px;
        font-weight: 500;
        color: #1976d2;
        border-bottom: 1px solid #e0e0e0;
      }

      .rate-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 24px;
        max-height: 70vh;
        overflow-y: auto;
      }

      .selection-section,
      .info-section {
        margin-bottom: 16px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 8px;
      }

      .info-section {
        .info-item {
          margin-bottom: 8px;
          font-size: 14px;

          strong {
            color: #1976d2;
          }
        }
      }

      .rates-table-container {
        margin-top: 20px;
        overflow-x: auto;
      }

      .rates-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
      }

      .rates-table thead {
        background-color: #f5f5f5;
      }

      .rates-table th {
        padding: 16px;
        text-align: left;
        font-weight: 600;
        color: #1976d2;
        font-size: 14px;
        border-bottom: 2px solid #e0e0e0;
      }

      .rates-table tbody tr {
        transition: background-color 0.2s;
      }

      .rates-table tbody tr:not(.zone-separator):hover {
        background-color: #f9f9f9;
      }

      .rates-table tbody tr:not(:last-child):not(.zone-separator) td {
        border-bottom: 1px solid #e0e0e0;
      }

      .rates-table td {
        padding: 12px 16px;
        vertical-align: middle;
      }

      .rate-label {
        font-weight: 500;
        color: #333;
        min-width: 180px;
      }

      .rate-input {
        width: 200px;
      }

      .rate-input mat-form-field {
        width: 100%;
        margin: 0;
      }

      .rate-input .mat-mdc-form-field {
        margin-bottom: 0;
      }

      .rate-input .mat-mdc-text-field-wrapper {
        padding: 0;
      }

      .rate-description {
        color: #666;
        font-size: 13px;
      }

      .zone-separator {
        background-color: #f0f7ff !important;
      }

      .zone-separator td {
        padding: 12px 16px;
        border-top: 2px solid #e0e0e0;
        border-bottom: 2px solid #e0e0e0;
      }

      .zone-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #1976d2;
        font-weight: 600;
        font-size: 14px;
      }

      .zone-header mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .form-row {
        display: flex;
        gap: 16px;
        align-items: flex-start;

        &.status-row {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
        }
      }

      .form-field {
        flex: 1;
        min-width: 0;
      }

      .toggle-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }

      .toggle-hint {
        font-size: 12px;
        color: #666;
        margin-left: 16px;
      }

      mat-form-field {
        width: 100%;
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

      .mat-mdc-form-field {
        margin-bottom: 0;
      }

      .mat-mdc-form-field-outline {
        border-radius: 8px;
      }

      mat-error {
        font-size: 12px;
        margin-top: 4px;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .engineer-rate-dialog {
          min-width: 95vw;
          margin: 16px;
        }

        .form-row {
          flex-direction: column;
          gap: 20px;
        }

        .rate-form {
          padding: 16px;
          gap: 16px;
        }

        h2[mat-dialog-title] {
          padding: 20px 16px 12px 16px;
          font-size: 20px;
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

        .rates-table-container {
          margin-top: 16px;
        }

        .rates-table {
          font-size: 13px;
        }

        .rates-table th,
        .rates-table td {
          padding: 10px 12px;
        }

        .rate-label {
          min-width: 140px;
          font-size: 13px;
        }

        .rate-input {
          width: 150px;
        }

        .rate-description {
          font-size: 12px;
        }
      }
    `,
  ],
})
export class EngineerRateDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<EngineerRateDialogComponent>);
  private engineerRatesService = inject(EngineerOrganizationRatesService);
  private usersService = inject(UsersService);
  private organizationsService = inject(OrganizationsService);
  private toastService = inject(ToastService);

  data: EngineerRateDialogData = inject(MAT_DIALOG_DATA);
  isLoading = signal(false);

  engineers = signal<UserDto[]>([]);
  organizations = signal<OrganizationDto[]>([]);

  rateForm: FormGroup = this.fb.group({
    engineerId: [''],
    organizationId: [''],
    customBaseRate: [null, [Validators.min(0)]],
    customOvertimeRate: [null, [Validators.min(0)]],
    customZone1Extra: [null, [Validators.min(0)]],
    customZone2Extra: [null, [Validators.min(0)]],
    customZone3Extra: [null, [Validators.min(0)]],
  });

  ngOnInit() {
    this.loadEngineers();
    this.loadOrganizations();

    if (this.data.isEdit && this.data.rate) {
      this.rateForm.patchValue({
        engineerId: this.data.rate.engineerId,
        organizationId: this.data.rate.organizationId,
        customBaseRate: this.data.rate.customBaseRate,
        customOvertimeRate: this.data.rate.customOvertimeRate,
        customZone1Extra: this.data.rate.customZone1Extra,
        customZone2Extra: this.data.rate.customZone2Extra,
        customZone3Extra: this.data.rate.customZone3Extra,
      });

      // Disable selection fields in edit mode
      this.rateForm.get('engineerId')?.disable();
      this.rateForm.get('organizationId')?.disable();
    } else {
      // Set validators for create mode
      this.rateForm.get('engineerId')?.setValidators([Validators.required]);
      this.rateForm.get('organizationId')?.setValidators([Validators.required]);
    }
  }

  private loadEngineers() {
    this.usersService.getUsers().subscribe({
      next: response => {
        // Filter only users with engineer role
        this.engineers.set(response.data.filter(user => user.role === UserRole.USER));
      },
      error: error => {
        console.error('Ошибка загрузки инженеров:', error);
      },
    });
  }

  private loadOrganizations() {
    this.organizationsService.getOrganizations().subscribe({
      next: response => {
        this.organizations.set(response.data);
      },
      error: error => {
        console.error('Ошибка загрузки организаций:', error);
      },
    });
  }

  getEngineerName(engineerId: number): string {
    const engineer = this.engineers().find(e => e.id === engineerId);
    return engineer ? `${engineer.firstName} ${engineer.lastName}` : `Инженер ${engineerId}`;
  }

  onSave() {
    if (this.rateForm.invalid) {
      return;
    }

    this.isLoading.set(true);

    if (this.data.isEdit && this.data.rate) {
      this.updateRate();
    } else {
      this.createRate();
    }
  }

  private createRate() {
    const formValue = this.rateForm.value;
    const rateData: CreateEngineerOrganizationRateDto = {
      engineerId: formValue.engineerId,
      organizationId: formValue.organizationId,
      customBaseRate: formValue.customBaseRate || undefined,
      customOvertimeRate: formValue.customOvertimeRate || undefined,
      customZone1Extra: formValue.customZone1Extra || undefined,
      customZone2Extra: formValue.customZone2Extra || undefined,
      customZone3Extra: formValue.customZone3Extra || undefined,
    };

    this.engineerRatesService.createRate(rateData).subscribe({
      next: rate => {
        this.toastService.showSuccess('Конфигурация ставок успешно создана');
        this.dialogRef.close(rate);
      },
      error: error => {
        console.error('Ошибка создания ставки:', error);
        this.toastService.showError('Ошибка создания конфигурации ставок. Пожалуйста, попробуйте еще раз.');
        this.isLoading.set(false);
      },
    });
  }

  private updateRate() {
    if (!this.data.rate) return;

    const formValue = this.rateForm.value;
    const rateData: UpdateEngineerOrganizationRateDto = {
      customBaseRate: formValue.customBaseRate || undefined,
      customOvertimeRate: formValue.customOvertimeRate || undefined,
      customZone1Extra: formValue.customZone1Extra || undefined,
      customZone2Extra: formValue.customZone2Extra || undefined,
      customZone3Extra: formValue.customZone3Extra || undefined,
    };

    this.engineerRatesService.updateRate(this.data.rate.id, rateData).subscribe({
      next: rate => {
        this.toastService.showSuccess('Конфигурация ставок успешно обновлена');
        this.dialogRef.close(rate);
      },
      error: error => {
        console.error('Ошибка обновления ставки:', error);
        this.toastService.showError('Ошибка обновления конфигурации ставок. Пожалуйста, попробуйте еще раз.');
        this.isLoading.set(false);
      },
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
