import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);

  // Add authorization header with jwt token if available
  const token = authService.getToken();

  console.log('🚀 HTTP Request:', {
    method: req.method,
    url: req.url,
    hasToken: !!token,
    shouldAddToken: shouldAddToken(req.url),
  });

  if (token && shouldAddToken(req.url)) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('🔐 Added Authorization header to request');
  }

  return next(req);
};

function shouldAddToken(url: string): boolean {
  // Don't add token to auth endpoints
  const authEndpoints = ['/api/auth/login'];
  return !authEndpoints.some(endpoint => url.includes(endpoint));
}
