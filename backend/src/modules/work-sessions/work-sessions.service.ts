import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkSession, WorkSessionStatus } from '../../entities/work-session.entity';
import { Order } from '../../entities/order.entity';
import { Engineer } from '../../entities/engineer.entity';
import { OrderStatus } from '../../shared/interfaces/order.interface';
import { CalculationService } from '../расчеты/calculation.service';

export interface CreateWorkSessionDto {
  workDate: Date;
  regularHours: number;
  overtimeHours: number;
  carPayment: number;
  distanceKm?: number;
  territoryType?: string;
  notes?: string;
  photoUrl?: string;
  canBeInvoiced?: boolean;
}

export interface UpdateWorkSessionDto {
  workDate?: Date;
  regularHours?: number;
  overtimeHours?: number;
  carPayment?: number;
  distanceKm?: number;
  territoryType?: string;
  notes?: string;
  photoUrl?: string;
  canBeInvoiced?: boolean;
}

@Injectable()
export class WorkSessionsService {
  private readonly logger = new Logger(WorkSessionsService.name);

  constructor(
    @InjectRepository(WorkSession)
    private readonly workSessionsRepository: Repository<WorkSession>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Engineer)
    private readonly engineersRepository: Repository<Engineer>,
    private readonly calculationService: CalculationService,
  ) {}

  /**
   * Создать рабочую сессию (выезд)
   */
  async createWorkSession(
    orderId: number,
    engineerId: number,
    workData: CreateWorkSessionDto,
  ): Promise<WorkSession> {
    // Получаем заказ
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['organization', 'assignedEngineer'],
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    // Получаем инженера
    const engineer = await this.engineersRepository.findOne({
      where: { userId: engineerId },
      relations: ['user'],
    });

    if (!engineer) {
      throw new NotFoundException(`Engineer with userId ${engineerId} not found`);
    }

    // Проверяем, что инженер назначен на заказ
    if (order.assignedEngineerId !== engineer.id) {
      throw new BadRequestException(
        'Engineer is not assigned to this order. Please assign engineer first.',
      );
    }

    // Получаем ставки для пары инженер-организация
    const rates = await this.calculationService.getEngineerRatesForOrganization(
      engineer,
      order.organization,
    );

    // Рассчитываем оплату инженеру
    const regularPayment = workData.regularHours * rates.baseRate;
    const overtimePayment =
      workData.overtimeHours * (rates.overtimeRate || rates.baseRate);
    const totalPayment = regularPayment + overtimePayment;

    // Рассчитываем оплату от организации
    const organizationRegularPayment =
      workData.regularHours * order.organization.baseRate;
    const organizationOvertimePayment = order.organization.hasOvertime
      ? workData.overtimeHours *
        order.organization.baseRate *
        order.organization.overtimeMultiplier
      : workData.overtimeHours * order.organization.baseRate;
    const organizationPayment =
      organizationRegularPayment + organizationOvertimePayment;

    // Создаём рабочую сессию
    const workSession = this.workSessionsRepository.create({
      orderId,
      engineerId: engineer.id,
      workDate: workData.workDate,
      regularHours: workData.regularHours,
      overtimeHours: workData.overtimeHours,
      calculatedAmount: totalPayment,
      carUsageAmount: workData.carPayment,
      engineerBaseRate: rates.baseRate,
      engineerOvertimeRate: rates.overtimeRate || rates.baseRate,
      organizationPayment,
      organizationBaseRate: order.organization.baseRate,
      organizationOvertimeMultiplier: order.organization.overtimeMultiplier,
      regularPayment,
      overtimePayment,
      organizationRegularPayment,
      organizationOvertimePayment,
      profit: organizationPayment - totalPayment,
      distanceKm: workData.distanceKm,
      territoryType: workData.territoryType,
      notes: workData.notes,
      photoUrl: workData.photoUrl,
      canBeInvoiced: workData.canBeInvoiced ?? true,
      status: WorkSessionStatus.COMPLETED,
    });

    const savedSession = await this.workSessionsRepository.save(workSession);

    // Обновляем статус заказа (если ещё не в работе)
    if (order.status === OrderStatus.WAITING) {
      order.status = OrderStatus.PROCESSING;
      order.actualStartDate = order.actualStartDate || new Date();
      await this.ordersRepository.save(order);
    }

    this.logger.log(
      `✅ Work session created: Order #${orderId}, Date: ${workData.workDate}, Hours: ${workData.regularHours}+${workData.overtimeHours}, Payment: ${totalPayment}₽`,
    );

    return savedSession;
  }

  /**
   * Получить все сессии по заказу
   */
  async getOrderWorkSessions(orderId: number): Promise<WorkSession[]> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    return this.workSessionsRepository.find({
      where: { orderId },
      relations: ['engineer', 'engineer.user'],
      order: { workDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Получить сессии инженера за период
   */
  async getEngineerWorkSessions(
    engineerId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<WorkSession[]> {
    const query = this.workSessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.order', 'order')
      .leftJoinAndSelect('order.organization', 'organization')
      .where('session.engineerId = :engineerId', { engineerId });

    if (startDate) {
      query.andWhere('session.workDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('session.workDate < :endDate', { endDate });
    }

    return query.orderBy('session.workDate', 'DESC').getMany();
  }

  /**
   * Получить одну сессию по ID
   */
  async getWorkSessionById(sessionId: number): Promise<WorkSession> {
    const session = await this.workSessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['order', 'order.organization', 'engineer', 'engineer.user'],
    });

    if (!session) {
      throw new NotFoundException(`Work session with id ${sessionId} not found`);
    }

    return session;
  }

  /**
   * Обновить рабочую сессию
   */
  async updateWorkSession(
    sessionId: number,
    updateData: UpdateWorkSessionDto,
  ): Promise<WorkSession> {
    const session = await this.workSessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['order', 'order.organization', 'engineer'],
    });

    if (!session) {
      throw new NotFoundException(`Work session with id ${sessionId} not found`);
    }

    // Если изменяются часы или оплата - пересчитываем
    if (
      updateData.regularHours !== undefined ||
      updateData.overtimeHours !== undefined ||
      updateData.carPayment !== undefined
    ) {
      const regularHours = updateData.regularHours ?? session.regularHours;
      const overtimeHours = updateData.overtimeHours ?? session.overtimeHours;
      const carPayment = updateData.carPayment ?? session.carUsageAmount;

      // Получаем ставки (используем сохранённые в сессии)
      const regularPayment = regularHours * session.engineerBaseRate;
      const overtimePayment =
        overtimeHours * (session.engineerOvertimeRate || session.engineerBaseRate);
      const totalPayment = regularPayment + overtimePayment;

      const organizationRegularPayment =
        regularHours * session.organizationBaseRate;
      const organizationOvertimePayment = session.organizationOvertimeMultiplier
        ? overtimeHours *
          session.organizationBaseRate *
          session.organizationOvertimeMultiplier
        : overtimeHours * session.organizationBaseRate;
      const organizationPayment =
        organizationRegularPayment + organizationOvertimePayment;

      // Обновляем расчёты
      session.regularHours = regularHours;
      session.overtimeHours = overtimeHours;
      session.carUsageAmount = carPayment;
      session.calculatedAmount = totalPayment;
      session.regularPayment = regularPayment;
      session.overtimePayment = overtimePayment;
      session.organizationPayment = organizationPayment;
      session.organizationRegularPayment = organizationRegularPayment;
      session.organizationOvertimePayment = organizationOvertimePayment;
      session.profit = organizationPayment - totalPayment;
    }

    // Обновляем остальные поля
    if (updateData.workDate !== undefined) {
      session.workDate = updateData.workDate;
    }
    if (updateData.distanceKm !== undefined) {
      session.distanceKm = updateData.distanceKm;
    }
    if (updateData.territoryType !== undefined) {
      session.territoryType = updateData.territoryType;
    }
    if (updateData.notes !== undefined) {
      session.notes = updateData.notes;
    }
    if (updateData.photoUrl !== undefined) {
      session.photoUrl = updateData.photoUrl;
    }
    if (updateData.canBeInvoiced !== undefined) {
      session.canBeInvoiced = updateData.canBeInvoiced;
    }

    const updatedSession = await this.workSessionsRepository.save(session);

    this.logger.log(`✅ Work session #${sessionId} updated`);

    return updatedSession;
  }

  /**
   * Удалить рабочую сессию
   */
  async deleteWorkSession(sessionId: number): Promise<void> {
    const session = await this.workSessionsRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Work session with id ${sessionId} not found`);
    }

    await this.workSessionsRepository.remove(session);

    this.logger.log(`✅ Work session #${sessionId} deleted`);
  }

  /**
   * Получить сессии за месяц для расчёта зарплаты
   */
  async getWorkSessionsForSalaryCalculation(
    engineerId: number,
    month: number,
    year: number,
  ): Promise<WorkSession[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return this.workSessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.order', 'order')
      .leftJoinAndSelect('order.organization', 'organization')
      .where('session.engineerId = :engineerId', { engineerId })
      .andWhere('session.status = :status', { status: WorkSessionStatus.COMPLETED })
      .andWhere('session.workDate >= :startDate', { startDate })
      .andWhere('session.workDate < :endDate', { endDate })
      .andWhere('session.canBeInvoiced = :canBeInvoiced', { canBeInvoiced: true })
      .orderBy('session.workDate', 'ASC')
      .getMany();
  }
}

