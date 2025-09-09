import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private snackBar = inject(MatSnackBar);

  private defaultConfig: MatSnackBarConfig = {
    duration: 5000,
    horizontalPosition: 'center',
    verticalPosition: 'top',
  };

  /**
   * Показать уведомление об успехе
   */
  success(message: string, action?: string, config?: Partial<MatSnackBarConfig>) {
    const finalConfig = { ...this.defaultConfig, ...config };
    return this.snackBar.open(message, action || 'OK', {
      ...finalConfig,
      panelClass: ['toast-success'],
    });
  }

  /**
   * Показать уведомление об ошибке
   */
  error(message: string, action?: string, config?: Partial<MatSnackBarConfig>) {
    const finalConfig = { ...this.defaultConfig, ...config };
    return this.snackBar.open(message, action || 'Закрыть', {
      ...finalConfig,
      panelClass: ['toast-error'],
    });
  }

  /**
   * Показать информационное уведомление
   */
  info(message: string, action?: string, config?: Partial<MatSnackBarConfig>) {
    const finalConfig = { ...this.defaultConfig, ...config };
    return this.snackBar.open(message, action || 'OK', {
      ...finalConfig,
      panelClass: ['toast-info'],
    });
  }

  /**
   * Показать предупреждение
   */
  warning(message: string, action?: string, config?: Partial<MatSnackBarConfig>) {
    const finalConfig = { ...this.defaultConfig, ...config };
    return this.snackBar.open(message, action || 'OK', {
      ...finalConfig,
      panelClass: ['toast-warning'],
    });
  }

  /**
   * Закрыть все уведомления
   */
  dismiss() {
    this.snackBar.dismiss();
  }

  /**
   * Показать уведомление об успехе (alias для success)
   */
  showSuccess(message: string, action?: string, config?: Partial<MatSnackBarConfig>) {
    return this.success(message, action, config);
  }

  /**
   * Показать уведомление об ошибке (alias для error)
   */
  showError(message: string, action?: string, config?: Partial<MatSnackBarConfig>) {
    return this.error(message, action, config);
  }

  /**
   * Показать информационное уведомление (alias для info)
   */
  showInfo(message: string, action?: string, config?: Partial<MatSnackBarConfig>) {
    return this.info(message, action, config);
  }

  /**
   * Показать предупреждение (alias для warning)
   */
  showWarning(message: string, action?: string, config?: Partial<MatSnackBarConfig>) {
    return this.warning(message, action, config);
  }
}
