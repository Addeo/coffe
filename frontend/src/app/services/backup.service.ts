import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BackupMetadata {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  createdAt: Date;
  type: 'mysql' | 'sqlite';
}

export interface BackupListResponse {
  backups: BackupMetadata[];
}

export interface BackupCreateResponse {
  message: string;
  backupPath: string;
}

export interface BackupUploadResponse {
  success: boolean;
  message: string;
  fileName: string;
  size: number;
  originalName: string;
}

export interface BackupRestoreResponse {
  success: boolean;
  message: string;
}

export interface BackupDeleteResponse {
  success: boolean;
  message: string;
}

export interface BackupCleanupResponse {
  message: string;
  deletedCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/backup`;

  /**
   * Создать новый бэкап базы данных
   */
  createBackup(): Observable<BackupCreateResponse> {
    return this.http.post<BackupCreateResponse>(`${this.apiUrl}/create`, {});
  }

  /**
   * Получить список всех бэкапов с метаданными
   */
  listBackups(): Observable<BackupListResponse> {
    return this.http.get<BackupListResponse>(`${this.apiUrl}/list`);
  }

  /**
   * Загрузить файл бэкапа на сервер
   * @param file Файл бэкапа (.sql или .sqlite)
   * @param onProgress Callback для отслеживания прогресса загрузки
   */
  uploadBackup(file: File, onProgress?: (progress: number) => void): Observable<BackupUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<BackupUploadResponse>(`${this.apiUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'body'
    });
  }

  /**
   * Восстановить базу данных из бэкапа
   * ⚠️ ВНИМАНИЕ: Эта операция перезапишет текущую базу данных!
   * @param fileName Имя файла бэкапа
   */
  restoreBackup(fileName: string): Observable<BackupRestoreResponse> {
    return this.http.post<BackupRestoreResponse>(`${this.apiUrl}/restore/${fileName}`, {});
  }

  /**
   * Скачать файл бэкапа
   * @param fileName Имя файла бэкапа
   */
  downloadBackup(fileName: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/download/${fileName}`, {
      responseType: 'blob'
    });
  }

  /**
   * Удалить файл бэкапа
   * @param fileName Имя файла бэкапа
   */
  deleteBackup(fileName: string): Observable<BackupDeleteResponse> {
    return this.http.delete<BackupDeleteResponse>(`${this.apiUrl}/${fileName}`);
  }

  /**
   * Очистить старые бэкапы
   * @param keepDays Количество дней для хранения (по умолчанию: 30)
   */
  cleanupOldBackups(keepDays: number = 30): Observable<BackupCleanupResponse> {
    return this.http.delete<BackupCleanupResponse>(`${this.apiUrl}/cleanup?keepDays=${keepDays}`);
  }

  /**
   * Скачать бэкап и сохранить локально
   * @param fileName Имя файла бэкапа
   */
  downloadAndSaveBackup(fileName: string): void {
    this.downloadBackup(fileName).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Failed to download backup:', err);
        throw err;
      }
    });
  }

  /**
   * Валидация файла перед загрузкой
   * @param file Файл для проверки
   * @returns Объект с результатом валидации
   */
  validateBackupFile(file: File): { valid: boolean; error?: string } {
    // Проверка расширения
    const allowedExtensions = ['.sql', '.sqlite'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `Invalid file type. Only ${allowedExtensions.join(', ')} files are allowed`
      };
    }

    // Проверка размера (макс 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 100MB limit'
      };
    }

    return { valid: true };
  }
}

