import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = {};
    let stack: string | undefined;

    // Handle HttpException (known errors)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errorDetails = responseObj;
      }

      // Get original message from nested exceptions
      if (exception.message) {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      // Handle generic Error objects
      message = exception.message || message;
      errorDetails = {
        name: exception.name,
        message: exception.message,
      };
      stack = exception.stack;

      // Try to extract more information from common error types
      if (exception.name === 'TypeError') {
        message = `Type Error: ${exception.message}`;
      } else if (exception.name === 'ReferenceError') {
        message = `Reference Error: ${exception.message}`;
      } else if (exception.name === 'ValidationError') {
        message = `Validation Error: ${exception.message}`;
        status = HttpStatus.BAD_REQUEST;
      }
    }

    // Log error details
    const errorLog = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message,
      error: errorDetails,
      userId: (request as any).user?.id,
      userRole: (request as any).user?.role,
    };

    // Get stack trace safely
    const finalStack = stack || (exception instanceof Error ? exception.stack : undefined);
    
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      finalStack,
      errorLog
    );

    // Prepare response
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message,
    };

    // Add error details based on environment
    if (isDevelopment) {
      // In development, show everything
      errorResponse.error = {
        name: exception instanceof Error ? exception.name : 'Unknown',
        message: message,
        details: errorDetails,
        stack: stack,
      };
    } else {
      // In production, show safe information
      errorResponse.error = {
        message: message,
      };

      // Add specific error codes for common scenarios
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        errorResponse.error.code = 'INTERNAL_ERROR';
        errorResponse.error.message = message || 'An unexpected error occurred';
      } else if (status === HttpStatus.BAD_REQUEST) {
        errorResponse.error.code = 'BAD_REQUEST';
        if (errorDetails.validationErrors) {
          errorResponse.error.validationErrors = errorDetails.validationErrors;
        }
      } else if (status === HttpStatus.UNAUTHORIZED) {
        errorResponse.error.code = 'UNAUTHORIZED';
      } else if (status === HttpStatus.FORBIDDEN) {
        errorResponse.error.code = 'FORBIDDEN';
      } else if (status === HttpStatus.NOT_FOUND) {
        errorResponse.error.code = 'NOT_FOUND';
      }

      // Include database error messages if safe (don't expose connection details)
      if (errorDetails.code && errorDetails.sqlMessage) {
        errorResponse.error.databaseError = errorDetails.sqlMessage;
      }
    }

    response.status(status).json(errorResponse);
  }
}

