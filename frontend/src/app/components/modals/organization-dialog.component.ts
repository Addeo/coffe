import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { OrganizationsService } from '../../services/organizations.service';
import { ToastService } from '../../services/toast.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationDto,
} from '@shared/dtos/organization.dto';

export interface OrganizationDialogData {
  organization?: OrganizationDto;
  isEdit?: boolean;
}

@Component({
  selector: 'app-organization-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="organization-dialog">
      <h2 mat-dialog-title>
        {{ data.isEdit ? 'Редактировать организацию' : 'Создать новую организацию' }}
      </h2>

      <mat-dialog-content>
        <form [formGroup]="organizationForm" class="organization-form">
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Название организации</mat-label>
            <input matInput formControlName="name" placeholder="Введите название организации" />
            <mat-error
              *ngIf="organizationForm.get('name')?.hasError('required')"
              i18n="@@organization.nameRequired"
            >
              Название организации обязательно
            </mat-error>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Базовая ставка (руб/час)</mat-label>
              <input
                matInput
                formControlName="baseRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="Например: 500.00"
              />
              <mat-error
                *ngIf="organizationForm.get('baseRate')?.hasError('required')"
                i18n="@@organization.baseRateRequired"
              >
                Базовая ставка обязательна
              </mat-error>
              <mat-error
                *ngIf="organizationForm.get('baseRate')?.hasError('min')"
                i18n="@@organization.baseRateMin"
              >
                Базовая ставка должна быть больше 0
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Коэффициент сверхурочных</mat-label>
              <input
                matInput
                formControlName="overtimeMultiplier"
                type="number"
                step="0.1"
                min="0"
                placeholder="Например: 1.5"
              />
              <mat-hint>Оставьте пустым, если нет сверхурочных</mat-hint>
            </mat-form-field>
          </div>

          <div class="form-row">
            <div class="toggle-field">
              <mat-slide-toggle formControlName="hasOvertime"> Сверхурочные </mat-slide-toggle>
              <span class="toggle-hint">Отметьте, если организация платит за сверхурочные</span>
            </div>
          </div>

          <!-- Active status field (only for editing) -->
          <div class="form-row" *ngIf="data.isEdit">
            <div class="toggle-field">
              <mat-slide-toggle formControlName="isActive"> Активна </mat-slide-toggle>
              <span class="toggle-hint">Отметьте, если организация активна</span>
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
          [disabled]="organizationForm.invalid || isLoading()"
        >
          <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
          <span *ngIf="!isLoading()">{{ data.isEdit ? 'Обновить' : 'Создать' }}</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .organization-dialog {
        min-width: 500px;
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

      .organization-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 24px;
        max-height: 70vh;
        overflow-y: auto;
      }

      .form-row {
        display: flex;
        gap: 16px;
        align-items: flex-start;
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
        .organization-dialog {
          min-width: 95vw;
          margin: 16px;
        }

        .form-row {
          flex-direction: column;
          gap: 20px;
        }

        .organization-form {
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
      }
    `,
  ],
})
export class OrganizationDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<OrganizationDialogComponent>);
  private organizationsService = inject(OrganizationsService);
  private toastService = inject(ToastService);

  data: OrganizationDialogData = inject(MAT_DIALOG_DATA);
  isLoading = signal(false);

  organizationForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    baseRate: [0, [Validators.required, Validators.min(0.01)]],
    overtimeMultiplier: [null],
    hasOvertime: [false],
    isActive: [true],
  });

  ngOnInit() {
    if (this.data.isEdit && this.data.organization) {
      this.organizationForm.patchValue({
        name: this.data.organization.name,
        baseRate: this.data.organization.baseRate,
        overtimeMultiplier: this.data.organization.overtimeMultiplier,
        hasOvertime: this.data.organization.hasOvertime,
      });
    }
  }

  onSave() {
    if (this.organizationForm.invalid) {
      return;
    }

    this.isLoading.set(true);

    if (this.data.isEdit && this.data.organization) {
      this.updateOrganization();
    } else {
      this.createOrganization();
    }
  }

  private createOrganization() {
    const formValue = this.organizationForm.value;
    const organizationData: CreateOrganizationDto = {
      name: formValue.name,
      baseRate: parseFloat(formValue.baseRate),
      overtimeMultiplier: formValue.overtimeMultiplier
        ? parseFloat(formValue.overtimeMultiplier)
        : undefined,
      hasOvertime: formValue.hasOvertime,
    };

    this.organizationsService.createOrganization(organizationData).subscribe({
      next: organization => {
        this.toastService.showSuccess('Организация успешно создана');
        this.dialogRef.close(organization);
      },
      error: error => {
        console.error('Ошибка создания организации:', error);
        this.toastService.showError('Ошибка создания организации. Пожалуйста, попробуйте еще раз.');
        this.isLoading.set(false);
      },
    });
  }

  private updateOrganization() {
    if (!this.data.organization) return;

    const formValue = this.organizationForm.value;
    const organizationData: UpdateOrganizationDto = {
      name: formValue.name,
      baseRate: parseFloat(formValue.baseRate),
      overtimeMultiplier: formValue.overtimeMultiplier
        ? parseFloat(formValue.overtimeMultiplier)
        : undefined,
      hasOvertime: formValue.hasOvertime,
      isActive: formValue.isActive,
    };

    this.organizationsService
      .updateOrganization(this.data.organization.id, organizationData)
      .subscribe({
        next: organization => {
          this.toastService.showSuccess('Организация успешно обновлена');
          this.dialogRef.close(organization);
        },
        error: error => {
          console.error('Ошибка обновления организации:', error);
          this.toastService.showError(
            'Ошибка обновления организации. Пожалуйста, попробуйте еще раз.'
          );
          this.isLoading.set(false);
        },
      });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
