import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AppUpdateComponent } from '../components/app-update/app-update.component';
import { AppUpdateService } from './app-update.service';

@Injectable({
  providedIn: 'root',
})
export class StartupService {
  private updateService = inject(AppUpdateService);
  private dialog = inject(MatDialog);

  /**
   * Проверяет наличие обновлений при старте приложения
   */
  async checkForUpdates(): Promise<void> {
    try {
      const versionInfo = await this.updateService.checkForUpdates();
      
      if (versionInfo) {
        console.log('📢 Доступно обновление:', versionInfo.version);
        
        // Показываем диалог обновления
        const dialogRef = this.dialog.open(AppUpdateComponent, {
          width: '400px',
          disableClose: versionInfo.required, // Если обязательно, нельзя закрыть
          data: versionInfo,
        });

        dialogRef.afterClosed().subscribe(async (shouldUpdate: boolean) => {
          if (shouldUpdate) {
            console.log('✅ Пользователь согласился на обновление');
            await this.updateService.downloadAndInstall(versionInfo.downloadUrl);
          } else if (versionInfo.required) {
            console.log('⚠️ Обновление обязательно, выход из приложения');
            // Если обновление обязательно, выходим из приложения
            const { App } = await import('@capacitor/app');
            await App.exitApp();
          } else {
            console.log('❌ Пользователь отменил обновление');
          }
        });
      } else {
        console.log('ℹ️ Обновления не требуются');
      }
    } catch (error) {
      console.error('❌ Ошибка проверки обновлений при старте:', error);
    }
  }
}

