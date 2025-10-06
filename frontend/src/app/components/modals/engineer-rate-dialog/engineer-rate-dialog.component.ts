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

          <mat-tab-group>
            <!-- Basic Rates Tab -->
            <mat-tab label="Базовые ставки">
              <div class="tab-content">
                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Базовая ставка (руб/час)</mat-label>
                    <input
                      matInput
                      formControlName="customBaseRate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Оставьте пустым для использования ставки по умолчанию"
                    />
                    <mat-hint>Индивидуальная базовая ставка для этого инженера в этой организации</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Ставка переработки (руб/час)</mat-label>
                    <input
                      matInput
                      formControlName="customOvertimeRate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Оставьте пустым для использования ставки по умолчанию"
                    />
                    <mat-hint>Фиксированная ставка за переработку</mat-hint>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Коэффициент переработки</mat-label>
                  <input
                    matInput
                    formControlName="customOvertimeMultiplier"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="например, 1.5"
                  />
                  <mat-hint>Множитель для расчета переработки (если не указана фиксированная ставка)</mat-hint>
                </mat-form-field>
              </div>
            </mat-tab>

            <!-- Salary and Car Compensation Tab -->
            <mat-tab label="Зарплата и автомобиль">
              <div class="tab-content">
                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Фиксированная зарплата (руб)</mat-label>
                    <input
                      matInput
                      formControlName="customFixedSalary"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Оставьте пустым для использования ставки по умолчанию"
                    />
                    <mat-hint>Фиксированная зарплата (оклад)</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Фиксированная сумма за автомобиль (руб)</mat-label>
                    <input
                      matInput
                      formControlName="customFixedCarAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Оставьте пустым для использования ставки по умолчанию"
                    />
                    <mat-hint>Фиксированная оплата за эксплуатацию автомобиля</mat-hint>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Ставка за километраж (руб/км)</mat-label>
                  <input
                    matInput
                    formControlName="customCarKmRate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Оставьте пустым для использования ставки по умолчанию"
                  />
                  <mat-hint>Оплата за километраж (для наемных инженеров)</mat-hint>
                </mat-form-field>
              </div>
            </mat-tab>

            <!-- Zone Extras Tab -->
            <mat-tab label="Зональные надбавки">
              <div class="tab-content">
                <p class="tab-description">
                  Дополнительные выплаты за работу в отдаленных зонах (при расстоянии > 60 км)
                </p>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Надбавка за зону 1 (руб)</mat-label>
                    <input
                      matInput
                      formControlName="customZone1Extra"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Оставьте пустым для использования ставки по умолчанию"
                    />
                    <mat-hint>Дополнительная оплата за зону 1</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Надбавка за зону 2 (руб)</mat-label>
                    <input
                      matInput
                      formControlName="customZone2Extra"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Оставьте пустым для использования ставки по умолчанию"
                    />
                    <mat-hint>Дополнительная оплата за зону 2</mat-hint>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Надбавка за зону 3 (руб)</mat-label>
                  <input
                    matInput
                    formControlName="customZone3Extra"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Оставьте пустым для использования ставки по умолчанию"
                  />
                  <mat-hint>Дополнительная оплата за зону 3</mat-hint>
                </mat-form-field>
              </div>
            </mat-tab>
          </mat-tab-group>

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

      .tab-content {
        padding: 20px 0;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .tab-description {
        color: #666;
        font-size: 14px;
        margin: 0;
        padding-bottom: 16px;
        border-bottom: 1px solid #e0e0e0;
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

      mat-tab-group {
        margin-top: 16px;
      }

      mat-tab-body {
        overflow: visible;
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

        .tab-content {
          padding: 16px 0;
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
    customOvertimeMultiplier: [null, [Validators.min(0)]],
    customFixedSalary: [null, [Validators.min(0)]],
    customFixedCarAmount: [null, [Validators.min(0)]],
    customCarKmRate: [null, [Validators.min(0)]],
    customZone1Extra: [null, [Validators.min(0)]],
    customZone2Extra: [null, [Validators.min(0)]],
    customZone3Extra: [null, [Validators.min(0)]],
    isActive: [true],
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
        customOvertimeMultiplier: this.data.rate.customOvertimeMultiplier,
        customFixedSalary: this.data.rate.customFixedSalary,
        customFixedCarAmount: this.data.rate.customFixedCarAmount,
        customCarKmRate: this.data.rate.customCarKmRate,
        customZone1Extra: this.data.rate.customZone1Extra,
        customZone2Extra: this.data.rate.customZone2Extra,
        customZone3Extra: this.data.rate.customZone3Extra,
        isActive: this.data.rate.isActive,
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
        console.error('Error loading engineers:', error);
      },
    });
  }

  private loadOrganizations() {
    this.organizationsService.getOrganizations().subscribe({
      next: response => {
        this.organizations.set(response.data);
      },
      error: error => {
        console.error('Error loading organizations:', error);
      },
    });
  }

  getEngineerName(engineerId: number): string {
    const engineer = this.engineers().find(e => e.id === engineerId);
    return engineer ? `${engineer.firstName} ${engineer.lastName}` : `Engineer ${engineerId}`;
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
      customOvertimeMultiplier: formValue.customOvertimeMultiplier || undefined,
      customFixedSalary: formValue.customFixedSalary || undefined,
      customFixedCarAmount: formValue.customFixedCarAmount || undefined,
      customCarKmRate: formValue.customCarKmRate || undefined,
      customZone1Extra: formValue.customZone1Extra || undefined,
      customZone2Extra: formValue.customZone2Extra || undefined,
      customZone3Extra: formValue.customZone3Extra || undefined,
    };

    this.engineerRatesService.createRate(rateData).subscribe({
      next: rate => {
        this.toastService.showSuccess('Rate configuration created successfully');
        this.dialogRef.close(rate);
      },
      error: error => {
        console.error('Error creating rate:', error);
        this.toastService.showError('Error creating rate configuration. Please try again.');
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
      customOvertimeMultiplier: formValue.customOvertimeMultiplier || undefined,
      customFixedSalary: formValue.customFixedSalary || undefined,
      customFixedCarAmount: formValue.customFixedCarAmount || undefined,
      customCarKmRate: formValue.customCarKmRate || undefined,
      customZone1Extra: formValue.customZone1Extra || undefined,
      customZone2Extra: formValue.customZone2Extra || undefined,
      customZone3Extra: formValue.customZone3Extra || undefined,
      isActive: formValue.isActive,
    };

    this.engineerRatesService.updateRate(this.data.rate.id, rateData).subscribe({
      next: rate => {
        this.toastService.showSuccess('Rate configuration updated successfully');
        this.dialogRef.close(rate);
      },
      error: error => {
        console.error('Error updating rate:', error);
        this.toastService.showError('Error updating rate configuration. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
