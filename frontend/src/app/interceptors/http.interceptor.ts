import { HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export const httpRequestInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('🚀 HTTP Request:', {
    method: req.method,
    url: req.url,
    headers: req.headers.keys().reduce((acc, key) => {
      acc[key] = req.headers.get(key);
      return acc;
    }, {} as any),
    body: req.method !== 'GET' ? req.body : undefined,
    withCredentials: req.withCredentials
  });

  return next(req).pipe(
    tap(event => {
      if (event.type === 4) { // HttpResponse
        console.log('📥 HTTP Response:', {
          url: req.url,
          status: (event as any).status,
          statusText: (event as any).statusText,
          body: (event as any).body
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
        error: error.error
      });
      return throwError(() => error);
    })
  );
};
