import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { OrdersService } from '../../services/orders.service';
import { OrganizationsService } from '../../services/organizations.service';
import { FilesService } from '../../services/files.service';
import { ToastService } from '../../services/toast.service';
import { CreateOrderDto, UpdateOrderDto, OrderDto } from '../../../../../shared/dtos/order.dto';
import {
  TerritoryType,
  OrderStatus,
  OrderSource,
} from '../../../../../shared/interfaces/order.interface';
import { OrganizationDto } from '../../../../../shared/dtos/organization.dto';
import { FileResponseDto, FileType } from '../../../../../shared/dtos/file.dto';

interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  uploadedFileId?: string;
}

export interface OrderDialogData {
  order?: OrderDto;
  isEdit?: boolean;
}

@Component({
  selector: 'app-order-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="order-dialog">
      <h2 mat-dialog-title>
        {{ data.isEdit ? 'Редактировать заказ' : 'Создать новый заказ' }}
      </h2>

      <mat-dialog-content>
        <form [formGroup]="orderForm" class="order-form">
          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Название заказа</mat-label>
            <input matInput formControlName="title" placeholder="Введите название заказа" />
            <mat-error *ngIf="orderForm.get('title')?.hasError('required')">
              Название обязательно
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Описание</mat-label>
            <textarea
              matInput
              formControlName="description"
              placeholder="Введите описание заказа"
              rows="3"
            ></textarea>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Организация</mat-label>
              <mat-select formControlName="organizationId">
                <mat-option *ngFor="let org of organizations()" [value]="org.id">
                  {{ org.name }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="orderForm.get('organizationId')?.hasError('required')">
                Организация обязательна
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Местоположение</mat-label>
              <input matInput formControlName="location" placeholder="Введите местоположение" />
              <mat-error *ngIf="orderForm.get('location')?.hasError('required')">
                Местоположение обязательно
              </mat-error>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Расстояние (км)</mat-label>
              <input
                matInput
                type="number"
                formControlName="distanceKm"
                placeholder="Расстояние в км"
                min="0"
                step="0.1"
              />
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Тип территории</mat-label>
              <mat-select formControlName="territoryType">
                <mat-option [value]="TerritoryType.URBAN">Городской</mat-option>
                <mat-option [value]="TerritoryType.SUBURBAN">Пригородный</mat-option>
                <mat-option [value]="TerritoryType.RURAL">Сельский</mat-option>
                <mat-option [value]="TerritoryType.HOME">Домашний (≤60 км)</mat-option>
                <mat-option [value]="TerritoryType.ZONE_1">Зона 1 (61-199 км)</mat-option>
                <mat-option [value]="TerritoryType.ZONE_2">Зона 2 (200-250 км)</mat-option>
                <mat-option [value]="TerritoryType.ZONE_3">Зона 3 (>250 км)</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Планируемая дата начала</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="plannedStartDate" />
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>

          <div class="form-row" *ngIf="data.isEdit">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Статус заказа</mat-label>
              <mat-select formControlName="status">
                <mat-option [value]="OrderStatus.WAITING">Ожидает</mat-option>
                <mat-option [value]="OrderStatus.PROCESSING">В обработке</mat-option>
                <mat-option [value]="OrderStatus.WORKING">В работе</mat-option>
                <mat-option [value]="OrderStatus.REVIEW">На проверке</mat-option>
                <mat-option [value]="OrderStatus.COMPLETED">Завершен</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Источник</mat-label>
              <mat-select formControlName="source">
                <mat-option [value]="OrderSource.MANUAL">Вручную</mat-option>
                <mat-option [value]="OrderSource.AUTOMATIC">Автоматически</mat-option>
                <mat-option [value]="OrderSource.EMAIL">Email</mat-option>
                <mat-option [value]="OrderSource.API">API</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="form-row" *ngIf="data.isEdit">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Фактическая дата начала</mat-label>
              <input matInput [matDatepicker]="actualPicker" formControlName="actualStartDate" />
              <mat-datepicker-toggle matSuffix [for]="actualPicker"></mat-datepicker-toggle>
              <mat-datepicker #actualPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Дата завершения</mat-label>
              <input matInput [matDatepicker]="completionPicker" formControlName="completionDate" />
              <mat-datepicker-toggle matSuffix [for]="completionPicker"></mat-datepicker-toggle>
              <mat-datepicker #completionPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <!-- Files Section -->
          <div class="files-section">
            <h3>Файлы</h3>

            <!-- File Input -->
            <div class="file-input-container">
              <input
                type="file"
                #fileInput
                (change)="onFileSelected($event)"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
                style="display: none"
              />
              <button
                mat-stroked-button
                type="button"
                (click)="fileInput.click()"
                [disabled]="isUploadingInProgress()"
              >
                <mat-icon>add</mat-icon>
                Выбрать файлы
              </button>
            </div>

            <!-- Drag and Drop Area -->
            <div
              class="drop-zone"
              [class.drag-over]="isDragOver()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
            >
              <mat-icon>cloud_upload</mat-icon>
              <p>
                Перетащите файлы сюда или
                <button mat-button type="button" (click)="fileInput.click()">выберите</button>
              </p>
              <small>Поддерживаемые форматы: изображения, PDF, документы (макс. 10MB)</small>
            </div>

            <!-- Upload Progress -->
            <div class="upload-progress" *ngIf="uploadProgress().length > 0">
              <h4>Загрузка файлов:</h4>
              <div class="progress-list">
                <div class="progress-item" *ngFor="let progress of uploadProgress()">
                  <div class="progress-header">
                    <span class="file-name">{{ progress.file.name }}</span>
                    <span class="progress-status" [class]="progress.status">
                      {{
                        progress.status === 'uploading'
                          ? progress.progress + '%'
                          : progress.status === 'completed'
                            ? 'Готово'
                            : progress.status === 'error'
                              ? 'Ошибка'
                              : 'Ожидание'
                      }}
                    </span>
                  </div>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="progress.progress"
                    [class]="progress.status"
                  ></mat-progress-bar>
                  <div class="error-message" *ngIf="progress.error">
                    {{ progress.error }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Successfully Uploaded Files Ready for Attachment -->
            <div class="uploaded-files" *ngIf="getCompletedUploads().length > 0">
              <h4>Загруженные файлы (будут прикреплены к заказу):</h4>
              <div class="file-list">
                <div
                  class="file-item"
                  *ngFor="let progress of getCompletedUploads(); let i = index"
                >
                  <span class="file-name">{{ progress.file.name }}</span>
                  <span class="file-size"
                    >({{ (progress.file.size / 1024 / 1024).toFixed(2) }} MB)</span
                  >
                  <button
                    mat-icon-button
                    (click)="removeUploadedFile(getUploadIndex(progress))"
                    type="button"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>

            <!-- Attached Files (for edit mode) -->
            <div class="attached-files" *ngIf="attachedFiles().length > 0">
              <h4>Прикрепленные файлы:</h4>
              <div class="file-list">
                <div class="file-item" *ngFor="let file of attachedFiles()">
                  <span class="file-name">{{ file.originalName }}</span>
                  <span class="file-size">({{ (file.size / 1024 / 1024).toFixed(2) }} MB)</span>
                  <div class="file-actions">
                    <button
                      mat-icon-button
                      (click)="viewFile(file.id)"
                      type="button"
                      title="Просмотреть"
                    >
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      (click)="downloadFile(file.id)"
                      type="button"
                      title="Скачать"
                    >
                      <mat-icon>download</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      (click)="removeAttachedFile(file.id)"
                      type="button"
                      title="Удалить"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
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
          [disabled]="orderForm.invalid || isLoading() || isUploadingInProgress()"
        >
          <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
          <span *ngIf="!isLoading()">{{ data.isEdit ? 'Обновить' : 'Создать' }}</span>
        </button>
      </mat-dialog-actions>
    </div>

    <!-- Image Viewer Modal -->
    <div *ngIf="imageModalVisible" class="image-modal-overlay" (click)="closeImageModal()">
      <div class="image-modal-content" (click)="$event.stopPropagation()">
        <div class="image-modal-header">
          <h3>{{ currentImageMetadata?.originalName }}</h3>
          <button mat-icon-button (click)="closeImageModal()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="image-modal-body">
          <img
            *ngIf="currentImageMetadata?.viewUrl"
            [src]="currentImageMetadata.viewUrl"
            [alt]="currentImageMetadata?.originalName"
            class="image-viewer"
          />
        </div>
        <div class="image-modal-footer">
          <span class="file-info">
            {{ currentImageMetadata?.sizeFormatted }}
            • {{ currentImageMetadata?.type }}
          </span>
          <button mat-raised-button color="primary" (click)="downloadCurrentImage()">
            <mat-icon>download</mat-icon>
            Скачать
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .order-dialog {
        min-width: 600px;
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

      .order-form {
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

      mat-form-field {
        width: 100%;
      }

      textarea {
        resize: vertical;
        min-height: 80px;
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

      /* Files Section */
      .files-section {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #e0e0e0;
      }

      .files-section h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 500;
        color: #1976d2;
      }

      .files-section h4 {
        margin: 16px 0 8px 0;
        font-size: 14px;
        font-weight: 500;
        color: #666;
      }

      .file-input-container {
        margin-bottom: 16px;
      }

      .file-input-container button {
        border-radius: 8px;
        text-transform: uppercase;
        font-weight: 500;
        letter-spacing: 0.5px;
      }

      /* Drag and Drop Zone */
      .drop-zone {
        border: 2px dashed #ccc;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        background-color: #fafafa;
        transition: all 0.3s ease;
        margin-bottom: 16px;
        cursor: pointer;
      }

      .drop-zone:hover {
        border-color: #1976d2;
        background-color: #f0f8ff;
      }

      .drop-zone.drag-over {
        border-color: #1976d2;
        background-color: #e3f2fd;
        transform: scale(1.02);
      }

      .drop-zone mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #666;
        margin-bottom: 8px;
      }

      .drop-zone.drag-over mat-icon {
        color: #1976d2;
      }

      .drop-zone p {
        margin: 8px 0 4px 0;
        color: #666;
        font-size: 14px;
      }

      .drop-zone button {
        color: #1976d2;
        text-decoration: underline;
        font-weight: 500;
      }

      .drop-zone small {
        color: #999;
        font-size: 12px;
        display: block;
        margin-top: 8px;
      }

      /* Upload Progress */
      .upload-progress {
        margin-bottom: 16px;
        padding: 16px;
        background-color: #f9f9f9;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
      }

      .upload-progress h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 500;
        color: #1976d2;
      }

      .progress-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .progress-item {
        padding: 12px;
        background-color: white;
        border-radius: 6px;
        border: 1px solid #e0e0e0;
      }

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .progress-header .file-name {
        font-weight: 500;
        color: #333;
        flex: 1;
      }

      .progress-status {
        font-size: 12px;
        font-weight: 500;
        padding: 2px 8px;
        border-radius: 12px;
        text-transform: uppercase;
      }

      .progress-status.pending {
        background-color: #fff3e0;
        color: #f57c00;
      }

      .progress-status.uploading {
        background-color: #e3f2fd;
        color: #1976d2;
      }

      .progress-status.completed {
        background-color: #e8f5e8;
        color: #388e3c;
      }

      .progress-status.error {
        background-color: #ffebee;
        color: #d32f2f;
      }

      .progress-item mat-progress-bar {
        margin-bottom: 4px;
      }

      .progress-item mat-progress-bar.completed {
        --mdc-linear-progress-active-indicator-color: #388e3c;
      }

      .progress-item mat-progress-bar.error {
        --mdc-linear-progress-active-indicator-color: #d32f2f;
      }

      .error-message {
        color: #d32f2f;
        font-size: 12px;
        margin-top: 4px;
      }

      .file-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .file-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background-color: #f5f5f5;
        border-radius: 6px;
        border: 1px solid #e0e0e0;
      }

      .file-name {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        color: #333;
      }

      .file-size {
        font-size: 12px;
        color: #666;
        white-space: nowrap;
      }

      .file-item button {
        width: 32px;
        height: 32px;
        line-height: 32px;
      }

      .file-item button mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      /* Responsive design */
      @media (max-width: 600px) {
        .order-dialog {
          min-width: 95vw;
          margin: 16px;
        }

        .form-row {
          flex-direction: column;
          gap: 20px;
        }

        .order-form {
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

      /* Image Viewer Modal Styles */
      .image-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      .image-modal-content {
        background: white;
        border-radius: 8px;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      }

      .image-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #e0e0e0;

        h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 500;
          color: #333;
          max-width: calc(100% - 40px);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        button {
          color: #666;
        }
      }

      .image-modal-body {
        flex: 1;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        max-height: 70vh;
        overflow: auto;
      }

      .image-viewer {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 4px;
      }

      .image-modal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-top: 1px solid #e0e0e0;
        background: #f8f9fa;

        .file-info {
          color: #666;
          font-size: 14px;
        }

        button {
          min-width: 120px;
        }
      }

      .file-actions {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .file-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        margin-bottom: 8px;
        background: #f8f9fa;

        .file-name {
          flex: 1;
          font-weight: 500;
          color: #333;
        }

        .file-size {
          color: #666;
          margin-right: 12px;
        }
      }
    `,
  ],
})
export class OrderDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<OrderDialogComponent>);
  private ordersService = inject(OrdersService);
  private organizationsService = inject(OrganizationsService);
  private filesService = inject(FilesService);
  private toastService = inject(ToastService);

  data: OrderDialogData = inject(MAT_DIALOG_DATA);
  isLoading = signal(false);
  organizations = signal<OrganizationDto[]>([]);
  TerritoryType = TerritoryType;
  OrderStatus = OrderStatus;
  OrderSource = OrderSource;

  // File management
  attachedFiles = signal<FileResponseDto[]>([]);
  selectedFiles: File[] = [];
  isUploadingFiles = signal(false);
  isDragOver = signal(false);
  uploadProgress = signal<FileUploadProgress[]>([]);

  orderForm: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    organizationId: [null, [Validators.required]],
    location: ['', [Validators.required]],
    distanceKm: [null],
    territoryType: [null],
    plannedStartDate: [null],
    source: [OrderSource.MANUAL],
    status: [OrderStatus.WAITING],
    actualStartDate: [null],
    completionDate: [null],
    files: [[]], // Array of file IDs
  });

  ngOnInit() {
    this.loadOrganizations();

    if (this.data.isEdit && this.data.order) {
      this.orderForm.patchValue({
        title: this.data.order.title,
        description: this.data.order.description,
        organizationId: this.data.order.organizationId,
        location: this.data.order.location,
        distanceKm: this.data.order.distanceKm,
        territoryType: this.data.order.territoryType,
        plannedStartDate: this.data.order.plannedStartDate,
        source: this.data.order.source,
        status: this.data.order.status,
        actualStartDate: this.data.order.actualStartDate,
        completionDate: this.data.order.completionDate,
        files: this.data.order.files?.map(f => f.id) || [],
      });

      // Load attached files
      if (this.data.order.files) {
        console.log(
          'Loading existing order files:',
          this.data.order.files.map(f => ({ id: f.id, name: f.originalName }))
        );
        this.attachedFiles.set(this.data.order.files);
      } else {
        console.log('No existing files found for order');
      }
    }
  }

  private loadOrganizations() {
    this.organizationsService.getOrganizations().subscribe({
      next: response => {
        this.organizations.set(response.data.filter(org => org.isActive));
      },
      error: error => {
        console.error('Ошибка загрузки организаций:', error);
        this.toastService.error('Ошибка загрузки организаций');
      },
    });
  }

  // File handling methods
  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.addFilesAndStartUpload(Array.from(files));
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.addFilesAndStartUpload(Array.from(files));
    }
  }

  private async addFilesAndStartUpload(files: File[]) {
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > maxFileSize) {
        this.toastService.error(`Файл "${file.name}" слишком большой. Максимальный размер: 10MB`);
        continue;
      }

      if (!allowedTypes.includes(file.type)) {
        this.toastService.error(`Файл "${file.name}" имеет неподдерживаемый формат`);
        continue;
      }

      // Check for duplicates in current upload progress
      const isDuplicate = this.uploadProgress().some(
        p => p.file.name === file.name && p.file.size === file.size
      );
      if (isDuplicate) {
        this.toastService.warning(`Файл "${file.name}" уже добавлен`);
        continue;
      }

      validFiles.push(file);
    }

    // Start uploading valid files
    for (const file of validFiles) {
      this.startFileUpload(file);
    }
  }

  private async startFileUpload(file: File) {
    const progressItem: FileUploadProgress = {
      file,
      progress: 0,
      status: 'uploading',
    };

    // Add to progress tracking
    const currentProgress = this.uploadProgress();
    this.uploadProgress.set([...currentProgress, progressItem]);

    try {
      const uploadedFile = await this.filesService
        .uploadFile(file, FileType.ORDER_PHOTO)
        .toPromise();

      if (uploadedFile) {
        progressItem.progress = 100;
        progressItem.status = 'completed';
        progressItem.uploadedFileId = uploadedFile.id;

        this.toastService.success(`Файл "${file.name}" загружен успешно`);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      progressItem.status = 'error';
      progressItem.error = 'Ошибка загрузки файла';
      this.toastService.error(`Ошибка загрузки файла: ${file.name}`);
    }

    // Update progress
    const updatedProgress = this.uploadProgress();
    const index = updatedProgress.findIndex(p => p.file === file);
    if (index !== -1) {
      updatedProgress[index] = progressItem;
      this.uploadProgress.set([...updatedProgress]);
    }
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  removeUploadedFile(index: number) {
    const currentProgress = this.uploadProgress();
    const fileToRemove = currentProgress[index];

    // If file was successfully uploaded, we might want to delete it from server
    if (fileToRemove.uploadedFileId && fileToRemove.status === 'completed') {
      // Optional: delete file from server if not attached to order yet
      // this.filesService.deleteFile(fileToRemove.uploadedFileId).subscribe();
    }

    currentProgress.splice(index, 1);
    this.uploadProgress.set([...currentProgress]);
  }

  removeAttachedFile(fileId: string) {
    const currentFiles = this.orderForm.get('files')?.value || [];
    const updatedFiles = currentFiles.filter((id: string) => id !== fileId);
    this.orderForm.patchValue({ files: updatedFiles });

    const currentAttachedFiles = this.attachedFiles();
    this.attachedFiles.set(currentAttachedFiles.filter(f => f.id !== fileId));
  }

  // Enhanced file viewing methods
  async viewFile(fileId: string) {
    try {
      const fileMetadata = await this.filesService.getFileMetadata(fileId).toPromise();
      if (fileMetadata?.isImage) {
        this.openImageModal(fileMetadata);
      } else {
        // For non-image files, trigger download
        this.downloadFile(fileId);
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      this.toastService.error('Ошибка при просмотре файла');
    }
  }

  async downloadFile(fileId: string) {
    try {
      const fileMetadata = await this.filesService.getFileMetadata(fileId).toPromise();
      if (fileMetadata?.downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = fileMetadata.downloadUrl;
        link.download = fileMetadata.originalName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      this.toastService.error('Ошибка при скачивании файла');
    }
  }

  // Modal for image viewing
  imageModalVisible = false;
  currentImageMetadata: any = null;

  openImageModal(fileMetadata: any) {
    this.currentImageMetadata = fileMetadata;
    this.imageModalVisible = true;
  }

  closeImageModal() {
    this.imageModalVisible = false;
    this.currentImageMetadata = null;
  }

  downloadCurrentImage() {
    if (this.currentImageMetadata) {
      this.downloadFile(this.currentImageMetadata.id);
    }
  }

  async onSave() {
    if (this.orderForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.isUploadingFiles.set(true);

    try {
      if (this.data.isEdit && this.data.order) {
        await this.updateOrder();
      } else {
        await this.createOrder();
      }
    } catch (error) {
      console.error('Error saving order:', error);
      this.toastService.error('Ошибка сохранения заказа');
      this.isLoading.set(false);
      this.isUploadingFiles.set(false);
    }
  }

  private async createOrder() {
    const formValue = this.orderForm.value;

    // Get IDs of successfully uploaded files
    const completedUploads = this.getCompletedUploads();
    const fileIds = completedUploads
      .filter(upload => upload.uploadedFileId)
      .map(upload => upload.uploadedFileId!);

    console.log('Creating order with file IDs:', fileIds);

    // Create the order with attached files
    const orderData: CreateOrderDto = {
      title: formValue.title,
      description: formValue.description || undefined,
      organizationId: formValue.organizationId,
      location: formValue.location,
      distanceKm: formValue.distanceKm || undefined,
      territoryType: formValue.territoryType || undefined,
      plannedStartDate: formValue.plannedStartDate || undefined,
      source: formValue.source,
      files: fileIds.length > 0 ? fileIds : undefined,
    };

    this.ordersService.createOrder(orderData).subscribe({
      next: order => {
        this.toastService.success('Заказ создан успешно');
        this.clearFileData();
        this.dialogRef.close(order);
      },
      error: error => {
        console.error('Ошибка создания заказа:', error);
        this.toastService.error('Ошибка создания заказа. Попробуйте еще раз.');
        this.isLoading.set(false);
        this.isUploadingFiles.set(false);
      },
    });
  }

  private async updateOrder() {
    if (!this.data.order) return;

    const formValue = this.orderForm.value;

    // Get IDs of successfully uploaded files
    const completedUploads = this.getCompletedUploads();
    const newFileIds = completedUploads
      .filter(upload => upload.uploadedFileId)
      .map(upload => upload.uploadedFileId!);

    // Combine existing attached file IDs with new uploaded file IDs
    const existingFileIds = this.attachedFiles().map(file => file.id);
    const allFileIds = [...existingFileIds, ...newFileIds];

    console.log(
      'Updating order with file IDs:',
      allFileIds,
      '(existing:',
      existingFileIds,
      ', new:',
      newFileIds,
      ')'
    );

    const orderData: UpdateOrderDto = {
      title: formValue.title,
      description: formValue.description || undefined,
      organizationId: formValue.organizationId,
      location: formValue.location,
      distanceKm: formValue.distanceKm || undefined,
      territoryType: formValue.territoryType || undefined,
      plannedStartDate: formValue.plannedStartDate || undefined,
      source: formValue.source,
      status: formValue.status,
      actualStartDate: formValue.actualStartDate || undefined,
      completionDate: formValue.completionDate || undefined,
      files: allFileIds.length > 0 ? allFileIds : undefined,
    };

    this.ordersService.updateOrder(this.data.order.id, orderData).subscribe({
      next: order => {
        this.toastService.success('Заказ обновлен успешно');
        this.clearFileData();
        this.dialogRef.close(order);
      },
      error: error => {
        console.error('Ошибка обновления заказа:', error);
        this.toastService.error('Ошибка обновления заказа. Попробуйте еще раз.');
        this.isLoading.set(false);
        this.isUploadingFiles.set(false);
      },
    });
  }

  getCompletedUploads(): FileUploadProgress[] {
    return this.uploadProgress().filter(p => p.status === 'completed');
  }

  getUploadIndex(progressItem: FileUploadProgress): number {
    return this.uploadProgress().indexOf(progressItem);
  }

  isUploadingInProgress(): boolean {
    return this.uploadProgress().some(p => p.status === 'uploading');
  }

  private clearFileData() {
    this.selectedFiles = [];
    this.uploadProgress.set([]);
    this.isUploadingFiles.set(false);
  }

  onCancel() {
    this.clearFileData();
    this.dialogRef.close();
  }
}
