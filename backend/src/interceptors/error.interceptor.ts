import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LoggerService } from '../modules/logger/logger.service';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    return next.handle().pipe(
      catchError(error => {
        // Логируем ошибку
        const errorContext = {
          method,
          url,
          userId: user?.id,
          userRole: user?.role,
          ip,
          userAgent: headers['user-agent'],
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        };

        this.logger.error(`Request failed: ${method} ${url}`, error.stack, errorContext);

        // Если это не HttpException, преобразуем в стандартную ошибку
        if (!(error instanceof HttpException)) {
          return throwError(
            () =>
              new HttpException(
                {
                  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                  message: 'Internal server error',
                  error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                },
                HttpStatus.INTERNAL_SERVER_ERROR
              )
          );
        }

        return throwError(() => error);
      })
    );
  }
}
