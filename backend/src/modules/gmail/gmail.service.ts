import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { LoggerService } from '../logger/logger.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body?: {
        data?: string;
      };
      parts?: any[];
    }>;
  };
}

@Injectable()
export class GmailService {
  private oauth2Client: OAuth2Client;
  private gmail: any;
  private readonly logger = new Logger(GmailService.name);

  constructor(
    private configService: ConfigService,
    private loggerService: LoggerService,
    private ordersService: OrdersService,
    private notificationsService: NotificationsService,
  ) {
    this.initializeGmailClient();
  }

  private initializeGmailClient() {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret) {
      this.logger.warn('Gmail integration not configured - missing Google credentials');
      return;
    }

    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    // Set access token if available
    const accessToken = this.configService.get<string>('GOOGLE_ACCESS_TOKEN');
    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');

    if (accessToken && refreshToken) {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }

  async checkNewEmails(): Promise<void> {
    try {
      if (!this.gmail) {
        this.logger.debug('Gmail client not initialized');
        return;
      }

      // Получаем непрочитанные сообщения
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 10,
      });

      const messages = response.data.messages || [];

      for (const message of messages) {
        await this.processEmail(message.id);
      }
    } catch (error) {
      this.logger.error('Error checking new emails:', error);
      this.loggerService.error('Gmail integration error', error.stack, {
        action: 'gmail_check_failed',
        resource: 'gmail',
      });
    }
  }

  private async processEmail(messageId: string): Promise<void> {
    try {
      // Получаем полное сообщение
      const messageResponse = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message: GmailMessage = messageResponse.data;

      // Проверяем, содержит ли сообщение тег для создания заказа
      if (this.hasOrderTag(message)) {
        await this.createOrderFromEmail(message);

        // Помечаем сообщение как прочитанное
        await this.markAsRead(messageId);
      }
    } catch (error) {
      this.logger.error(`Error processing email ${messageId}:`, error);
    }
  }

  private hasOrderTag(message: GmailMessage): boolean {
    const subject = this.getHeaderValue(message, 'Subject');
    const body = this.getMessageBody(message);

    // Проверяем различные паттерны тегов
    const orderTags = [
      '[ORDER]', '[ЗАКАЗ]', '[НОВЫЙ ЗАКАЗ]',
      'ORDER:', 'ЗАКАЗ:', 'НОВЫЙ ЗАКАЗ:',
      '#order', '#заказ'
    ];

    const content = `${subject} ${body}`.toLowerCase();

    return orderTags.some(tag => content.includes(tag.toLowerCase()));
  }

  private async createOrderFromEmail(message: GmailMessage): Promise<void> {
    try {
      const subject = this.getHeaderValue(message, 'Subject');
      const from = this.getHeaderValue(message, 'From');
      const body = this.getMessageBody(message);

      // Парсим данные из email
      const orderData = this.parseOrderData(subject, body, from);

      // Создаем заказ как администратор (ID 1)
      const order = await this.ordersService.create({
        organizationId: orderData.organizationId,
        title: orderData.title,
        description: orderData.description,
        location: orderData.location,
        plannedStartDate: orderData.plannedStartDate,
      }, 1); // Admin user ID

      // Логируем создание заказа из email
      this.loggerService.log(`Order created from email: ${subject}`, {
        action: 'order_created_from_email',
        resource: 'order',
        resourceId: order.id,
        metadata: {
          emailSubject: subject,
          emailFrom: from,
        },
      });

      // Отправляем уведомление администраторам
      const adminUsers = await this.notificationsService['userRepository'].find({
        where: { role: 'admin', isActive: true }
      });

      for (const admin of adminUsers) {
        await this.notificationsService.createNotification(
          admin.id,
          'order_created_from_email',
          'New Order from Email',
          `Order "${order.title}" was created from email: ${subject}`,
          'high',
          { orderId: order.id, emailSubject: subject, emailFrom: from }
        );
      }

      this.logger.log(`Order created from email: ${order.title}`);
    } catch (error) {
      this.logger.error('Error creating order from email:', error);
      this.loggerService.error('Failed to create order from email', error.stack, {
        action: 'order_creation_failed',
        resource: 'gmail',
        metadata: { emailId: message.id },
      });
    }
  }

  private parseOrderData(subject: string, body: string, from: string): any {
    // Простой парсер данных из email
    // В реальном проекте можно использовать более сложную логику

    // Извлекаем организацию из поля From или тела письма
    const organizationId = this.extractOrganizationId(body) || 1; // Default organization

    // Извлекаем описание из тела письма
    const description = this.extractDescription(body);

    // Извлекаем адрес/локацию
    const location = this.extractLocation(body) || 'To be specified';

    // Извлекаем планируемую дату
    const plannedStartDate = this.extractDate(body);

    return {
      organizationId,
      title: subject.replace(/^\[.*?\]|\[.*?\]$/g, '').trim() || 'Order from Email',
      description: description || body.substring(0, 500),
      location,
      plannedStartDate,
    };
  }

  private extractOrganizationId(text: string): number | null {
    // Ищем паттерны типа "Organization: 123" или "Org ID: 123"
    const patterns = [
      /organization:?\s*(\d+)/i,
      /org(?:anization)?\s*id:?\s*(\d+)/i,
      /company:?\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return null;
  }

  private extractDescription(text: string): string | null {
    // Ищем описание после ключевых слов
    const patterns = [
      /description:?\s*(.+?)(?:\n|$)/i,
      /details:?\s*(.+?)(?:\n|$)/i,
      /message:?\s*(.+?)(?:\n|$)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractLocation(text: string): string | null {
    // Ищем адрес/локацию
    const patterns = [
      /address:?\s*(.+?)(?:\n|$)/i,
      /location:?\s*(.+?)(?:\n|$)/i,
      /place:?\s*(.+?)(?:\n|$)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractDate(text: string): Date | null {
    // Ищем даты в различных форматах
    const patterns = [
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, // DD/MM/YYYY или MM/DD/YYYY
      /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, // YYYY/MM/DD
      /date:?\s*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          // Пытаемся создать дату
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch (error) {
          // Игнорируем ошибки парсинга
        }
      }
    }

    return null;
  }

  private getHeaderValue(message: GmailMessage, headerName: string): string {
    const header = message.payload.headers.find(h => h.name === headerName);
    return header?.value || '';
  }

  private getMessageBody(message: GmailMessage): string {
    let body = '';

    if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    } else if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString();
          break;
        }
      }
    }

    return body;
  }

  private async markAsRead(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
    } catch (error) {
      this.logger.error(`Error marking message ${messageId} as read:`, error);
    }
  }

  // Метод для получения URL авторизации Google
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  // Метод для обработки callback от Google
  async handleAuthCallback(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      this.logger.log('Gmail authentication successful');
      this.loggerService.log('Gmail authentication completed', {
        action: 'gmail_auth_success',
        resource: 'gmail',
      });
    } catch (error) {
      this.logger.error('Gmail authentication failed:', error);
      this.loggerService.error('Gmail authentication failed', error.stack, {
        action: 'gmail_auth_failed',
        resource: 'gmail',
      });
      throw error;
    }
  }
}
