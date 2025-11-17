import { HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { ErrorHandlerUtil } from '../utils/error-handler.util';

export const httpRequestInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const authService = inject(AuthService);

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
      const errorDetails = ErrorHandlerUtil.getErrorDetails(error);
      console.error('💥 HTTP Error:', {
        url: req.url,
        method: req.method,
        ...errorDetails,
      });

      // Получаем пользовательское сообщение об ошибке
      const errorMessage = ErrorHandlerUtil.getErrorMessage(error);

      // Для запроса логина не показываем toast здесь - компонент сам покажет ошибку
      const isLoginRequest = req.url.includes('/auth/login');

      if (error.status === 401) {
        if (isLoginRequest) {
          // Для логина не показываем toast здесь - компонент сам обработает
          // Просто обновляем ошибку с пользовательским сообщением
        } else {
          // Для всех других запросов с 401 - выходим из системы только если пользователь был авторизован
          if (authService.isAuthenticated()) {
            toastService.warning(errorMessage);

            // Выходим из системы и перенаправляем на страницу логина
            setTimeout(() => {
              authService.logout();
            }, 500);
          }
        }
      } else if (error.status >= 500) {
        // Серверные ошибки - показываем toast
        toastService.error(errorMessage);
      } else if (error.status === 403) {
        // Ошибки доступа - показываем предупреждение
        toastService.warning(errorMessage);
      }
      // Для остальных ошибок (400, 404, 422 и т.д.) компоненты сами покажут сообщения
      // Это позволяет компонентам показывать более контекстные сообщения

      // Создаем новую ошибку с пользовательским сообщением для компонентов
      const userFriendlyError = new HttpErrorResponse({
        error: { message: errorMessage },
        status: error.status,
        statusText: error.statusText,
        url: error.url ?? undefined,
      });

      return throwError(() => userFriendlyError);
    })
  );
};
