import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { OrdersService } from '../../services/orders.service';
import { ToastService } from '../../services/toast.service';
import { OrderDto } from '@shared/dtos/order.dto';
import { TerritoryType } from '@shared/interfaces/order.interface';
import { FilesService } from '../../services/files.service';
import { FileResponseDto } from '@shared/dtos/file.dto';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface WorkCompletionDialogData {
  order: OrderDto;
}

@Component({
  selector: 'app-work-completion-dialog',
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
    MatCheckboxModule,
    MatRadioModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="work-completion-dialog">
      <h2 mat-dialog-title>
        <mat-icon>task_alt</mat-icon>
        Внести данные о выполненной работе
      </h2>

      <mat-dialog-content>
        <mat-card class="order-info">
          <mat-card-content>
            <h3>{{ data.order.title }}</h3>
            <p><strong>Организация:</strong> {{ getOrganizationName() }}</p>
            <p><strong>Локация:</strong> {{ data.order.location }}</p>
          </mat-card-content>
        </mat-card>

        <form [formGroup]="workForm" class="work-form">
          <!-- Hours Section -->
          <div class="form-section">
            <h4>⏱ Время работы</h4>
            <div class="form-row single-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Часы работы</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="workHours"
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
                <mat-icon matSuffix>schedule</mat-icon>
                <mat-error *ngIf="workForm.get('workHours')?.hasError('required')">
                  Обязательное поле
                </mat-error>
                <mat-error *ngIf="workForm.get('workHours')?.hasError('min')">
                  Не может быть отрицательным
                </mat-error>
              </mat-form-field>
            </div>
            <div class="form-row single-row">
              <mat-slide-toggle color="primary" formControlName="isOvertime">
                Внеурочное время
              </mat-slide-toggle>
              <span class="hint">При включении часы будут учтены по сверхурочной ставке</span>
            </div>
          </div>

          <!-- Territory/Distance Section -->
          <div class="form-section">
            <h4>📍 Территория и расстояние</h4>
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Тип территории</mat-label>
                <mat-select formControlName="territoryType">
                  <mat-option [value]="null">Не указано</mat-option>
                  <mat-option value="home">Домашняя (≤60 км)</mat-option>
                  <mat-option value="zone_1">Зона 1 (61-199 км)</mat-option>
                  <mat-option value="zone_2">Зона 2 (200-250 км)</mat-option>
                  <mat-option value="zone_3">Зона 3 (>250 км)</mat-option>
                  <mat-option value="urban">Городская</mat-option>
                  <mat-option value="suburban">Пригородная</mat-option>
                  <mat-option value="rural">Сельская</mat-option>
                </mat-select>
                <mat-icon matSuffix>location_on</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Расстояние (км)</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="distanceKm"
                  placeholder="0"
                  min="0"
                  step="1"
                />
                <mat-icon matSuffix>drive_eta</mat-icon>
                <mat-error *ngIf="workForm.get('distanceKm')?.hasError('min')">
                  Не может быть отрицательным
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Car Usage -->
          <div class="form-section">
            <h4>🚗 Использование автомобиля</h4>
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>Оплата за использование автомобиля</mat-label>
              <input
                matInput
                type="number"
                formControlName="carPayment"
                placeholder="0"
                min="0"
                step="100"
              />
              <span matPrefix>₽&nbsp;</span>
              <mat-icon matSuffix>local_atm</mat-icon>
              <mat-hint>Оставьте 0, если не использовался личный автомобиль</mat-hint>
            </mat-form-field>
          </div>

          <div class="form-section">
            <h4>📝 Примечания</h4>
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>Номер акта выполненных работ</mat-label>
              <input matInput formControlName="workActNumber" placeholder="Например, АВР-123/25" />
              <mat-icon matSuffix>receipt_long</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>Комментарий о работе</mat-label>
              <textarea
                matInput
                formControlName="notes"
                placeholder="Описание выполненной работы, использованные материалы и т.д."
                rows="4"
              ></textarea>
              <mat-icon matSuffix>description</mat-icon>
            </mat-form-field>
          </div>

          <!-- Files Section -->
          <div class="form-section">
            <h4>📎 Файлы и документы</h4>
            <div class="file-upload-container">
              <input type="file" #fileInput hidden multiple (change)="onFileSelected($event)" />
              <button mat-stroked-button color="primary" (click)="fileInput.click()" type="button">
                <mat-icon>cloud_upload</mat-icon>
                Добавить файлы
              </button>
              <span class="file-hint">Фотоотчеты, акты, сканы документов</span>
            </div>

            <div class="files-list" *ngIf="selectedFiles().length > 0">
              <div class="file-item" *ngFor="let file of selectedFiles(); let i = index">
                <mat-icon class="file-icon">description</mat-icon>
                <div class="file-info">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                </div>
                <button mat-icon-button color="warn" (click)="removeFile(i)" type="button">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- Completion Status -->
          <div class="form-section">
            <h4>✅ Статус выполнения</h4>
            <mat-radio-group formControlName="isFullyCompleted" class="completion-radio">
              <mat-radio-button [value]="true" class="completion-option completion-full">
                <div class="radio-content">
                  <mat-icon>check_circle</mat-icon>
                  <div>
                    <strong>Работа завершена полностью</strong>
                    <p>Заявка будет закрыта со статусом "Выполнено"</p>
                  </div>
                </div>
              </mat-radio-button>
              <mat-radio-button [value]="false" class="completion-option completion-partial">
                <div class="radio-content">
                  <mat-icon>pending</mat-icon>
                  <div>
                    <strong>Требуется продолжение работ</strong>
                    <p>Заявка останется в статусе "В работе"</p>
                  </div>
                </div>
              </mat-radio-button>
            </mat-radio-group>
          </div>
        </form>

        <div *ngIf="isLoading()" class="loading">
          <mat-spinner diameter="30"></mat-spinner>
          <mat-spinner diameter="30"></mat-spinner>
          <p>{{ loadingMessage() }}</p>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" [disabled]="isLoading()">Отмена</button>
        <button
          mat-raised-button
          color="primary"
          (click)="onSave()"
          [disabled]="workForm.invalid || isLoading()"
        >
          <mat-icon>save</mat-icon>
          <span>Сохранить</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .work-completion-dialog {
        min-width: 600px;
        max-width: 90vw;
        max-height: 90vh;
      }

      h2[mat-dialog-title] {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        padding: 24px;
        font-size: 20px;
        font-weight: 500;
        color: #1976d2;
        border-bottom: 2px solid #e0e0e0;
      }

      h2[mat-dialog-title] mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      mat-dialog-content {
        padding: 24px !important;
        max-height: 70vh;
        overflow-y: auto;
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

      .work-form {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .form-section {
        padding: 16px;
        background: white;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
      }

      .form-section h4 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 500;
        color: #333;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .form-row.single-row {
        grid-template-columns: 1fr;
        align-items: center;
      }

      .form-row .hint {
        font-size: 12px;
        color: #666;
        margin-left: 12px;
        align-self: center;
      }

      .form-field {
        width: 100%;
      }

      .form-field-full {
        width: 100%;
      }

      .completion-radio {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .completion-option {
        padding: 16px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        transition: all 0.2s;
      }

      .completion-option:hover {
        border-color: #1976d2;
        background: #f5f5f5;
      }

      .completion-option.mat-mdc-radio-checked {
        border-color: #1976d2;
        background: #e3f2fd;
      }

      .completion-full.mat-mdc-radio-checked {
        border-color: #4caf50;
        background: #e8f5e9;
      }

      .completion-partial.mat-mdc-radio-checked {
        border-color: #ff9800;
        background: #fff3e0;
      }

      .radio-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .radio-content mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #666;
      }

      .completion-full.mat-mdc-radio-checked .radio-content mat-icon {
        color: #4caf50;
      }

      .completion-partial.mat-mdc-radio-checked .radio-content mat-icon {
        color: #ff9800;
      }

      .radio-content div {
        flex: 1;
      }

      .radio-content strong {
        display: block;
        margin-bottom: 4px;
        font-size: 14px;
        color: #333;
      }

      .radio-content p {
        margin: 0;
        font-size: 12px;
        color: #666;
      }

      mat-dialog-actions {
        padding: 16px 24px !important;
        margin: 0;
        border-top: 1px solid #e0e0e0;
        gap: 12px;
      }

      button {
        border-radius: 8px;
        text-transform: uppercase;
        font-weight: 500;
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

      /* Responsive */
      @media (max-width: 768px) {
        .work-completion-dialog {
          min-width: 95vw;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        h2[mat-dialog-title] {
          font-size: 18px;
        }
      }

      .file-upload-container {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }

      .file-hint {
        color: #666;
        font-size: 12px;
      }

      .files-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .file-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background: #f5f5f5;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
      }

      .file-icon {
        color: #666;
      }

      .file-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .file-name {
        font-size: 14px;
        font-weight: 500;
        color: #333;
      }

      .file-size {
        font-size: 12px;
        color: #666;
      }
    `,
  ],
})
export class WorkCompletionDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ordersService = inject(OrdersService);
  private filesService = inject(FilesService);
  private toastService = inject(ToastService);
  private dialogRef = inject(MatDialogRef<WorkCompletionDialogComponent>);
  data: WorkCompletionDialogData = inject(MAT_DIALOG_DATA);

  isLoading = signal(false);
  loadingMessage = signal('Сохранение данных...');
  selectedFiles = signal<File[]>([]);
  workForm!: FormGroup;

  ngOnInit() {
    this.workForm = this.fb.group({
      workHours: [0, [Validators.required, Validators.min(0)]],
      isOvertime: [false],
      territoryType: [this.data.order.territoryType || null],
      distanceKm: [this.data.order.distanceKm || 0, [Validators.min(0)]],
      carPayment: [0, [Validators.min(0)]],
      workActNumber: [this.data.order.workActNumber || ''],
      notes: [''],
      isFullyCompleted: [true, Validators.required],
    });
  }

  getOrganizationName(): string {
    return this.data.order.organization?.name || 'N/A';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files);
      this.selectedFiles.update(files => [...files, ...newFiles]);
    }
  }

  removeFile(index: number) {
    this.selectedFiles.update(files => files.filter((_, i) => i !== index));
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onSave() {
    if (this.workForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.loadingMessage.set('Загрузка файлов...');

    const files = this.selectedFiles();
    if (files.length > 0) {
      // Upload files first
      const uploadObservables = files.map(file =>
        this.filesService.uploadFile(file, undefined, 'Отчет о работе').pipe(
          catchError(error => {
            console.error('Error uploading file:', file.name, error);
            return of(null);
          })
        )
      );

      forkJoin(uploadObservables).subscribe({
        next: responses => {
          const uploadedFileIds = responses
            .filter((res): res is FileResponseDto => res !== null)
            .map(res => res.id);

          this.submitWorkData(uploadedFileIds);
        },
        error: error => {
          console.error('Error uploading files:', error);
          this.toastService.error('Ошибка при загрузке файлов');
          this.isLoading.set(false);
        },
      });
    } else {
      this.submitWorkData([]);
    }
  }

  private submitWorkData(fileIds: string[]) {
    this.loadingMessage.set('Сохранение данных...');
    const formValue = this.workForm.value;
    const hours = Number(formValue.workHours) || 0;
    const isOvertime = !!formValue.isOvertime;
    const workData = {
      regularHours: isOvertime ? 0 : hours,
      overtimeHours: isOvertime ? hours : 0,
      territoryType: formValue.territoryType,
      distanceKm: formValue.distanceKm || 0,
      carPayment: formValue.carPayment || 0,
      notes: formValue.notes,
      workActNumber: formValue.workActNumber,
      isFullyCompleted: formValue.isFullyCompleted,
      files: fileIds,
    };

    console.log('💾 Saving work data:', {
      orderId: this.data.order.id,
      ...workData,
    });

    this.ordersService.completeWork(this.data.order.id, workData).subscribe({
      next: (updatedOrder: OrderDto) => {
        this.isLoading.set(false);
        const message = workData.isFullyCompleted
          ? '✅ Работа завершена полностью'
          : '🔄 Данные о работе сохранены, заявка остается в работе';
        this.toastService.success(message);
        this.dialogRef.close(updatedOrder);
      },
      error: (error: any) => {
        console.error('Error saving work data:', error);
        this.isLoading.set(false);
        this.toastService.error('Ошибка при сохранении данных работы');
      },
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
