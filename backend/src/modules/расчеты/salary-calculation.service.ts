import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SalaryCalculation, CalculationStatus } from '../../entities/salary-calculation.entity';
import { Engineer } from '../../entities/engineer.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { Organization } from '../../entities/organization.entity';
import { Order } from '../../entities/order.entity';
import { CalculationService } from './calculation.service';
import { EmailService } from '../email/email.service';

export interface SalaryCalculationResult {
  id: number;
  engineerId: number;
  engineerName: string;
  month: number;
  year: number;
  totalAmount: number;
  status: CalculationStatus;
  createdAt: Date;
}

@Injectable()
export class SalaryCalculationService {
  private readonly logger = new Logger(SalaryCalculationService.name);

  constructor(
    @InjectRepository(SalaryCalculation)
    private salaryCalculationRepository: Repository<SalaryCalculation>,
    @InjectRepository(Engineer)
    private engineerRepository: Repository<Engineer>,
    @InjectRepository(WorkReport)
    private workReportRepository: Repository<WorkReport>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private calculationService: CalculationService,
    private emailService: EmailService,
  ) {}

  /**
   * Ручной расчет зарплаты за месяц для всех инженеров
   */
  async calculateSalaryForMonthManual(month: number, year: number, calculatedById?: number): Promise<SalaryCalculationResult[]> {
    this.logger.log(`Starting manual salary calculation for ${month}/${year}`);

    const engineers = await this.engineerRepository.find({
      where: { isActive: true },
      relations: ['user'],
    });

    const results: SalaryCalculationResult[] = [];

    for (const engineer of engineers) {
      try {
        const calculation = await this.calculateEngineerSalary(engineer, month, year, calculatedById);
        results.push({
          id: calculation.id,
          engineerId: engineer.id,
          engineerName: engineer.user ? `${engineer.user.firstName} ${engineer.user.lastName}` : 'Unknown',
          month,
          year,
          totalAmount: calculation.totalAmount,
          status: calculation.status,
          createdAt: calculation.createdAt,
        });
      } catch (error) {
        // Если индивидуальные ставки не установлены - логируем, но не прерываем процесс
        // для других инженеров
        this.logger.warn(`Skipped salary calculation for engineer ${engineer.id}: ${error.message}`);

        // Можно создать запись о том, что расчет пропущен из-за отсутствия ставок
        // Но пока просто логируем
      }
    }

    this.logger.log(`Completed salary calculation for ${results.length} engineers`);
    return results;
  }

  /**
   * Расчет зарплаты для одного инженера
   */
  private async calculateEngineerSalary(
    engineer: Engineer,
    month: number,
    year: number,
    calculatedById?: number
  ): Promise<SalaryCalculation> {
    // Получаем отчеты за месяц
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const workReports = await this.workReportRepository
      .createQueryBuilder('workReport')
      .leftJoinAndSelect('workReport.organization', 'organization')
      .where('workReport.engineerId = :engineerId', { engineerId: engineer.id })
      .andWhere('workReport.startTime >= :startDate', { startDate })
      .andWhere('workReport.startTime < :endDate', { endDate })
      .getMany();

    // Используем новый метод расчета месячной зарплаты
    const monthlyCalculation = await this.calculationService.calculateMonthlySalary(
      engineer,
      workReports,
      engineer.planHoursMonth
    );

    // Расчет выручки от заказчика (для аналитики)
    let clientRevenue = 0;
    for (const report of workReports) {
      if (report.order?.organization) {
        clientRevenue += report.totalHours * report.order.organization.baseRate;
      }
    }

    const profitMargin = clientRevenue - monthlyCalculation.totalAmount;

    // Сохраняем расчет с новой структурой по требованиям:
    // Фиксированная зарплата всегда выплачивается + дополнительная оплата + оплата за автомобиль
    const calculation = this.salaryCalculationRepository.create({
      engineerId: engineer.id,
      month,
      year,
      plannedHours: engineer.planHoursMonth,
      actualHours: monthlyCalculation.actualHours,
      overtimeHours: monthlyCalculation.overtimeHours,
      baseAmount: monthlyCalculation.baseAmount,
      overtimeAmount: monthlyCalculation.overtimeAmount,
      bonusAmount: monthlyCalculation.bonusAmount,
      carUsageAmount: monthlyCalculation.totalCarAmount, // Теперь храним общую сумму за автомобиль
      fixedSalary: monthlyCalculation.fixedSalary,
      fixedCarAmount: monthlyCalculation.fixedCarAmount,
      additionalEarnings: monthlyCalculation.earnedAmount, // Теперь это заработанная сумма
      totalAmount: monthlyCalculation.totalAmount,
      clientRevenue,
      profitMargin,
      status: CalculationStatus.CALCULATED,
      calculatedById,
    });

    return await this.salaryCalculationRepository.save(calculation);
  }

  /**
   * Получение расчетов зарплаты с фильтрами
   */
  async getSalaryCalculations(
    engineerId?: number,
    month?: number,
    year?: number,
    status?: CalculationStatus
  ): Promise<SalaryCalculation[]> {
    const query = this.salaryCalculationRepository.createQueryBuilder('calculation')
      .leftJoinAndSelect('calculation.engineer', 'engineer')
      .leftJoinAndSelect('engineer.user', 'user')
      .leftJoinAndSelect('calculation.calculatedBy', 'calculatedBy');

    if (engineerId) {
      query.andWhere('calculation.engineerId = :engineerId', { engineerId });
    }

    if (month) {
      query.andWhere('calculation.month = :month', { month });
    }

    if (year) {
      query.andWhere('calculation.year = :year', { year });
    }

    if (status) {
      query.andWhere('calculation.status = :status', { status });
    }

    query.orderBy('calculation.year', 'DESC')
         .addOrderBy('calculation.month', 'DESC')
         .addOrderBy('calculation.createdAt', 'DESC');

    return await query.getMany();
  }

  /**
   * Обновление статуса расчета
   */
  async updateCalculationStatus(
    calculationId: number,
    status: CalculationStatus,
    userId?: number
  ): Promise<SalaryCalculation> {
    const calculation = await this.salaryCalculationRepository.findOne({
      where: { id: calculationId },
    });

    if (!calculation) {
      throw new Error(`Salary calculation with id ${calculationId} not found`);
    }

    calculation.status = status;

    if (userId) {
      calculation.calculatedById = userId;
    }

    const updatedCalculation = await this.salaryCalculationRepository.save(calculation);

    // Отправка уведомления при изменении статуса
    if (status === CalculationStatus.APPROVED && calculation.engineer?.user?.email) {
      await this.sendApprovalNotification(calculation);
    }

    return updatedCalculation;
  }

  /**
   * Отправка уведомления об утверждении расчета
   */
  private async sendApprovalNotification(calculation: SalaryCalculation): Promise<void> {
    if (!calculation.engineer?.user?.email) return;

    const userName = `${calculation.engineer.user.firstName} ${calculation.engineer.user.lastName}`;
    const monthName = new Date(calculation.year, calculation.month - 1).toLocaleString('ru-RU', { month: 'long' });

    try {
      await this.emailService.sendSalaryCalculationReady(
        calculation.engineer.user.email,
        userName,
        calculation.month,
        calculation.year,
        calculation.totalAmount
      );
    } catch (error) {
      this.logger.error('Failed to send salary calculation approval notification:', error);
    }
  }

  /**
   * Автоматический ежемесячный расчет зарплаты (1-го числа каждого месяца в 9:00)
   */
  @Cron('0 9 1 * *')
  async performMonthlySalaryCalculations(): Promise<void> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Расчет за предыдущий месяц
    const calculationMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const calculationYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    this.logger.log(`Starting monthly salary calculations for ${calculationMonth}/${calculationYear}`);

    try {
      const results = await this.calculateSalaryForMonthManual(calculationMonth, calculationYear);

      // Отправка отчета администраторам
      await this.sendMonthlyReportToAdmins(calculationMonth, calculationYear, results);

      this.logger.log(`Monthly salary calculations completed for ${results.length} engineers`);
    } catch (error) {
      this.logger.error('Monthly salary calculations failed:', error);
    }
  }

  /**
   * Отправка ежемесячного отчета администраторам
   */
  private async sendMonthlyReportToAdmins(
    month: number,
    year: number,
    results: SalaryCalculationResult[]
  ): Promise<void> {
    // Получить всех администраторов
    const admins = await this.engineerRepository.find({
      relations: ['user'],
    });

    // Фильтруем администраторов
    const adminEngineers = admins.filter(admin => admin.user?.role === 'admin');

    if (adminEngineers.length === 0) return;

    const totalSalaryAmount = results.reduce((sum, result) => sum + result.totalAmount, 0);
    const totalClientRevenue = results.reduce((sum, result) => {
      // Здесь нужно получить данные о выручке - упрощенная версия
      return sum + (result.totalAmount * 1.5); // Предполагаем маржу 50%
    }, 0);

    const topEarners = results
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)
      .map(result => ({ name: result.engineerName, amount: result.totalAmount }));

    for (const admin of adminEngineers) {
      if (admin.user?.email) {
        try {
          await this.emailService.sendMonthlySalaryReport(
            admin.user.email,
            `${admin.user.firstName} ${admin.user.lastName}`,
            month,
            year,
            {
              totalEngineers: results.length,
              totalSalaryAmount,
              totalClientRevenue,
              totalProfit: totalClientRevenue - totalSalaryAmount,
              topEarners,
            }
          );
        } catch (error) {
          this.logger.error(`Failed to send monthly report to ${admin.user.email}:`, error);
        }
      }
    }
  }
}
