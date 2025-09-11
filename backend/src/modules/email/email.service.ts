import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private gmailAuth: any;

  constructor(private configService: ConfigService) {
    // Initialize Gmail API authentication
    this.initializeGmailAuth();

    // Fallback to SMTP if Gmail API is not configured
    const useGmailAPI = this.configService.get<string>('USE_GMAIL_API') === 'true';

    if (useGmailAPI && this.gmailAuth) {
      this.initializeGmailTransporter();
    } else {
      this.initializeSMTPTransporter();
    }
  }

  private initializeGmailAuth() {
    try {
      const clientId = this.configService.get<string>('GMAIL_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GMAIL_CLIENT_SECRET');
      const refreshToken = this.configService.get<string>('GMAIL_REFRESH_TOKEN');
      const redirectUri = this.configService.get<string>('GMAIL_REDIRECT_URI') || 'https://developers.google.com/oauthplayground';

      if (clientId && clientSecret && refreshToken) {
        const oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret,
          redirectUri
        );

        oauth2Client.setCredentials({
          refresh_token: refreshToken,
        });

        this.gmailAuth = oauth2Client;
      }
    } catch (error) {
      console.warn('Gmail API authentication failed, falling back to SMTP:', error.message);
    }
  }

  private async initializeGmailTransporter() {
    try {
      const accessToken = await this.gmailAuth.getAccessToken();

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: this.configService.get<string>('GMAIL_USER'),
          clientId: this.configService.get<string>('GMAIL_CLIENT_ID'),
          clientSecret: this.configService.get<string>('GMAIL_CLIENT_SECRET'),
          refreshToken: this.configService.get<string>('GMAIL_REFRESH_TOKEN'),
          accessToken: accessToken.token,
        },
      });

      console.log('Gmail API transporter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gmail transporter:', error);
      this.initializeSMTPTransporter();
    }
  }

  private initializeSMTPTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: this.configService.get<number>('SMTP_PORT') || 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
    console.log('SMTP transporter initialized as fallback');
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('GMAIL_USER') || 'noreply@coffee-admin.com',
        ...options,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);

      // If Gmail API fails, try to refresh token and retry once
      if (this.gmailAuth && error.message.includes('invalid_grant')) {
        try {
          console.log('Attempting to refresh Gmail access token...');
          await this.gmailAuth.refreshAccessToken();
          await this.initializeGmailTransporter();
          const mailOptions = {
            from: this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('GMAIL_USER') || 'noreply@coffee-admin.com',
            ...options,
          };
          await this.transporter.sendMail(mailOptions);
          console.log(`Email sent successfully after token refresh to ${options.to}`);
        } catch (retryError) {
          console.error('Failed to send email after token refresh:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  }

  async sendOrderStatusNotification(
    to: string,
    userName: string,
    orderTitle: string,
    newStatus: string
  ): Promise<void> {
    const subject = `Order Status Updated: ${orderTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Status Update</h2>
        <p>Hello ${userName},</p>
        <p>The status of your order <strong>"${orderTitle}"</strong> has been updated to <strong>${newStatus}</strong>.</p>
        <p>You can check the details in your account.</p>
        <br>
        <p>Best regards,<br>Coffee Admin Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  async sendOrderAssignedNotification(
    to: string,
    userName: string,
    orderTitle: string
  ): Promise<void> {
    const subject = `New Order Assigned: ${orderTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Order Assignment</h2>
        <p>Hello ${userName},</p>
        <p>You have been assigned to a new order: <strong>"${orderTitle}"</strong>.</p>
        <p>Please check your dashboard for details and start working on it.</p>
        <br>
        <p>Best regards,<br>Coffee Admin Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  async sendUserStatusNotification(to: string, userName: string, isActive: boolean): Promise<void> {
    const status = isActive ? 'activated' : 'deactivated';
    const subject = `Account ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Account Status Update</h2>
        <p>Hello ${userName},</p>
        <p>Your account has been ${status} by an administrator.</p>
        ${
          isActive
            ? '<p>You can now access all your orders and account features.</p>'
            : '<p>Please contact an administrator if you need to reactivate your account.</p>'
        }
        <br>
        <p>Best regards,<br>Coffee Admin Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  async sendSystemAlert(
    to: string,
    userName: string,
    title: string,
    message: string
  ): Promise<void> {
    const subject = `System Alert: ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">System Alert</h2>
        <p>Hello ${userName},</p>
        <h3 style="color: #d32f2f;">${title}</h3>
        <p>${message}</p>
        <p>Please check your admin panel for more details.</p>
        <br>
        <p>Best regards,<br>Coffee Admin Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Отправка уведомления о готовности расчета зарплаты
   */
  async sendSalaryCalculationReady(
    to: string,
    userName: string,
    month: number,
    year: number,
    totalAmount: number,
    currency: string = 'RUB'
  ): Promise<void> {
    const monthName = new Date(year, month - 1).toLocaleString('ru-RU', { month: 'long' });
    const subject = `Расчет зарплаты за ${monthName} ${year} готов`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Расчет зарплаты готов</h2>
        <p>Здравствуйте, ${userName}!</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2e7d32;">Период: ${monthName} ${year}</h3>
          <p style="font-size: 18px; font-weight: bold; color: #2e7d32;">
            Итого к выплате: ${totalAmount.toLocaleString('ru-RU')} ${currency}
          </p>
        </div>

        <p>Расчет зарплаты за указанный период был сформирован и готов к просмотру.</p>
        <p>Вы можете просмотреть детальный расчет в личном кабинете.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Перейти к расчету
          </a>
        </div>

        <br>
        <p>С уважением,<br>Команда Coffee Admin</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Отправка уведомления о корректировке расчета
   */
  async sendSalaryCalculationAdjusted(
    to: string,
    userName: string,
    month: number,
    year: number,
    oldAmount: number,
    newAmount: number,
    adjustmentReason: string,
    currency: string = 'RUB'
  ): Promise<void> {
    const monthName = new Date(year, month - 1).toLocaleString('ru-RU', { month: 'long' });
    const difference = newAmount - oldAmount;
    const subject = `Корректировка расчета зарплаты за ${monthName} ${year}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f57c00;">Корректировка расчета зарплаты</h2>
        <p>Здравствуйте, ${userName}!</p>

        <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f57c00;">
          <h3 style="margin-top: 0; color: #f57c00;">Период: ${monthName} ${year}</h3>
          <p><strong>Предыдущая сумма:</strong> ${oldAmount.toLocaleString('ru-RU')} ${currency}</p>
          <p><strong>Новая сумма:</strong> ${newAmount.toLocaleString('ru-RU')} ${currency}</p>
          <p style="color: ${difference >= 0 ? '#2e7d32' : '#d32f2f'}; font-weight: bold;">
            <strong>Разница:</strong> ${difference >= 0 ? '+' : ''}${difference.toLocaleString('ru-RU')} ${currency}
          </p>
        </div>

        <p><strong>Причина корректировки:</strong></p>
        <p style="background-color: #f5f5f5; padding: 15px; border-radius: 6px;">${adjustmentReason}</p>

        <p>Пожалуйста, ознакомьтесь с обновленным расчетом в личном кабинете.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #f57c00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Просмотреть расчет
          </a>
        </div>

        <br>
        <p>С уважением,<br>Команда Coffee Admin</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Отправка ежемесячного отчета для администратора
   */
  async sendMonthlySalaryReport(
    to: string,
    adminName: string,
    month: number,
    year: number,
    reportData: {
      totalEngineers: number;
      totalSalaryAmount: number;
      totalClientRevenue: number;
      totalProfit: number;
      topEarners: Array<{ name: string; amount: number }>;
    },
    currency: string = 'RUB'
  ): Promise<void> {
    const monthName = new Date(year, month - 1).toLocaleString('ru-RU', { month: 'long' });
    const subject = `Ежемесячный отчет по зарплате: ${monthName} ${year}`;

    const topEarnersHtml = reportData.topEarners
      .map((earner, index) => `<li>${index + 1}. ${earner.name}: ${earner.amount.toLocaleString('ru-RU')} ${currency}</li>`)
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Ежемесячный отчет по зарплате</h2>
        <p>Здравствуйте, ${adminName}!</p>

        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1976d2;">Период: ${monthName} ${year}</h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div style="background: white; padding: 15px; border-radius: 6px;">
              <strong>Всего инженеров:</strong><br>
              <span style="font-size: 24px; color: #1976d2;">${reportData.totalEngineers}</span>
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px;">
              <strong>Общая зарплата:</strong><br>
              <span style="font-size: 24px; color: #2e7d32;">${reportData.totalSalaryAmount.toLocaleString('ru-RU')} ${currency}</span>
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px;">
              <strong>Выручка от клиентов:</strong><br>
              <span style="font-size: 24px; color: #f57c00;">${reportData.totalClientRevenue.toLocaleString('ru-RU')} ${currency}</span>
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px;">
              <strong>Прибыль:</strong><br>
              <span style="font-size: 24px; color: ${reportData.totalProfit >= 0 ? '#2e7d32' : '#d32f2f'};">
                ${reportData.totalProfit.toLocaleString('ru-RU')} ${currency}
              </span>
            </div>
          </div>
        </div>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Топ-5 высокооплачиваемых инженеров:</h4>
          <ol style="margin: 0; padding-left: 20px;">
            ${topEarnersHtml}
          </ol>
        </div>

        <p>Подробный отчет доступен в административной панели.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Перейти к отчетам
          </a>
        </div>

        <br>
        <p>С уважением,<br>Система Coffee Admin</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Отправка предупреждения о низкой прибыли
   */
  async sendLowProfitAlert(
    to: string,
    adminName: string,
    month: number,
    year: number,
    profitMargin: number,
    threshold: number = 15
  ): Promise<void> {
    const monthName = new Date(year, month - 1).toLocaleString('ru-RU', { month: 'long' });
    const subject = `⚠️ Предупреждение: Низкая прибыль за ${monthName} ${year}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">⚠️ Предупреждение о низкой прибыли</h2>
        <p>Здравствуйте, ${adminName}!</p>

        <div style="background-color: #ffebee; border: 2px solid #d32f2f; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #d32f2f;">Период: ${monthName} ${year}</h3>
          <p style="font-size: 18px; font-weight: bold;">
            Маржа прибыли: <span style="color: #d32f2f;">${profitMargin.toFixed(1)}%</span>
          </p>
          <p style="font-size: 16px;">
            Пороговое значение: ${threshold}%
          </p>
        </div>

        <p>Маржа прибыли за отчетный период ниже установленного порога. Рекомендуется:</p>
        <ul>
          <li>Проверить ставки инженеров</li>
          <li>Оценить эффективность работы</li>
          <li>Рассмотреть оптимизацию расходов</li>
          <li>Проанализировать клиентские тарифы</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Анализировать данные
          </a>
        </div>

        <br>
        <p>С уважением,<br>Система мониторинга Coffee Admin</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }
}
