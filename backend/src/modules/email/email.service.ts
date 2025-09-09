import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: this.configService.get<number>('SMTP_PORT') || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get<string>('SMTP_FROM') || 'noreply@coffee-admin.com',
        ...options,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
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
}
