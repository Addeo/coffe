import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkSession } from '../../entities/work-session.entity';

@Injectable()
export class CarPaymentStatusService {
  constructor(
    @InjectRepository(WorkSession)
    private workSessionRepository: Repository<WorkSession>
  ) {}

  /**
   * Получить статус оплаты автомобильных отчислений
   */
  async getCarPaymentStatus(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Получаем все рабочие сессии с автомобильными отчислениями
    const carPayments = await this.workSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.order', 'order')
      .leftJoinAndSelect('order.organization', 'organization')
      .leftJoinAndSelect('session.engineer', 'engineer')
      .leftJoinAndSelect('engineer.user', 'user')
      .where('session.workDate >= :startDate', { startDate })
      .andWhere('session.workDate < :endDate', { endDate })
      .andWhere('session.carUsageAmount > 0')
      .andWhere('session.status = :status', { status: 'completed' })
      .getMany();

    // Общая сумма к доплате за автомобили
    const totalCarAmount = carPayments.reduce((sum, session) => sum + session.carUsageAmount, 0);

    // Уже заплачено за автомобили (проверяем по calculatedAmount > 0)
    const paidCarAmount = carPayments
      .filter(session => session.calculatedAmount > 0)
      .reduce((sum, session) => sum + session.carUsageAmount, 0);

    // Группировка по организациям
    const organizationBreakdown = this.groupCarPaymentsByOrganization(carPayments);

    // Группировка по инженерам
    const engineerBreakdown = this.groupCarPaymentsByEngineer(carPayments);

    return {
      totalCarAmount,
      paidCarAmount,
      pendingCarAmount: totalCarAmount - paidCarAmount,
      organizationBreakdown,
      engineerBreakdown,
      paymentStatus: totalCarAmount > 0 ? (paidCarAmount / totalCarAmount) * 100 : 0,
    };
  }

  /**
   * Группировка автомобильных отчислений по организациям
   */
  private groupCarPaymentsByOrganization(carPayments: WorkSession[]) {
    const orgMap = new Map<
      number,
      {
        organizationId: number;
        organizationName: string;
        totalCarAmount: number;
        paidCarAmount: number;
        sessions: WorkSession[];
      }
    >();

    for (const session of carPayments) {
      const orgId = session.order?.organization?.id;
      const orgName = session.order?.organization?.name || 'Неизвестная организация';

      if (!orgMap.has(orgId)) {
        orgMap.set(orgId, {
          organizationId: orgId,
          organizationName: orgName,
          totalCarAmount: 0,
          paidCarAmount: 0,
          sessions: [],
        });
      }

      const orgData = orgMap.get(orgId);
      orgData.totalCarAmount += session.carUsageAmount;
      if (session.calculatedAmount > 0) {
        orgData.paidCarAmount += session.carUsageAmount;
      }
      orgData.sessions.push(session);
    }

    return Array.from(orgMap.values()).map(org => ({
      ...org,
      pendingCarAmount: org.totalCarAmount - org.paidCarAmount,
      paymentStatus: org.totalCarAmount > 0 ? (org.paidCarAmount / org.totalCarAmount) * 100 : 0,
    }));
  }

  /**
   * Группировка автомобильных отчислений по инженерам
   */
  private groupCarPaymentsByEngineer(carPayments: WorkSession[]) {
    const engineerMap = new Map<
      number,
      {
        engineerId: number;
        engineerName: string;
        totalCarAmount: number;
        paidCarAmount: number;
        sessions: WorkSession[];
      }
    >();

    for (const session of carPayments) {
      const engineerId = session.engineerId;
      const engineerName = session.engineer?.user
        ? `${session.engineer.user.firstName} ${session.engineer.user.lastName}`
        : 'Неизвестный инженер';

      if (!engineerMap.has(engineerId)) {
        engineerMap.set(engineerId, {
          engineerId,
          engineerName,
          totalCarAmount: 0,
          paidCarAmount: 0,
          sessions: [],
        });
      }

      const engineerData = engineerMap.get(engineerId);
      engineerData.totalCarAmount += session.carUsageAmount;
      if (session.calculatedAmount > 0) {
        engineerData.paidCarAmount += session.carUsageAmount;
      }
      engineerData.sessions.push(session);
    }

    return Array.from(engineerMap.values()).map(engineer => ({
      ...engineer,
      pendingCarAmount: engineer.totalCarAmount - engineer.paidCarAmount,
      paymentStatus:
        engineer.totalCarAmount > 0 ? (engineer.paidCarAmount / engineer.totalCarAmount) * 100 : 0,
    }));
  }
}
