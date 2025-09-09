import { HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';

export const httpRequestInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  console.log('🚀 HTTP Request:', {
    method: req.method,
    url: req.url,
    headers: req.headers.keys().reduce((acc, key) => {
      acc[key] = req.headers.get(key);
      return acc;
    }, {} as any),
    body: req.method !== 'GET' ? req.body : undefined,
    withCredentials: req.withCredentials,
  });

  return next(req).pipe(
    tap(event => {
      if (event.type === 4) {
        // HttpResponse
        console.log('📥 HTTP Response:', {
          url: req.url,
          status: (event as any).status,
          statusText: (event as any).statusText,
          body: (event as any).body,
        });
      }
    }),
    catchError((error: HttpErrorResponse) => {
      console.error('💥 HTTP Error:', {
        url: req.url,
        method: req.method,
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        error: error.error,
      });

      // Показываем toast уведомление для HTTP ошибок
      let errorMessage = 'Произошла ошибка при выполнении запроса';

      if (error.status === 401) {
        errorMessage = 'Неверные учетные данные';
        toastService.error(errorMessage);
      } else if (error.status === 403) {
        errorMessage = 'Недостаточно прав доступа';
        toastService.warning(errorMessage);
      } else if (error.status === 404) {
        errorMessage = 'Ресурс не найден';
        toastService.warning(errorMessage);
      } else if (error.status === 500) {
        errorMessage = 'Внутренняя ошибка сервера';
        toastService.error(errorMessage);
      } else if (error.status >= 400 && error.status < 500) {
        // Клиентские ошибки
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        toastService.error(errorMessage);
      } else if (error.status >= 500) {
        // Серверные ошибки
        toastService.error('Ошибка сервера. Попробуйте позже.');
      } else {
        // Сетевые ошибки
        toastService.error('Проблема с подключением к серверу');
      }

      return throwError(() => error);
    })
  );
};
