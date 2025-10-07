import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MaterialModule } from '../../shared/material/material.module';
import { BackupService, BackupMetadata } from '../../services/backup.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-backups',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './backups.component.html',
  styleUrls: ['./backups.component.scss'],
})
export class BackupsComponent implements OnInit {
  private backupService = inject(BackupService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  // Signals
  backups = signal<BackupMetadata[]>([]);
  isLoading = signal(false);
  isCreating = signal(false);
  isUploading = signal(false);
  uploadProgress = signal(0);
  selectedFile = signal<File | null>(null);

  // Computed
  hasBackups = computed(() => this.backups().length > 0);
  canManageBackups = this.authService.isAdmin();
  
  totalBackupSize = computed(() => {
    const totalBytes = this.backups().reduce((sum, backup) => sum + backup.size, 0);
    return this.formatBytes(totalBytes);
  });

  ngOnInit() {
    if (this.canManageBackups) {
      this.loadBackups();
    }
  }

  /**
   * Загрузить список бэкапов
   */
  loadBackups() {
    this.isLoading.set(true);
    this.backupService.listBackups().subscribe({
      next: (response) => {
        this.backups.set(response.backups);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load backups:', err);
        this.toastService.showError('Не удалось загрузить список бэкапов');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Создать новый бэкап
   */
  createBackup() {
    if (this.isCreating()) return;

    const confirmed = confirm(
      'Создать бэкап базы данных?\n\n' +
      'Это может занять несколько минут в зависимости от размера базы данных.'
    );

    if (!confirmed) return;

    this.isCreating.set(true);
    this.toastService.showInfo('Создание бэкапа... Пожалуйста, подождите');

    this.backupService.createBackup().subscribe({
      next: (response) => {
        this.isCreating.set(false);
        this.toastService.showSuccess('Бэкап успешно создан');
        this.loadBackups(); // Обновить список
      },
      error: (err) => {
        console.error('Failed to create backup:', err);
        this.isCreating.set(false);
        this.toastService.showError('Не удалось создать бэкап');
      }
    });
  }

  /**
   * Обработка выбора файла
   */
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    // Валидация
    const validation = this.backupService.validateBackupFile(file);
    if (!validation.valid) {
      this.toastService.showError(validation.error || 'Неверный файл');
      return;
    }

    this.selectedFile.set(file);
    this.uploadBackup(file);
  }

  /**
   * Загрузить файл бэкапа
   */
  uploadBackup(file: File) {
    if (this.isUploading()) return;

    this.isUploading.set(true);
    this.uploadProgress.set(0);

    this.backupService.uploadBackup(file).subscribe({
      next: (response) => {
        this.isUploading.set(false);
        this.uploadProgress.set(100);
        this.selectedFile.set(null);
        this.toastService.showSuccess(`Файл "${response.fileName}" успешно загружен`);
        this.loadBackups(); // Обновить список
      },
      error: (err) => {
        console.error('Failed to upload backup:', err);
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.toastService.showError('Не удалось загрузить файл бэкапа');
      }
    });
  }

  /**
   * Восстановить из бэкапа
   */
  restoreBackup(backup: BackupMetadata) {
    const confirmed = confirm(
      `⚠️ ВНИМАНИЕ: Это действие перезапишет текущую базу данных!\n\n` +
      `Вы уверены, что хотите восстановить базу из бэкапа:\n${backup.name}?\n\n` +
      `Размер: ${backup.sizeFormatted}\n` +
      `Дата: ${new Date(backup.createdAt).toLocaleString('ru-RU')}\n\n` +
      `Рекомендуется создать текущий бэкап перед восстановлением.`
    );

    if (!confirmed) return;

    // Двойное подтверждение для безопасности
    const doubleConfirmed = confirm(
      '⚠️ ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ!\n\n' +
      'Вы действительно хотите продолжить восстановление?\n' +
      'Все текущие данные будут потеряны!'
    );

    if (!doubleConfirmed) return;

    this.isLoading.set(true);
    this.toastService.showInfo('Восстановление базы данных... Это может занять несколько минут');

    this.backupService.restoreBackup(backup.name).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.toastService.showSuccess(
          'База данных успешно восстановлена! Страница будет перезагружена через 3 секунды'
        );
        
        // Перезагрузка страницы через 3 секунды
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      },
      error: (err) => {
        console.error('Failed to restore backup:', err);
        this.isLoading.set(false);
        this.toastService.showError('Не удалось восстановить базу данных из бэкапа');
      }
    });
  }

  /**
   * Скачать бэкап
   */
  downloadBackup(backup: BackupMetadata) {
    this.toastService.showInfo(`Скачивание "${backup.name}"...`);
    
    try {
      this.backupService.downloadAndSaveBackup(backup.name);
      this.toastService.showSuccess('Файл успешно скачан');
    } catch (err) {
      console.error('Failed to download backup:', err);
      this.toastService.showError('Не удалось скачать файл бэкапа');
    }
  }

  /**
   * Удалить бэкап
   */
  deleteBackup(backup: BackupMetadata) {
    const confirmed = confirm(
      `Удалить бэкап "${backup.name}"?\n\n` +
      `Размер: ${backup.sizeFormatted}\n` +
      `Дата: ${new Date(backup.createdAt).toLocaleString('ru-RU')}\n\n` +
      `Это действие необратимо!`
    );

    if (!confirmed) return;

    this.isLoading.set(true);

    this.backupService.deleteBackup(backup.name).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.toastService.showSuccess('Бэкап успешно удален');
        this.loadBackups(); // Обновить список
      },
      error: (err) => {
        console.error('Failed to delete backup:', err);
        this.isLoading.set(false);
        this.toastService.showError('Не удалось удалить бэкап');
      }
    });
  }

  /**
   * Очистить старые бэкапы
   */
  cleanupOldBackups() {
    const keepDays = prompt(
      'Удалить бэкапы старше (дней):\n\n' +
      'Введите количество дней. Бэкапы старше этого срока будут удалены.',
      '30'
    );

    if (!keepDays) return;

    const days = parseInt(keepDays, 10);
    if (isNaN(days) || days < 1) {
      this.toastService.showError('Неверное количество дней');
      return;
    }

    const confirmed = confirm(
      `Удалить все бэкапы старше ${days} дней?\n\n` +
      `Это действие необратимо!`
    );

    if (!confirmed) return;

    this.isLoading.set(true);

    this.backupService.cleanupOldBackups(days).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.toastService.showSuccess(`Удалено ${response.deletedCount} старых бэкапов`);
        this.loadBackups(); // Обновить список
      },
      error: (err) => {
        console.error('Failed to cleanup backups:', err);
        this.isLoading.set(false);
        this.toastService.showError('Не удалось очистить старые бэкапы');
      }
    });
  }

  /**
   * Получить иконку для типа бэкапа
   */
  getBackupIcon(type: string): string {
    return type === 'mysql' ? 'storage' : 'database';
  }

  /**
   * Получить цвет для типа бэкапа
   */
  getBackupColor(type: string): string {
    return type === 'mysql' ? 'primary' : 'accent';
  }

  /**
   * Форматировать байты в читаемый вид
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Форматировать дату
   */
  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Получить относительное время
   */
  getRelativeTime(date: Date | string): string {
    const now = new Date();
    const backupDate = new Date(date);
    const diffMs = now.getTime() - backupDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 30) return `${diffDays} дн. назад`;
    
    return this.formatDate(date);
  }
}

