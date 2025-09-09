import { Injectable, Logger } from '@nestjs/common';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  userId?: number;
  userRole?: string;
  action?: string;
  resource?: string;
  resourceId?: number;
  ip?: string;
  userAgent?: string;
  metadata?: any;
}

@Injectable()
export class LoggerService {
  private logger = new Logger('CustomLogger');

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? JSON.stringify(context) : '';

    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`;
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(this.formatMessage(LogLevel.DEBUG, message, context));
  }

  log(message: string, context?: LogContext) {
    this.logger.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  error(message: string, trace?: string, context?: LogContext) {
    const formattedMessage = this.formatMessage(LogLevel.ERROR, message, context);
    this.logger.error(formattedMessage, trace);
  }

  // Специфические методы для бизнес-логики
  logUserAction(
    userId: number,
    action: string,
    resource: string,
    resourceId?: number,
    metadata?: any
  ) {
    this.log(
      `User ${userId} performed ${action} on ${resource}${resourceId ? ` (${resourceId})` : ''}`,
      {
        userId,
        action,
        resource,
        resourceId,
        metadata,
      }
    );
  }

  logSecurityEvent(event: string, userId?: number, ip?: string, metadata?: any) {
    this.warn(`Security event: ${event}`, {
      userId,
      action: 'security_event',
      resource: 'security',
      ip,
      metadata,
    });
  }

  logPerformance(operation: string, duration: number, metadata?: any) {
    this.log(`Performance: ${operation} took ${duration}ms`, {
      action: 'performance',
      resource: 'performance',
      metadata: { ...metadata, duration },
    });
  }

  logBusinessMetric(metric: string, value: any, metadata?: any) {
    this.log(`Business metric: ${metric} = ${value}`, {
      action: 'business_metric',
      resource: 'metrics',
      metadata: { ...metadata, value },
    });
  }
}
