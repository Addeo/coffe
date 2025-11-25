import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface RateEditDialogData {
  title: string;
  label: string;
  currentValue: number;
  placeholder?: string;
}

@Component({
  selector: 'app-rate-edit-dialog',
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
  ],
  template: `
    <div class="rate-edit-dialog">
      <h2 mat-dialog-title>{{ data.title }}</h2>

      <mat-dialog-content>
        <form [formGroup]="rateForm" class="rate-form">
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>{{ data.label }}</mat-label>
            <input
              matInput
              formControlName="value"
              type="number"
              step="0.01"
              [placeholder]="data.placeholder || '0'"
              autocomplete="off"
            />
            <mat-error *ngIf="rateForm.get('value')?.hasError('required')">
              Значение обязательно
            </mat-error>
            <mat-error *ngIf="rateForm.get('value')?.hasError('min')">
              Значение должно быть положительным
            </mat-error>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Отмена</button>
        <button mat-raised-button color="primary" (click)="onSave()" [disabled]="rateForm.invalid">
          <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
          <span *ngIf="!isLoading">Сохранить</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .rate-edit-dialog {
        min-width: 400px;
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

      .rate-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 24px;
        min-width: 300px;
      }

      .form-field {
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
        .rate-edit-dialog {
          min-width: 95vw;
        }

        .rate-form {
          padding: 16px;
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
export class RateEditDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<RateEditDialogComponent>);
  data: RateEditDialogData = inject(MAT_DIALOG_DATA);
  isLoading = false;

  rateForm: FormGroup = this.fb.group({
    value: [this.data.currentValue || 0, [Validators.required, Validators.min(0)]],
  });

  onSave() {
    if (this.rateForm.valid) {
      const value = this.rateForm.value.value;
      this.dialogRef.close(value);
    }
  }

  onCancel() {
    this.dialogRef.close(null);
  }
}
