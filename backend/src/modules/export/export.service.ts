import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../entities/user.entity';
import { OrderStatus } from '../../shared/interfaces/order.interface';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  async exportOrdersReport(
    response: Response,
    userRole: UserRole,
    userId?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders Report');

    // Настройка колонок
    worksheet.columns = [
      { header: 'Order ID', key: 'id', width: 10 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Organization', key: 'organization', width: 25 },
      { header: 'Engineer', key: 'engineer', width: 25 },
      { header: 'Created By', key: 'createdBy', width: 25 },
      { header: 'Created Date', key: 'createdAt', width: 15 },
      { header: 'Completion Date', key: 'completionDate', width: 15 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Priority', key: 'priority', width: 10 },
    ];

    // Стили для заголовков
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' },
    };

    // Получаем данные заказов
    let queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.organization', 'organization')
      .leftJoinAndSelect('order.assignedEngineer', 'engineer')
      .leftJoinAndSelect('order.createdBy', 'createdBy')
      .orderBy('order.createdAt', 'DESC');

    // Фильтры по роли пользователя
    if (userRole === UserRole.USER) {
      queryBuilder.andWhere('order.assignedEngineerId = :userId', { userId });
    }

    // Фильтры по датам
    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate });
    }

    const orders = await queryBuilder.getMany();

    // Заполняем данными
    orders.forEach(order => {
      worksheet.addRow({
        id: order.id,
        title: order.title,
        status: this.getStatusDisplay(order.status),
        organization: order.organization?.name || 'N/A',
        engineer: order.assignedEngineer?.user
          ? `${order.assignedEngineer.user.firstName} ${order.assignedEngineer.user.lastName}`
          : 'Unassigned',
        createdBy: `${order.createdBy.firstName} ${order.createdBy.lastName}`,
        createdAt: order.createdAt.toLocaleDateString(),
        completionDate: order.completionDate?.toLocaleDateString() || 'Not completed',
        location: order.location,
        priority: this.calculatePriority(order),
      });
    });

    // Настройка HTTP ответа
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename=orders-report-${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(response);
    response.end();
  }

  private getStatusDisplay(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.WAITING:
        return 'В ожидании';
      case OrderStatus.PROCESSING:
        return 'В обработке';
      case OrderStatus.WORKING:
        return 'В работе';
      case OrderStatus.REVIEW:
        return 'На проверке';
      case OrderStatus.COMPLETED:
        return 'Законченный';
      default:
        return status;
    }
  }

  private calculatePriority(order: Order): string {
    const daysSinceCreation = Math.floor(
      (new Date().getTime() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation > 7) return 'High';
    if (daysSinceCreation > 3) return 'Medium';
    return 'Low';
  }
}
