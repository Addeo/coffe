import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule } from '@angular/forms';
import { FilesService } from '../../services/files.service';
import { ToastService } from '../../services/toast.service';
import { FileType, FileResponseDto } from '@shared/dtos/file.dto';

interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  uploadedFileId?: string;
}

@Component({
  selector: 'app-files',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatTooltipModule,
    MatProgressBarModule,
    FormsModule,
  ],
  template: `
    <div class="files-page">
      <div class="page-header">
        <h1>Управление файлами</h1>
        <div class="header-actions">
          <input
            type="file"
            #fileInput
            (change)="onFileSelected($event)"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
            style="display: none"
          />
          <button
            mat-raised-button
            color="primary"
            (click)="fileInput.click()"
            [disabled]="isUploadingInProgress()"
          >
            <mat-icon>add</mat-icon>
            Загрузить файлы
          </button>
          <button mat-raised-button (click)="loadFiles()">
            <mat-icon>refresh</mat-icon>
            Обновить
          </button>
        </div>
      </div>

      <!-- Upload Progress -->
      <div class="upload-section" *ngIf="uploadProgress().length > 0">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Загрузка файлов</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="progress-list">
              <div class="progress-item" *ngFor="let progress of uploadProgress()">
                <div class="progress-header">
                  <span class="file-name">{{ progress.file.name }}</span>
                  <span class="file-size"
                    >({{ (progress.file.size / 1024 / 1024).toFixed(2) }} MB)</span
                  >
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
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters">
            <mat-form-field appearance="outline">
              <mat-label>Тип файла</mat-label>
              <mat-select [(ngModel)]="selectedType" (ngModelChange)="loadFiles()">
                <mat-option [value]="null">Все типы</mat-option>
                <mat-option [value]="FileType.ORDER_PHOTO">Фото заказа</mat-option>
                <mat-option [value]="FileType.WORK_REPORT">Отчет о работе</mat-option>
                <mat-option [value]="FileType.AVATAR">Аватар</mat-option>
                <mat-option [value]="FileType.DOCUMENT">Документ</mat-option>
                <mat-option [value]="FileType.OTHER">Другое</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Поиск</mat-label>
              <input
                matInput
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange()"
                placeholder="Имя файла..."
              />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Files Table -->
      <mat-card class="files-card">
        <mat-card-content>
          <div class="loading-container" *ngIf="isLoading()">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <div class="files-table" *ngIf="!isLoading()">
            <div class="stats">
              <span>Всего файлов: {{ filteredFiles().length }}</span>
              <span
                >Общий размер:
                {{ (getTotalSize() / 1024 / 1024).toFixed(2) }} MB</span
              >
            </div>

            <table mat-table [dataSource]="filteredFiles()" class="files-table-element">
              <!-- Preview Column -->
              <ng-container matColumnDef="preview">
                <th mat-header-cell *matHeaderCellDef>Превью</th>
                <td mat-cell *matCellDef="let file">
                  <div class="file-preview">
                    <img
                      *ngIf="isImage(file.mimetype)"
                      [src]="getFileUrl(file.id)"
                      [alt]="file.originalName"
                      class="preview-image"
                      (error)="onImageError($event)"
                    />
                    <mat-icon *ngIf="!isImage(file.mimetype)" class="file-icon">{{
                      getFileIcon(file.mimetype)
                    }}</mat-icon>
                  </div>
                </td>
              </ng-container>

              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Название</th>
                <td mat-cell *matCellDef="let file">
                  <div class="file-info">
                    <strong>{{ file.originalName }}</strong>
                    <small>{{ file.filename }}</small>
                  </div>
                </td>
              </ng-container>

              <!-- Type Column -->
              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Тип</th>
                <td mat-cell *matCellDef="let file">
                  <mat-chip [class]="'type-' + file.type">{{
                    getFileTypeLabel(file.type)
                  }}</mat-chip>
                </td>
              </ng-container>

              <!-- Size Column -->
              <ng-container matColumnDef="size">
                <th mat-header-cell *matHeaderCellDef>Размер</th>
                <td mat-cell *matCellDef="let file">
                  {{ (file.size / 1024 / 1024).toFixed(2) }} MB
                </td>
              </ng-container>

              <!-- Order Column -->
              <ng-container matColumnDef="order">
                <th mat-header-cell *matHeaderCellDef>Заказ</th>
                <td mat-cell *matCellDef="let file">
                  <span *ngIf="file.order">{{ file.order.title }}</span>
                  <span *ngIf="!file.order" class="no-order">Не прикреплен</span>
                </td>
              </ng-container>

              <!-- Uploaded By Column -->
              <ng-container matColumnDef="uploadedBy">
                <th mat-header-cell *matHeaderCellDef>Загрузил</th>
                <td mat-cell *matCellDef="let file">
                  {{ file.uploadedBy?.name || 'Неизвестно' }}
                </td>
              </ng-container>

              <!-- Date Column -->
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Дата</th>
                <td mat-cell *matCellDef="let file">
                  {{ file.uploadedAt | date: 'dd.MM.yyyy HH:mm' }}
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Действия</th>
                <td mat-cell *matCellDef="let file">
                  <button
                    mat-icon-button
                    [matTooltip]="'Просмотр'"
                    (click)="viewFile(file)"
                  >
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    [matTooltip]="'Скачать'"
                    (click)="downloadFile(file)"
                  >
                    <mat-icon>download</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    [matTooltip]="'Удалить'"
                    color="warn"
                    (click)="deleteFile(file)"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>

            <div class="no-files" *ngIf="filteredFiles().length === 0">
              <mat-icon>cloud_off</mat-icon>
              <p>Файлы не найдены</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .files-page {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .page-header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 500;
        color: #1976d2;
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }

      .upload-section {
        margin-bottom: 24px;
      }

      .progress-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .progress-item {
        padding: 12px;
        background-color: #f5f5f5;
        border-radius: 8px;
      }

      .progress-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .file-name {
        flex: 1;
        font-weight: 500;
      }

      .file-size {
        font-size: 12px;
        color: #666;
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

      .error-message {
        color: #d32f2f;
        font-size: 12px;
        margin-top: 4px;
      }

      .filters-card {
        margin-bottom: 24px;
      }

      .filters {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }

      .filters mat-form-field {
        flex: 1;
        min-width: 200px;
      }

      .files-card {
        min-height: 400px;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
      }

      .stats {
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
        padding: 12px;
        background-color: #f5f5f5;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
      }

      .files-table-element {
        width: 100%;
      }

      .file-preview {
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #f5f5f5;
        border-radius: 8px;
        overflow: hidden;
      }

      .preview-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .file-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: #666;
      }

      .file-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .file-info small {
        color: #666;
        font-size: 12px;
      }

      .no-order {
        color: #999;
        font-style: italic;
      }

      mat-chip {
        font-size: 12px !important;
      }

      .type-ORDER_PHOTO {
        background-color: #e3f2fd !important;
        color: #1976d2 !important;
      }

      .type-WORK_REPORT {
        background-color: #f3e5f5 !important;
        color: #7b1fa2 !important;
      }

      .type-AVATAR {
        background-color: #fff3e0 !important;
        color: #f57c00 !important;
      }

      .type-DOCUMENT {
        background-color: #e8f5e9 !important;
        color: #388e3c !important;
      }

      .type-OTHER {
        background-color: #f5f5f5 !important;
        color: #666 !important;
      }

      .no-files {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: #999;
      }

      .no-files mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
      }

      @media (max-width: 768px) {
        .page-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }

        .header-actions {
          width: 100%;
          flex-direction: column;
        }

        .header-actions button {
          width: 100%;
        }
      }
    `,
  ],
})
export class FilesComponent implements OnInit {
  private filesService = inject(FilesService);
  private toastService = inject(ToastService);

  files = signal<FileResponseDto[]>([]);
  filteredFiles = signal<FileResponseDto[]>([]);
  isLoading = signal(false);
  uploadProgress = signal<FileUploadProgress[]>([]);

  selectedType: FileType | null = null;
  searchQuery = '';

  FileType = FileType;

  displayedColumns: string[] = [
    'preview',
    'name',
    'type',
    'size',
    'order',
    'uploadedBy',
    'date',
    'actions',
  ];

  ngOnInit() {
    this.loadFiles();
  }

  loadFiles() {
    this.isLoading.set(true);
    this.filesService.getAllFiles().subscribe({
      next: files => {
        this.files.set(files);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Error loading files:', error);
        this.toastService.error('Ошибка загрузки файлов');
        this.isLoading.set(false);
      },
    });
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.uploadFiles(Array.from(files));
    }
  }

  private async uploadFiles(files: File[]) {
    for (const file of files) {
      await this.uploadFile(file);
    }
  }

  private async uploadFile(file: File) {
    const progressItem: FileUploadProgress = {
      file,
      progress: 0,
      status: 'uploading',
    };

    this.uploadProgress.set([...this.uploadProgress(), progressItem]);

    try {
      const uploadedFile = await this.filesService
        .uploadFile(file, FileType.OTHER)
        .toPromise();

      if (uploadedFile) {
        progressItem.progress = 100;
        progressItem.status = 'completed';
        progressItem.uploadedFileId = uploadedFile.id;
        this.toastService.success(`Файл "${file.name}" загружен успешно`);

        // Reload files list
        this.loadFiles();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      progressItem.status = 'error';
      progressItem.error = 'Ошибка загрузки';
      this.toastService.error(`Ошибка загрузки файла: ${file.name}`);
    }

    // Update progress
    const currentProgress = this.uploadProgress();
    const index = currentProgress.findIndex(p => p.file === file);
    if (index !== -1) {
      currentProgress[index] = progressItem;
      this.uploadProgress.set([...currentProgress]);
    }

    // Remove completed/error uploads after 3 seconds
    setTimeout(() => {
      const filtered = this.uploadProgress().filter(
        p => p.status === 'uploading' || p.status === 'pending'
      );
      this.uploadProgress.set(filtered);
    }, 3000);
  }

  isUploadingInProgress(): boolean {
    return this.uploadProgress().some(p => p.status === 'uploading');
  }

  applyFilters() {
    let filtered = [...this.files()];

    // Filter by type
    if (this.selectedType) {
      filtered = filtered.filter(f => f.type === this.selectedType);
    }

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        f =>
          f.originalName.toLowerCase().includes(query) ||
          f.filename.toLowerCase().includes(query)
      );
    }

    this.filteredFiles.set(filtered);
  }

  onSearchChange() {
    this.applyFilters();
  }

  getTotalSize(): number {
    return this.filteredFiles().reduce((sum, file) => sum + file.size, 0);
  }

  isImage(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  getFileUrl(fileId: string): string {
    return `http://localhost:3001/api/files/view/${fileId}`;
  }

  onImageError(event: any) {
    event.target.style.display = 'none';
  }

  getFileIcon(mimetype: string): string {
    if (mimetype.includes('pdf')) return 'picture_as_pdf';
    if (mimetype.includes('word')) return 'description';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'table_chart';
    if (mimetype.includes('text')) return 'article';
    return 'insert_drive_file';
  }

  getFileTypeLabel(type: FileType): string {
    const labels: Record<FileType, string> = {
      [FileType.ORDER_PHOTO]: 'Фото заказа',
      [FileType.ORDER_BEFORE]: 'Фото до работы',
      [FileType.ORDER_AFTER]: 'Фото после работы',
      [FileType.WORK_REPORT]: 'Отчет',
      [FileType.AVATAR]: 'Аватар',
      [FileType.DOCUMENT]: 'Документ',
      [FileType.IMAGE]: 'Изображение',
      [FileType.OTHER]: 'Другое',
    };
    return labels[type] || type;
  }

  viewFile(file: FileResponseDto) {
    window.open(this.getFileUrl(file.id), '_blank');
  }

  downloadFile(file: FileResponseDto) {
    this.filesService.downloadFile(file.id).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.originalName;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.success('Файл загружен');
      },
      error: error => {
        console.error('Error downloading file:', error);
        this.toastService.error('Ошибка скачивания файла');
      },
    });
  }

  deleteFile(file: FileResponseDto) {
    if (!confirm(`Вы уверены, что хотите удалить файл "${file.originalName}"?`)) {
      return;
    }

    this.filesService.deleteFile(file.id).subscribe({
      next: () => {
        this.toastService.success('Файл удален');
        this.loadFiles();
      },
      error: error => {
        console.error('Error deleting file:', error);
        this.toastService.error('Ошибка удаления файла');
      },
    });
  }
}
