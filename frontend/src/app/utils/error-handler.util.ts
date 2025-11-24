import { HttpErrorResponse } from '@angular/common/http';

/**
 * Utility class for handling HTTP errors and providing user-friendly error messages in Russian
 */
export class ErrorHandlerUtil {
  /**
   * Get user-friendly error message from HTTP error response
   * @param error - HTTP error response or any error object
   * @returns User-friendly error message in Russian
   */
  static getErrorMessage(error: unknown): string {
    // Handle HttpErrorResponse
    if (error instanceof HttpErrorResponse) {
      return this.getHttpErrorMessage(error);
    }

    // Handle generic Error objects
    if (error instanceof Error) {
      // Check if it's a network error
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        return 'Ошибка сети. Проверьте подключение к интернету.';
      }

      // Return generic error message
      return error.message || 'Произошла неизвестная ошибка';
    }

    // Handle error objects with status property
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as { status?: number; message?: string; error?: { message?: string } };

      if (errorObj.status) {
        return this.getErrorMessageByStatus(errorObj.status, errorObj.error?.message);
      }

      if (errorObj.error?.message) {
        return errorObj.error.message;
      }

      if (errorObj.message) {
        return errorObj.message;
      }
    }

    // Default fallback message
    return 'Произошла неизвестная ошибка. Попробуйте еще раз.';
  }

  /**
   * Get error message from HttpErrorResponse
   * @param error - HttpErrorResponse object
   * @returns User-friendly error message in Russian
   */
  private static getHttpErrorMessage(error: HttpErrorResponse): string {
    // Check for server error message first (if available and in Russian)
    if (error.error?.message) {
      const serverMessage = error.error.message;
      // If server message is already in Russian or meaningful, use it
      if (this.isRussianMessage(serverMessage) || serverMessage.length > 10) {
        return serverMessage;
      }
    }

    // Handle by status code
    return this.getErrorMessageByStatus(error.status, error.error?.message);
  }

  /**
   * Get error message by HTTP status code
   * @param status - HTTP status code
   * @param serverMessage - Optional server error message
   * @returns User-friendly error message in Russian
   */
  private static getErrorMessageByStatus(
    status: number | undefined,
    serverMessage?: string
  ): string {
    if (!status) {
      return serverMessage || 'Произошла неизвестная ошибка. Попробуйте еще раз.';
    }

    switch (status) {
      case 400:
        return serverMessage || 'Неверный запрос. Проверьте введенные данные.';

      case 401:
        return 'Не авторизован. Пожалуйста, войдите в систему снова.';

      case 403:
        return serverMessage || 'Доступ запрещен. У вас нет прав для выполнения этого действия.';

      case 404:
        return serverMessage || 'Ресурс не найден.';

      case 409:
        return serverMessage || 'Конфликт данных. Возможно, запись уже существует.';

      case 422:
        return serverMessage || 'Ошибка валидации данных. Проверьте введенные данные.';

      case 429:
        return 'Слишком много запросов. Пожалуйста, подождите немного и попробуйте снова.';

      case 500:
        return 'Ошибка на сервере. Пожалуйста, попробуйте позже или обратитесь к администратору.';

      case 502:
        return 'Сервер временно недоступен. Пожалуйста, попробуйте позже.';

      case 503:
        return 'Сервис временно недоступен. Пожалуйста, попробуйте позже.';

      case 504:
        return 'Превышено время ожидания ответа от сервера. Пожалуйста, попробуйте позже.';

      default:
        if (status >= 500) {
          return 'Ошибка на сервере. Пожалуйста, попробуйте позже или обратитесь к администратору.';
        }
        if (status >= 400) {
          return serverMessage || 'Ошибка запроса. Проверьте введенные данные.';
        }
        return serverMessage || 'Произошла неизвестная ошибка. Попробуйте еще раз.';
    }
  }

  /**
   * Check if message contains Russian characters
   * @param message - Message to check
   * @returns True if message contains Russian characters
   */
  private static isRussianMessage(message: string): boolean {
    const russianPattern = /[А-Яа-яЁё]/;
    return russianPattern.test(message);
  }

  /**
   * Get detailed error information for logging
   * @param error - Error object
   * @returns Detailed error information
   */
  static getErrorDetails(error: unknown): {
    message: string;
    status?: number;
    statusText?: string;
    url?: string;
    error?: any;
  } {
    if (error instanceof HttpErrorResponse) {
      return {
        message: this.getErrorMessage(error),
        status: error.status,
        statusText: error.statusText,
        url: error.url || undefined,
        error: error.error,
      };
    }

    if (typeof error === 'object' && error !== null) {
      const errorObj = error as {
        status?: number;
        statusText?: string;
        url?: string;
        message?: string;
        error?: any;
      };

      return {
        message: this.getErrorMessage(error),
        status: errorObj.status,
        statusText: errorObj.statusText,
        url: errorObj.url,
        error: errorObj.error,
      };
    }

    return {
      message: this.getErrorMessage(error),
    };
  }
}
