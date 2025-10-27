import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { environment } from '../../environments/environment';

interface VersionResponse {
  version: string;
  downloadUrl: string;
  required: boolean;
  releaseNotes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private http = inject(HttpClient);
  private currentVersion: string = environment.appVersion;
  private readonly LAST_CHECK_KEY = 'app_update_last_check';
  private readonly CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 часа

  constructor() {
    // Получаем текущую версию приложения
    this.initCurrentVersion();
  }

  /**
   * Инициализирует текущую версию приложения
   */
  private async initCurrentVersion(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const info = await App.getInfo();
        this.currentVersion = info.version;
        console.log('📱 Текущая версия приложения (native):', this.currentVersion);
      } catch (error) {
        console.warn('Не удалось получить версию приложения:', error);
        this.currentVersion = environment.appVersion;
      }
    } else {
      console.log('📱 Текущая версия приложения (web):', this.currentVersion);
    }
  }

  /**
   * Проверяет доступность новой версии приложения
   * @returns Promise с информацией о версии
   */
  async checkForUpdates(): Promise<VersionResponse | null> {
    try {
      // Проверяем только для нативных платформ (Android/iOS)
      if (!Capacitor.isNativePlatform()) {
        console.log('🌐 Веб-версия: проверка обновлений отключена');
        return null;
      }

      // Проверяем, не проверяли ли мы недавно
      const lastCheck = this.getLastCheckTime();
      const now = Date.now();
      
      if (lastCheck && (now - lastCheck) < this.CHECK_INTERVAL) {
        const hoursSinceCheck = Math.floor((now - lastCheck) / (60 * 60 * 1000));
        console.log(`⏰ Последняя проверка была ${hoursSinceCheck} часов назад. Пропускаем.`);
        return null;
      }

      console.log('🔍 Проверка обновлений. Текущая версия:', this.currentVersion);

      // Проверяем наличие новой версии на сервере
      const response = await this.http
        .get<VersionResponse>(`${environment.apiUrl}/app/version`)
        .toPromise();

      console.log('📡 Версия на сервере:', response?.version);

      // Сохраняем время проверки
      this.saveLastCheckTime();

      if (response && response.version !== this.currentVersion) {
        console.log('✅ Доступна новая версия:', response.version);
        return response;
      }

      console.log('ℹ️ Обновления не требуются');
      return null;
    } catch (error) {
      console.error('❌ Ошибка проверки обновлений:', error);
      return null;
    }
  }

  /**
   * Сохраняет время последней проверки
   */
  private saveLastCheckTime(): void {
    try {
      localStorage.setItem(this.LAST_CHECK_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Не удалось сохранить время проверки:', error);
    }
  }

  /**
   * Получает время последней проверки
   */
  private getLastCheckTime(): number | null {
    try {
      const lastCheck = localStorage.getItem(this.LAST_CHECK_KEY);
      return lastCheck ? parseInt(lastCheck, 10) : null;
    } catch (error) {
      console.warn('Не удалось получить время проверки:', error);
      return null;
    }
  }

  /**
   * Загружает и устанавливает обновление для Android
   */
  async downloadAndInstall(url: string): Promise<void> {
    try {
      console.log('📥 Загрузка обновления с:', url);

      if (Capacitor.isNativePlatform()) {
        // Для нативного приложения используем window.open с '_system'
        // Android автоматически предложит установить APK
        const link = document.createElement('a');
        link.href = url;
        link.target = '_system';
        link.click();
        
        console.log('✅ Обновление запущено на скачивание');
      } else {
        // Для веб-версии открываем в новой вкладке
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки обновления:', error);
      // Fallback: пытаемся открыть URL напрямую
      window.open(url, Capacitor.isNativePlatform() ? '_system' : '_blank');
    }
  }

  /**
   * Получает текущую версию приложения
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }
}

