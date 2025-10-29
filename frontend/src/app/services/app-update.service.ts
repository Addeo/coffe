import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { firstValueFrom } from 'rxjs';
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
      console.log('🔍 Начинаем проверку обновлений...');
      console.log('📱 Платформа:', Capacitor.getPlatform());
      console.log('🌐 Нативная платформа:', Capacitor.isNativePlatform());
      console.log('📱 Текущая версия:', this.currentVersion);
      console.log('🌐 API URL:', environment.apiUrl);

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
      console.log('🌐 Запрос к:', `${environment.apiUrl}/app/version`);

      // Проверяем наличие новой версии на сервере
      const response = await firstValueFrom(
        this.http.get<VersionResponse>(`${environment.apiUrl}/app/version`)
      );

      console.log('📡 Получен ответ от сервера:', response);

      // Сохраняем время проверки
      this.saveLastCheckTime();

      if (response && response.version !== this.currentVersion) {
        console.log('✅ Доступна новая версия:', response.version);
        console.log('📥 URL для скачивания:', response.downloadUrl);
        console.log('⚠️ Обязательное обновление:', response.required);
        
        // Проверяем, что URL не пустой
        if (!response.downloadUrl || response.downloadUrl.trim() === '') {
          console.error('❌ URL для скачивания пустой!');
          return null;
        }
        
        return response;
      }

      console.log('ℹ️ Обновления не требуются');
      return null;
    } catch (error) {
      console.error('❌ Ошибка проверки обновлений:', error);
      console.error('❌ Детали ошибки:', {
        message: (error as any).message,
        status: (error as any).status,
        url: (error as any).url,
        stack: (error as any).stack
      });
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
      
      // Проверяем, что URL не пустой
      if (!url || url.trim() === '') {
        console.error('❌ URL для скачивания пустой!');
        alert('Ошибка: ссылка для скачивания обновления не найдена. Обратитесь к администратору.');
        return;
      }

      if (Capacitor.isNativePlatform()) {
        // Для нативного приложения используем несколько методов
        try {
          // Метод 1: Пытаемся открыть APK файл напрямую для установки
          console.log('📱 Открываем APK файл для установки...');
          
          // Создаем intent для установки APK
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ 
            url, 
            windowName: '_system',
            presentationStyle: 'fullscreen'
          });
          
          console.log('✅ APK файл открыт для установки через системный браузер');
          console.log('📱 Android должен показать диалог установки приложения');
          
        } catch (browserError) {
          console.warn('Capacitor Browser недоступен, используем fallback:', browserError);
          
          // Метод 2: Fallback через window.open с правильным intent
          const link = document.createElement('a');
          link.href = url;
          link.target = '_system';
          link.rel = 'noopener noreferrer';
          link.download = 'app-update.apk'; // Указываем имя файла
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          console.log('✅ APK файл запущен через fallback метод');
        }
      } else {
        // Для веб-версии открываем в новой вкладке
        window.open(url, '_blank');
        console.log('✅ Обновление открыто в новой вкладке');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки обновления:', error);
      // Последний fallback: пытаемся открыть URL напрямую
      try {
        window.open(url, Capacitor.isNativePlatform() ? '_system' : '_blank');
        console.log('✅ Обновление открыто через последний fallback');
      } catch (finalError) {
        console.error('❌ Критическая ошибка при открытии обновления:', finalError);
        alert('Не удалось открыть ссылку на обновление. Попробуйте скопировать ссылку вручную.');
      }
    }
  }

  /**
   * Получает текущую версию приложения
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Принудительно проверяет обновления (игнорирует интервал)
   */
  async forceCheckForUpdates(): Promise<VersionResponse | null> {
    console.log('🔄 Принудительная проверка обновлений...');
    
    // Временно очищаем время последней проверки
    const originalLastCheck = this.getLastCheckTime();
    localStorage.removeItem(this.LAST_CHECK_KEY);
    
    try {
      const result = await this.checkForUpdates();
      return result;
    } finally {
      // Восстанавливаем время последней проверки
      if (originalLastCheck) {
        localStorage.setItem(this.LAST_CHECK_KEY, originalLastCheck.toString());
      }
    }
  }

  /**
   * Очищает кэш проверки обновлений
   */
  clearUpdateCache(): void {
    localStorage.removeItem(this.LAST_CHECK_KEY);
    console.log('🗑️ Кэш проверки обновлений очищен');
  }
}

