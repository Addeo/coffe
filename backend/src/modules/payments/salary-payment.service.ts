import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalaryPayment, PaymentType, PaymentMethod, PaymentStatus } from '../../entities/salary-payment.entity';
import { EngineerBalance } from '../../entities/engineer-balance.entity';
import { SalaryCalculation, CalculationStatus } from '../../entities/salary-calculation.entity';
import { Engineer } from '../../entities/engineer.entity';
// Temporary - types not yet in shared package
type CreateSalaryPaymentDto = any;
type UpdateSalaryPaymentDto = any;
type SalaryPaymentDto = any;
type EngineerBalanceDto = any;
type EngineerBalanceDetailDto = any;

@Injectable()
export class SalaryPaymentService {
  private readonly logger = new Logger(SalaryPaymentService.name);

  constructor(
    @InjectRepository(SalaryPayment)
    private salaryPaymentRepository: Repository<SalaryPayment>,
    @InjectRepository(EngineerBalance)
    private engineerBalanceRepository: Repository<EngineerBalance>,
    @InjectRepository(SalaryCalculation)
    private salaryCalculationRepository: Repository<SalaryCalculation>,
    @InjectRepository(Engineer)
    private engineerRepository: Repository<Engineer>,
  ) {}

  /**
   * Создать новую выплату
   */
  async createPayment(
    createDto: CreateSalaryPaymentDto,
    paidById: number,
  ): Promise<SalaryPaymentDto> {
    // Проверяем существование инженера
    const engineer = await this.engineerRepository.findOne({
      where: { id: createDto.engineerId },
      relations: ['user'],
    });

    if (!engineer) {
      throw new NotFoundException('Engineer not found');
    }

    // Проверяем начисление, если указано
    let salaryCalculation: SalaryCalculation | null = null;
    if (createDto.salaryCalculationId) {
      salaryCalculation = await this.salaryCalculationRepository.findOne({
        where: { id: createDto.salaryCalculationId },
      });

      if (!salaryCalculation) {
        throw new NotFoundException('Salary calculation not found');
      }

      if (salaryCalculation.engineerId !== createDto.engineerId) {
        throw new BadRequestException('Salary calculation does not belong to this engineer');
      }
    }

    // Создаем выплату
    const payment = this.salaryPaymentRepository.create({
      engineerId: createDto.engineerId,
      salaryCalculationId: createDto.salaryCalculationId || null,
      month: createDto.month || (salaryCalculation?.month ?? null),
      year: createDto.year || (salaryCalculation?.year ?? null),
      amount: createDto.amount,
      type: createDto.type,
      method: createDto.method,
      status: PaymentStatus.COMPLETED,
      paymentDate: new Date(createDto.paymentDate),
      notes: createDto.notes || null,
      paidById,
      documentNumber: createDto.documentNumber || null,
    });

    const savedPayment = await this.salaryPaymentRepository.save(payment);

    // Обновляем статус начисления, если это не аванс
    if (salaryCalculation && createDto.type === PaymentType.REGULAR) {
      await this.updateCalculationStatus(salaryCalculation.id);
    }

    // Обновляем баланс инженера
    await this.updateEngineerBalance(createDto.engineerId);

    this.logger.log(`Payment created: ${savedPayment.id} for engineer ${createDto.engineerId}, amount: ${createDto.amount}`);

    return this.mapToDto(savedPayment, engineer.user?.firstName, engineer.user?.lastName);
  }

  /**
   * Получить все выплаты инженера
   */
  async getEngineerPayments(
    engineerId: number,
    options?: {
      year?: number;
      month?: number;
      type?: PaymentType;
      limit?: number;
    },
  ): Promise<SalaryPaymentDto[]> {
    const query = this.salaryPaymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.engineer', 'engineer')
      .leftJoinAndSelect('engineer.user', 'user')
      .leftJoinAndSelect('payment.paidBy', 'paidBy')
      .where('payment.engineerId = :engineerId', { engineerId });

    if (options?.year) {
      query.andWhere('payment.year = :year', { year: options.year });
    }

    if (options?.month) {
      query.andWhere('payment.month = :month', { month: options.month });
    }

    if (options?.type) {
      query.andWhere('payment.type = :type', { type: options.type });
    }

    query.orderBy('payment.paymentDate', 'DESC');

    if (options?.limit) {
      query.limit(options.limit);
    }

    const payments = await query.getMany();

    return payments.map(p =>
      this.mapToDto(
        p,
        p.engineer?.user?.firstName,
        p.engineer?.user?.lastName,
        p.paidBy?.firstName,
        p.paidBy?.lastName,
      ),
    );
  }

  /**
   * Получить выплаты по начислению
   */
  async getPaymentsByCalculation(calculationId: number): Promise<SalaryPaymentDto[]> {
    const payments = await this.salaryPaymentRepository.find({
      where: { salaryCalculationId: calculationId },
      relations: ['engineer', 'engineer.user', 'paidBy'],
      order: { paymentDate: 'DESC' },
    });

    return payments.map(p =>
      this.mapToDto(
        p,
        p.engineer?.user?.firstName,
        p.engineer?.user?.lastName,
        p.paidBy?.firstName,
        p.paidBy?.lastName,
      ),
    );
  }

  /**
   * Обновить выплату
   */
  async updatePayment(id: number, updateDto: UpdateSalaryPaymentDto): Promise<SalaryPaymentDto> {
    const payment = await this.salaryPaymentRepository.findOne({
      where: { id },
      relations: ['engineer', 'engineer.user'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Обновляем поля
    if (updateDto.amount !== undefined) payment.amount = updateDto.amount;
    if (updateDto.type !== undefined) payment.type = updateDto.type;
    if (updateDto.method !== undefined) payment.method = updateDto.method;
    if (updateDto.paymentDate !== undefined) payment.paymentDate = new Date(updateDto.paymentDate);
    if (updateDto.notes !== undefined) payment.notes = updateDto.notes;
    if (updateDto.documentNumber !== undefined) payment.documentNumber = updateDto.documentNumber;
    if (updateDto.status !== undefined) payment.status = updateDto.status;

    const savedPayment = await this.salaryPaymentRepository.save(payment);

    // Обновляем баланс инженера
    await this.updateEngineerBalance(payment.engineerId);

    // Обновляем статус начисления
    if (payment.salaryCalculationId) {
      await this.updateCalculationStatus(payment.salaryCalculationId);
    }

    this.logger.log(`Payment updated: ${id}`);

    return this.mapToDto(savedPayment, payment.engineer?.user?.firstName, payment.engineer?.user?.lastName);
  }

  /**
   * Удалить выплату
   */
  async deletePayment(id: number): Promise<void> {
    const payment = await this.salaryPaymentRepository.findOne({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const engineerId = payment.engineerId;
    const calculationId = payment.salaryCalculationId;

    await this.salaryPaymentRepository.remove(payment);

    // Обновляем баланс инженера
    await this.updateEngineerBalance(engineerId);

    // Обновляем статус начисления
    if (calculationId) {
      await this.updateCalculationStatus(calculationId);
    }

    this.logger.log(`Payment deleted: ${id}`);
  }

  /**
   * Получить баланс инженера
   */
  async getEngineerBalance(engineerId: number): Promise<EngineerBalanceDto> {
    let balance = await this.engineerBalanceRepository.findOne({
      where: { engineerId },
      relations: ['engineer', 'engineer.user'],
    });

    if (!balance) {
      // Создаем баланс, если его еще нет
      balance = await this.createEngineerBalance(engineerId);
    }

    // Пересчитываем баланс, если он устарел (более 1 часа)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!balance.lastCalculatedAt || balance.lastCalculatedAt < oneHourAgo) {
      balance = await this.recalculateEngineerBalance(engineerId);
    }

    return {
      id: balance.id,
      engineerId: balance.engineerId,
      engineerName: balance.engineer?.user
        ? `${balance.engineer.user.firstName} ${balance.engineer.user.lastName}`
        : undefined,
      totalAccrued: Number(balance.totalAccrued),
      totalPaid: Number(balance.totalPaid),
      balance: Number(balance.balance),
      lastAccrualDate: balance.lastAccrualDate?.toISOString().split('T')[0] || null,
      lastPaymentDate: balance.lastPaymentDate?.toISOString().split('T')[0] || null,
      lastCalculatedAt: balance.lastCalculatedAt?.toISOString() || null,
      createdAt: balance.createdAt.toISOString(),
      updatedAt: balance.updatedAt.toISOString(),
    };
  }

  /**
   * Получить детальный баланс инженера с последними начислениями и выплатами
   */
  async getEngineerBalanceDetail(engineerId: number): Promise<EngineerBalanceDetailDto> {
    const balance = await this.getEngineerBalance(engineerId);

    // Получаем последние 10 выплат
    const recentPayments = await this.getEngineerPayments(engineerId, { limit: 10 });

    // Получаем последние начисления с информацией о выплатах
    const calculations = await this.salaryCalculationRepository.find({
      where: { engineerId },
      order: { year: 'DESC', month: 'DESC' },
      take: 12,
    });

    const recentCalculations = await Promise.all(
      calculations.map(async calc => {
        const payments = await this.salaryPaymentRepository.find({
          where: { salaryCalculationId: calc.id, status: PaymentStatus.COMPLETED },
        });

        const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const remainingAmount = Number(calc.totalAmount) - paidAmount;

        return {
          id: calc.id,
          month: calc.month,
          year: calc.year,
          totalAmount: Number(calc.totalAmount),
          status: calc.status,
          paidAmount,
          remainingAmount,
        };
      }),
    );

    return {
      ...balance,
      recentPayments,
      recentCalculations,
    };
  }

  /**
   * Получить все балансы инженеров
   */
  async getAllEngineersBalances(): Promise<EngineerBalanceDto[]> {
    const engineers = await this.engineerRepository.find({
      where: { isActive: true },
      relations: ['user'],
    });

    const balances = await Promise.all(
      engineers.map(engineer => this.getEngineerBalance(engineer.id)),
    );

    return balances;
  }

  /**
   * Пересчитать баланс инженера
   */
  private async recalculateEngineerBalance(engineerId: number): Promise<EngineerBalance> {
    // Получаем все начисления
    const calculations = await this.salaryCalculationRepository.find({
      where: { engineerId, status: CalculationStatus.CALCULATED },
    });

    const totalAccrued = calculations.reduce((sum, calc) => sum + Number(calc.totalAmount), 0);

    // Получаем все выплаты
    const payments = await this.salaryPaymentRepository.find({
      where: { engineerId, status: PaymentStatus.COMPLETED },
    });

    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    // Находим последние даты
    const lastCalculation = calculations.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })[0];

    const lastPayment = payments.sort(
      (a, b) => b.paymentDate.getTime() - a.paymentDate.getTime(),
    )[0];

    // Обновляем или создаем баланс
    let balance = await this.engineerBalanceRepository.findOne({
      where: { engineerId },
    });

    if (!balance) {
      balance = this.engineerBalanceRepository.create({
        engineerId,
      });
    }

    balance.totalAccrued = totalAccrued;
    balance.totalPaid = totalPaid;
    balance.balance = totalAccrued - totalPaid;
    balance.lastAccrualDate = lastCalculation
      ? new Date(lastCalculation.year, lastCalculation.month - 1, 1)
      : null;
    balance.lastPaymentDate = lastPayment?.paymentDate || null;
    balance.lastCalculatedAt = new Date();

    return await this.engineerBalanceRepository.save(balance);
  }

  /**
   * Создать баланс инженера
   */
  private async createEngineerBalance(engineerId: number): Promise<EngineerBalance> {
    return this.recalculateEngineerBalance(engineerId);
  }

  /**
   * Обновить баланс инженера (вызывается после создания/удаления выплаты)
   */
  private async updateEngineerBalance(engineerId: number): Promise<void> {
    await this.recalculateEngineerBalance(engineerId);
  }

  /**
   * Обновить статус начисления на основе выплат
   */
  private async updateCalculationStatus(calculationId: number): Promise<void> {
    const calculation = await this.salaryCalculationRepository.findOne({
      where: { id: calculationId },
    });

    if (!calculation) {
      return;
    }

    const payments = await this.salaryPaymentRepository.find({
      where: { salaryCalculationId: calculationId, status: PaymentStatus.COMPLETED },
    });

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalAmount = Number(calculation.totalAmount);

    // Обновляем статус
    if (totalPaid >= totalAmount && calculation.status !== CalculationStatus.PAID) {
      calculation.status = CalculationStatus.PAID;
      await this.salaryCalculationRepository.save(calculation);
      this.logger.log(`Salary calculation ${calculationId} marked as PAID`);
    } else if (totalPaid < totalAmount && calculation.status === CalculationStatus.PAID) {
      // Откатываем статус, если выплата была удалена
      calculation.status = CalculationStatus.CALCULATED;
      await this.salaryCalculationRepository.save(calculation);
      this.logger.log(`Salary calculation ${calculationId} status reverted to CALCULATED`);
    }
  }

  /**
   * Маппинг entity в DTO
   */
  private mapToDto(
    payment: SalaryPayment,
    engineerFirstName?: string,
    engineerLastName?: string,
    paidByFirstName?: string,
    paidByLastName?: string,
  ): SalaryPaymentDto {
    return {
      id: payment.id,
      engineerId: payment.engineerId,
      engineerName:
        engineerFirstName && engineerLastName
          ? `${engineerFirstName} ${engineerLastName}`
          : undefined,
      salaryCalculationId: payment.salaryCalculationId,
      month: payment.month,
      year: payment.year,
      amount: Number(payment.amount),
      type: payment.type,
      method: payment.method,
      status: payment.status,
      paymentDate: payment.paymentDate.toISOString().split('T')[0],
      notes: payment.notes,
      paidById: payment.paidById,
      paidByName:
        paidByFirstName && paidByLastName ? `${paidByFirstName} ${paidByLastName}` : undefined,
      documentNumber: payment.documentNumber,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }
}

