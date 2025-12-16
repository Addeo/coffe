import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { Engineer } from '../../entities/engineer.entity';
import { WorkSession } from '../../entities/work-session.entity';
import {
  MonthlyStatisticsDto,
  AgentEarningsData,
  OrganizationEarningsData,
  OvertimeStatisticsData,
  ComprehensiveStatisticsDto,
  ComprehensiveStatisticsOptions,
  EngineerTimeBasedData,
  FinancialBreakdownData,
  RankingData,
  EfficiencyData,
  ForecastData,
} from '../../dtos/reports.dto';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Engineer)
    private engineerRepository: Repository<Engineer>,
    @InjectRepository(WorkSession)
    private workSessionRepository: Repository<WorkSession>
  ) {}

  async getUserEarningsStatistics(
    userId: number,
    months: number = 12
  ): Promise<
    Array<{
      userId: number;
      month: number;
      year: number;
      totalEarnings: number;
      completedOrders: number;
      totalHours: number;
    }>
  > {
    // Получаем инженера
    const engineer = await this.engineerRepository.findOne({
      where: { userId },
    });

    if (!engineer) {
      return [];
    }

    const currentDate = new Date();
    const statistics: Array<{
      userId: number;
      month: number;
      year: number;
      totalEarnings: number;
      completedOrders: number;
      totalHours: number;
    }> = [];

    // ⭐ Рассчитываем статистику для каждого месяца из WorkSession (по workDate!)
    for (let i = 0; i < months; i++) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const targetMonth = targetDate.getMonth() + 1;
      const targetYear = targetDate.getFullYear();

      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 1);

      const sessions = await this.workSessionRepository
        .createQueryBuilder('session')
        .where('session.engineerId = :engineerId', { engineerId: engineer.id })
        .andWhere('session.status = :status', { status: 'completed' })
        .andWhere('session.workDate >= :startDate', { startDate })
        .andWhere('session.workDate < :endDate', { endDate })
        .getMany();

      let totalEarnings = 0;
      let totalHours = 0;
      const uniqueOrders = new Set<number>();

      for (const session of sessions) {
        totalEarnings +=
          (Number(session.calculatedAmount) || 0) + (Number(session.carUsageAmount) || 0);

        // ВАЖНО: Часы рассчитываются с учетом коэффициента
        // Формула: regularHours + (overtimeHours * overtimeCoefficient)
        const overtimeCoefficient = Number(session.engineerOvertimeCoefficient) || 1.6;
        const regularHours = Number(session.regularHours) || 0;
        const overtimeHours = Number(session.overtimeHours) || 0;
        const totalWorkedHours = regularHours + overtimeHours * overtimeCoefficient;

        totalHours += totalWorkedHours;
        if (session.orderId) {
          uniqueOrders.add(session.orderId);
        }
      }

      statistics.push({
        userId,
        month: targetMonth,
        year: targetYear,
        totalEarnings,
        completedOrders: uniqueOrders.size, // Количество уникальных заказов
        totalHours,
      });
    }

    return statistics;
  }

  async getUserRankByEarnings(userId: number, year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Получаем инженера текущего пользователя
    const engineer = await this.engineerRepository.findOne({
      where: { userId },
    });

    if (!engineer) {
      return -1; // Пользователь не имеет профиля инженера
    }

    // ВАЖНО: Статистика теперь считается ТОЛЬКО из WorkSession (по workDate!)
    // Рассчитываем заработок текущего пользователя из WorkSession
    const userSessions = await this.workSessionRepository
      .createQueryBuilder('session')
      .where('session.engineerId = :engineerId', { engineerId: engineer.id })
      .andWhere('session.status = :status', { status: 'completed' })
      .andWhere('session.workDate >= :startDate', { startDate })
      .andWhere('session.workDate < :endDate', { endDate })
      .getMany();

    let userTotalEarnings = 0;
    for (const session of userSessions) {
      userTotalEarnings +=
        (Number(session.calculatedAmount) || 0) + (Number(session.carUsageAmount) || 0);
    }

    if (userTotalEarnings === 0) {
      return -1; // Пользователь не имеет заработка за этот период
    }

    // Получаем всех инженеров и их заработки за период
    const allEngineers = await this.engineerRepository.find({
      relations: ['user'],
    });

    let rank = 0;
    for (const otherEngineer of allEngineers) {
      if (otherEngineer.id === engineer.id) continue;

      const otherSessions = await this.workSessionRepository
        .createQueryBuilder('session')
        .where('session.engineerId = :engineerId', { engineerId: otherEngineer.id })
        .andWhere('session.status = :status', { status: 'completed' })
        .andWhere('session.workDate >= :startDate', { startDate })
        .andWhere('session.workDate < :endDate', { endDate })
        .getMany();

      let otherTotalEarnings = 0;
      for (const session of otherSessions) {
        otherTotalEarnings +=
          (Number(session.calculatedAmount) || 0) + (Number(session.carUsageAmount) || 0);
      }

      if (otherTotalEarnings > userTotalEarnings) {
        rank++;
      }
    }

    return rank + 1; // +1 потому что ранк начинается с 1
  }

  async getEarningsComparison(userId: number): Promise<{
    currentMonth: {
      totalEarnings: number;
      completedOrders: number;
      totalHours: number;
      month: number;
      year: number;
    } | null;
    previousMonth: {
      totalEarnings: number;
      completedOrders: number;
      totalHours: number;
      month: number;
      year: number;
    } | null;
    growth: number;
  }> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Получаем инженера по userId
    const engineer = await this.engineerRepository.findOne({
      where: { userId },
    });

    if (!engineer) {
      return {
        currentMonth: null,
        previousMonth: null,
        growth: 0,
      };
    }

    // ВАЖНО: Статистика теперь считается ТОЛЬКО из WorkSession (по workDate!)
    // Рассчитываем статистику за текущий месяц из WorkSession
    const currentStartDate = new Date(currentYear, currentMonth - 1, 1);
    const currentEndDate = new Date(currentYear, currentMonth, 1);

    const currentSessions = await this.workSessionRepository
      .createQueryBuilder('session')
      .where('session.engineerId = :engineerId', { engineerId: engineer.id })
      .andWhere('session.status = :status', { status: 'completed' })
      .andWhere('session.workDate >= :startDate', { startDate: currentStartDate })
      .andWhere('session.workDate < :endDate', { endDate: currentEndDate })
      .getMany();

    let currentTotalEarnings = 0;
    let currentTotalHours = 0;
    const currentUniqueOrders = new Set<number>();

    for (const session of currentSessions) {
      currentTotalEarnings +=
        (Number(session.calculatedAmount) || 0) + (Number(session.carUsageAmount) || 0);

      // ВАЖНО: Часы рассчитываются с учетом коэффициента
      const overtimeCoefficient = Number(session.engineerOvertimeCoefficient) || 1.6;
      const regularHours = Number(session.regularHours) || 0;
      const overtimeHours = Number(session.overtimeHours) || 0;
      currentTotalHours += regularHours + overtimeHours * overtimeCoefficient;

      if (session.orderId) {
        currentUniqueOrders.add(session.orderId);
      }
    }

    // Рассчитываем статистику за предыдущий месяц из WorkSession
    const prevStartDate = new Date(previousYear, previousMonth - 1, 1);
    const prevEndDate = new Date(previousYear, previousMonth, 1);

    const prevSessions = await this.workSessionRepository
      .createQueryBuilder('session')
      .where('session.engineerId = :engineerId', { engineerId: engineer.id })
      .andWhere('session.status = :status', { status: 'completed' })
      .andWhere('session.workDate >= :startDate', { startDate: prevStartDate })
      .andWhere('session.workDate < :endDate', { endDate: prevEndDate })
      .getMany();

    let prevTotalEarnings = 0;
    let prevTotalHours = 0;
    const prevUniqueOrders = new Set<number>();

    for (const session of prevSessions) {
      prevTotalEarnings +=
        (Number(session.calculatedAmount) || 0) + (Number(session.carUsageAmount) || 0);

      // ВАЖНО: Часы рассчитываются с учетом коэффициента
      const overtimeCoefficient = Number(session.engineerOvertimeCoefficient) || 1.6;
      const regularHours = Number(session.regularHours) || 0;
      const overtimeHours = Number(session.overtimeHours) || 0;
      prevTotalHours += regularHours + overtimeHours * overtimeCoefficient;

      if (session.orderId) {
        prevUniqueOrders.add(session.orderId);
      }
    }

    let growth = 0;
    if (prevTotalEarnings > 0) {
      growth = ((currentTotalEarnings - prevTotalEarnings) / prevTotalEarnings) * 100;
    }

    return {
      currentMonth: {
        totalEarnings: currentTotalEarnings,
        completedOrders: currentUniqueOrders.size,
        totalHours: currentTotalHours,
        month: currentMonth,
        year: currentYear,
      },
      previousMonth:
        prevSessions.length > 0
          ? {
              totalEarnings: prevTotalEarnings,
              completedOrders: prevUniqueOrders.size,
              totalHours: prevTotalHours,
              month: previousMonth,
              year: previousYear,
            }
          : null,
      growth,
    };
  }

  async getEngineerDetailedStats(userId: number, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Получаем инженера по userId
    const engineer = await this.engineerRepository.findOne({
      where: { userId },
    });

    if (!engineer) {
      // Если у пользователя нет профиля инженера, возвращаем пустую статистику
      return {
        year,
        month,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        totalEarnings: 0,
        baseEarnings: 0,
        overtimeEarnings: 0,
        bonusEarnings: 0,
        completedOrders: 0,
        averageHoursPerOrder: 0,
        previousMonthEarnings: 0,
        previousMonthHours: 0,
        earningsGrowth: 0,
        hoursGrowth: 0,
        paymentStats: {
          paidToEngineer: 0,
          pendingToEngineer: 0,
          receivedFromOrganization: 0,
          pendingFromOrganization: 0,
        },
      };
    }

    const engineerId = engineer.id;

    // ВАЖНО: Статистика теперь считается ТОЛЬКО из WorkSession
    // Получаем WorkSession за текущий месяц (по workDate!)
    const workSessions = await this.workSessionRepository
      .createQueryBuilder('session')
      .where('session.engineerId = :engineerId', { engineerId })
      .andWhere('session.status = :status', { status: 'completed' })
      .andWhere('session.workDate >= :startDate', { startDate })
      .andWhere('session.workDate < :endDate', { endDate })
      .getMany();

    // Получаем WorkSession за предыдущий месяц для сравнения
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 1);

    const prevWorkSessions = await this.workSessionRepository
      .createQueryBuilder('session')
      .where('session.engineerId = :engineerId', { engineerId })
      .andWhere('session.status = :status', { status: 'completed' })
      .andWhere('session.workDate >= :startDate', { startDate: prevStartDate })
      .andWhere('session.workDate < :endDate', { endDate: prevEndDate })
      .getMany();

    // Рассчитываем текущую статистику из WorkSession
    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let totalEarnings = 0;
    let baseEarnings = 0;
    let overtimeEarnings = 0;
    const uniqueOrders = new Set<number>();

    for (const session of workSessions) {
      const sessionRegularHours = Number(session.regularHours) || 0;
      const sessionOvertimeHours = Number(session.overtimeHours) || 0;
      regularHours += sessionRegularHours;
      overtimeHours += sessionOvertimeHours;

      // ВАЖНО: Часы рассчитываются с учетом коэффициента
      const overtimeCoefficient = Number(session.engineerOvertimeCoefficient) || 1.6;
      const sessionTotalHours = sessionRegularHours + sessionOvertimeHours * overtimeCoefficient;
      totalHours += sessionTotalHours;

      const sessionEarnings =
        (Number(session.calculatedAmount) || 0) + (Number(session.carUsageAmount) || 0);
      totalEarnings += sessionEarnings;

      // Разделение на base/overtime
      baseEarnings += Number(session.regularPayment) || 0;
      overtimeEarnings += Number(session.overtimePayment) || 0;

      if (session.orderId) {
        uniqueOrders.add(session.orderId);
      }
    }

    // Рассчитываем статистику за предыдущий месяц
    let prevTotalHours = 0;
    let prevTotalEarnings = 0;

    for (const session of prevWorkSessions) {
      const sessionRegularHours = Number(session.regularHours) || 0;
      const sessionOvertimeHours = Number(session.overtimeHours) || 0;
      const overtimeCoefficient = Number(session.engineerOvertimeCoefficient) || 1.6;
      prevTotalHours += sessionRegularHours + sessionOvertimeHours * overtimeCoefficient;
      prevTotalEarnings +=
        (Number(session.calculatedAmount) || 0) + (Number(session.carUsageAmount) || 0);
    }

    const completedOrders = uniqueOrders.size;
    const averageHoursPerOrder = completedOrders > 0 ? totalHours / completedOrders : 0;
    const earningsGrowth =
      prevTotalEarnings > 0 ? ((totalEarnings - prevTotalEarnings) / prevTotalEarnings) * 100 : 0;
    const hoursGrowth =
      prevTotalHours > 0 ? ((totalHours - prevTotalHours) / prevTotalHours) * 100 : 0;

    // Статистика по платежам (из заказов, связанных с сессиями)
    const orderIds = Array.from(uniqueOrders);
    const orders =
      orderIds.length > 0
        ? await this.orderRepository.find({ where: { id: orderIds as any } })
        : [];

    const paidOrders = orders.filter(order => order.status === 'paid_to_engineer').length;
    const pendingPaymentOrders = orders.filter(order => order.status === 'completed').length;
    const receivedFromOrgOrders = orders.filter(order => order.receivedFromOrganization).length;
    const pendingFromOrgOrders = orders.filter(order => !order.receivedFromOrganization).length;

    return {
      year,
      month,
      totalHours,
      regularHours,
      overtimeHours,
      totalEarnings,
      baseEarnings,
      overtimeEarnings,
      bonusEarnings: 0, // Можно добавить логику бонусов
      completedOrders,
      averageHoursPerOrder,
      previousMonthEarnings: prevTotalEarnings,
      previousMonthHours: prevTotalHours,
      earningsGrowth,
      hoursGrowth,
      // Новая статистика по платежам
      paymentStats: {
        paidToEngineer: paidOrders,
        pendingToEngineer: pendingPaymentOrders,
        receivedFromOrganization: receivedFromOrgOrders,
        pendingFromOrganization: pendingFromOrgOrders,
      },
    };
  }

  async getMonthlyStatistics(year: number, month: number): Promise<MonthlyStatisticsDto> {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    try {
      console.log('Getting monthly statistics for', year, month);

      // Get agent earnings data
      console.log('Fetching agent earnings...');
      const agentEarnings = await this.getAgentEarningsData(year, month);
      console.log('Agent earnings:', agentEarnings.length, 'records');

      // Get organization earnings data
      console.log('Fetching organization earnings...');
      const organizationEarnings = await this.getOrganizationEarningsData(startDate, endDate);
      console.log('Organization earnings:', organizationEarnings.length, 'records');

      // Get overtime statistics
      console.log('Fetching overtime statistics...');
      const overtimeStatistics = await this.getOvertimeStatisticsData(startDate, endDate);
      console.log('Overtime statistics:', overtimeStatistics.length, 'records');

      // Calculate totals
      const totalEarnings = agentEarnings.reduce((sum, agent) => sum + agent.totalEarnings, 0);
      const totalOrders = agentEarnings.reduce((sum, agent) => sum + agent.completedOrders, 0);
      const totalOvertimeHours = overtimeStatistics.reduce(
        (sum, stat) => sum + stat.overtimeHours,
        0
      );

      // Calculate financial metrics
      const totalOrganizationRevenue = organizationEarnings.reduce(
        (sum, org) => sum + org.totalRevenue,
        0
      );
      const totalAgentEarnings = agentEarnings.reduce((sum, agent) => sum + agent.totalEarnings, 0);
      const totalCompanyRevenue = totalOrganizationRevenue;

      // Получаем реальные выплаты от организаций и инженерам из orders
      const totalOrganizationPaid = await this.getTotalOrganizationPayments(startDate, endDate);
      const totalAgentPayments = await this.getTotalAgentPayments(startDate, endDate);
      const companyProfit = totalCompanyRevenue - totalAgentPayments;

      console.log('Monthly statistics calculated successfully');
      return {
        year,
        month,
        monthName: monthNames[month - 1],
        agentEarnings,
        organizationEarnings,
        overtimeStatistics,
        totalEarnings,
        totalOrders,
        totalOvertimeHours,
        totalOrganizationRevenue,
        totalOrganizationPaid,
        totalAgentEarnings,
        totalCompanyRevenue,
        totalAgentPayments,
        companyProfit,
      };
    } catch (error) {
      console.error('Error getting monthly statistics:', error);
      console.error('Error stack:', error.stack);
      // Return empty statistics instead of throwing error
      return {
        year,
        month,
        monthName: monthNames[month - 1],
        agentEarnings: [],
        organizationEarnings: [],
        overtimeStatistics: [],
        totalEarnings: 0,
        totalOrders: 0,
        totalOvertimeHours: 0,
        totalOrganizationRevenue: 0,
        totalOrganizationPaid: 0,
        totalAgentEarnings: 0,
        totalCompanyRevenue: 0,
        totalAgentPayments: 0,
        companyProfit: 0,
      };
    }
  }

  /**
   * Get detailed admin statistics showing engineer earnings vs organization payments
   */
  async getAdminEngineerStatistics(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // ВАЖНО: Начинаем с Engineer, чтобы включить ВСЕХ инженеров, даже без сессий
    const engineerStats = await this.engineerRepository
      .createQueryBuilder('engineer')
      .select('engineer.userId', 'engineerId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('user.email', 'email')
      .addSelect('engineer.planHoursMonth', 'planHoursMonth')
      .addSelect('engineer.fixedCarAmount', 'fixedCarAmount')
      .addSelect('COUNT(DISTINCT session.orderId)', 'completedOrders')
      .addSelect('COALESCE(SUM(session.regularHours), 0)', 'regularHours')
      .addSelect('COALESCE(SUM(session.overtimeHours), 0)', 'overtimeHours')
      .addSelect('COALESCE(SUM(session.calculatedAmount), 0)', 'engineerEarnings')
      .addSelect('COALESCE(SUM(session.organizationPayment), 0)', 'organizationPayments')
      .addSelect('COALESCE(SUM(session.carUsageAmount), 0)', 'carUsageAmount')
      .addSelect(
        'COALESCE(AVG(session.engineerOvertimeCoefficient), 1.6)',
        'avgOvertimeCoefficient'
      )
      .innerJoin('engineer.user', 'user')
      .leftJoin(
        'work_sessions',
        'session',
        'session.engineerId = engineer.id AND session.workDate >= :startDate AND session.workDate < :endDate AND session.status = :status',
        { startDate, endDate, status: 'completed' }
      )
      .where('user.role = :role', { role: UserRole.USER })
      .andWhere('engineer.isActive = :isActive', { isActive: true })
      .groupBy('engineer.userId')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .addGroupBy('user.email')
      .addGroupBy('engineer.planHoursMonth')
      .addGroupBy('engineer.fixedCarAmount')
      .orderBy('engineerEarnings', 'DESC')
      .getRawMany();

    const engineerStatsWithProfit = engineerStats.map(stat => {
      // ВАЖНО: Часы рассчитываются с учетом коэффициента
      const avgOvertimeCoefficient = Number(stat.avgOvertimeCoefficient) || 1.6;
      const regularHours = Number(stat.regularHours) || 0;
      const overtimeHours = Number(stat.overtimeHours) || 0;
      const totalHours = regularHours + overtimeHours * avgOvertimeCoefficient;
      const engineerEarnings = Number(stat.engineerEarnings) || 0;
      const organizationPayments = Number(stat.organizationPayments) || 0;
      const carUsageAmount = Number(stat.carUsageAmount) || 0;
      const fixedCarAmount = Number(stat.fixedCarAmount) || 0;

      // Прибыль = (оплата от организации) - (оплата инженеру за работу)
      // ВАЖНО: organizationPayments уже включает carUsageAmount (организация платит за работу + авто)
      // carUsageAmount не влияет на прибыль, так как организация его оплачивает
      const profit = organizationPayments - engineerEarnings;

      // Общая сумма от организации уже включает доплату за машину
      const totalOrganizationPayment = organizationPayments;
      // Инженер получает только за работу (carUsageAmount оплачивает организация)
      const totalEngineerPayment = engineerEarnings;

      const profitMargin =
        totalOrganizationPayment > 0 ? (profit / totalOrganizationPayment) * 100 : 0;

      return {
        engineerId: stat.engineerId,
        engineerName: `${stat.firstName || ''} ${stat.lastName || ''}`.trim() || 'Unknown',
        email: stat.email,
        planHoursMonth: Number(stat.planHoursMonth) || 160,
        completedOrders: Number(stat.completedOrders) || 0,
        totalHours: totalHours, // Используем расчет с коэффициентом
        engineerEarnings: engineerEarnings, // Оплата за работу (carUsageAmount оплачивает организация)
        carUsageAmount: carUsageAmount, // Расходы на авто (оплачивает организация, не влияет на прибыль)
        fixedCarAmount: fixedCarAmount, // Ежемесячная фиксированная оплата за авто (наша затрата)
        totalEarnings: totalEngineerPayment, // Общая сумма выплат инженеру (за работу + фиксированная оплата за авто)
        organizationPayments: totalOrganizationPayment, // Включает оплату за работу + расходы на авто
        profit,
        profitMargin,
      };
    });

    // Calculate totals
    const totals = engineerStatsWithProfit.reduce(
      (acc, stat) => ({
        completedOrders: acc.completedOrders + stat.completedOrders,
        totalHours: acc.totalHours + stat.totalHours,
        engineerEarnings: acc.engineerEarnings + stat.engineerEarnings,
        carUsageAmount: acc.carUsageAmount + stat.carUsageAmount,
        fixedCarAmount: acc.fixedCarAmount + stat.fixedCarAmount,
        totalEarnings: acc.totalEarnings + stat.totalEarnings,
        organizationPayments: acc.organizationPayments + stat.organizationPayments,
        profit: acc.profit + stat.profit,
      }),
      {
        completedOrders: 0,
        totalHours: 0,
        engineerEarnings: 0,
        carUsageAmount: 0,
        fixedCarAmount: 0,
        totalEarnings: 0,
        organizationPayments: 0,
        profit: 0,
      }
    );

    const totalProfitMargin =
      totals.organizationPayments > 0 ? (totals.profit / totals.organizationPayments) * 100 : 0;

    return {
      year,
      month,
      engineers: engineerStatsWithProfit,
      totals: {
        ...totals,
        profitMargin: totalProfitMargin,
      },
    };
  }

  private async getAgentEarningsData(year: number, month: number): Promise<AgentEarningsData[]> {
    // ВАЖНО: Статистика теперь считается ТОЛЬКО из WorkSession (по workDate!)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const agentData = await this.engineerRepository
      .createQueryBuilder('engineer')
      .select('engineer.userId', 'userId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('engineer.fixedCarAmount', 'fixedCarAmount')
      .addSelect(
        'COALESCE(SUM(session.calculatedAmount), 0)',
        'totalEarnings'
      )
      .addSelect('COALESCE(SUM(session.calculatedAmount), 0)', 'earnedAmount')
      .addSelect('COALESCE(SUM(session.carUsageAmount), 0)', 'carPayments')
      .addSelect('COUNT(DISTINCT session.orderId)', 'completedOrders')
      .addSelect(
        'COALESCE(AVG(session.calculatedAmount), 0)',
        'averageOrderValue'
      )
      .innerJoin('engineer.user', 'user')
      .leftJoin(
        'work_sessions',
        'session',
        'session.engineerId = engineer.id AND session.workDate >= :startDate AND session.workDate < :endDate AND session.status = :status',
        { startDate, endDate, status: 'completed' }
      )
      .where('user.role = :role', { role: UserRole.USER })
      .andWhere('engineer.isActive = :isActive', { isActive: true })
      .groupBy('engineer.userId')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .addGroupBy('engineer.fixedCarAmount')
      .orderBy('totalEarnings', 'DESC')
      .getRawMany();

    return agentData.map(data => ({
      agentId: Number(data.userId),
      agentName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown',
      totalEarnings: Number(data.totalEarnings) || 0,
      earnedAmount: Number(data.earnedAmount) || 0, // Оплата за часы
      carPayments: Number(data.carPayments) || 0, // Оплата за авто (из work sessions)
      fixedCarAmount: Number(data.fixedCarAmount) || 0, // Ежемесячная фиксированная оплата за авто
      completedOrders: Number(data.completedOrders) || 0,
      averageOrderValue: Number(data.averageOrderValue) || 0,
    }));
  }

  private async getOrganizationEarningsData(
    startDate: Date,
    endDate: Date
  ): Promise<OrganizationEarningsData[]> {
    // ВАЖНО: Статистика теперь считается ТОЛЬКО из WorkSession (по workDate!)
    // 1. Revenue: organizationPayment (what organizations pay us, includes carUsageAmount)
    // 2. Costs: calculatedAmount (what we pay engineers for work, carUsageAmount is paid by organization)
    // 3. Profit: Revenue - Costs
    const organizationStats = await this.organizationRepository
      .createQueryBuilder('organization')
      .select('organization.id', 'organizationId')
      .addSelect('organization.name', 'organizationName')
      .addSelect('COUNT(DISTINCT session.orderId)', 'totalOrders')
      .addSelect(
        'COALESCE(SUM(session.regularHours + session.overtimeHours * COALESCE(session.engineerOvertimeCoefficient, 1.6)), 0)',
        'totalHours'
      )
      .addSelect('COALESCE(SUM(session.organizationPayment), 0)', 'totalRevenue')
      .addSelect(
        'COALESCE(SUM(session.calculatedAmount), 0)',
        'totalCosts'
      )
      .addSelect('COALESCE(AVG(session.organizationPayment), 0)', 'averageOrderValue')
      .leftJoin('organization.orders', 'order')
      .leftJoin(
        'work_sessions',
        'session',
        'session.orderId = order.id AND session.workDate >= :startDate AND session.workDate < :endDate AND session.status = :status',
        { startDate, endDate, status: 'completed' }
      )
      .where('organization.isActive = :isActive', { isActive: true })
      .groupBy('organization.id')
      .addGroupBy('organization.name')
      .orderBy('totalRevenue', 'DESC')
      .getRawMany();

    return organizationStats.map(stat => {
      const totalRevenue = Number(stat.totalRevenue) || 0;
      const totalCosts = Number(stat.totalCosts) || 0;
      const totalProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return {
        organizationId: stat.organizationId,
        organizationName: stat.organizationName || 'Unknown',
        totalRevenue,
        totalCosts,
        totalProfit,
        profitMargin: Number(profitMargin.toFixed(2)),
        totalOrders: Number(stat.totalOrders) || 0,
        totalHours: Number(stat.totalHours) || 0,
        averageOrderValue: Number(stat.averageOrderValue) || 0,
      };
    });
  }

  private async getOvertimeStatisticsData(
    startDate: Date,
    endDate: Date
  ): Promise<OvertimeStatisticsData[]> {
    // ВАЖНО: Статистика теперь считается ТОЛЬКО из WorkSession (по workDate!)
    const engineerStats = await this.workSessionRepository
      .createQueryBuilder('session')
      .select('engineer.userId', 'engineerId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('SUM(session.overtimeHours)', 'overtimeHours')
      .addSelect('SUM(session.regularHours)', 'regularHours')
      .addSelect(
        'SUM(session.regularHours + session.overtimeHours * COALESCE(session.engineerOvertimeCoefficient, 1.6))',
        'totalHours'
      )
      .innerJoin('session.engineer', 'engineer')
      .innerJoin('engineer.user', 'user')
      .where('session.workDate >= :startDate', { startDate })
      .andWhere('session.workDate < :endDate', { endDate })
      .andWhere('session.status = :status', { status: 'completed' })
      .groupBy('engineer.userId')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .orderBy('overtimeHours', 'DESC')
      .getRawMany();

    return engineerStats.map(stat => {
      const overtimeHours = Number(stat.overtimeHours) || 0;
      const regularHours = Number(stat.regularHours) || 0;
      const totalHours = Number(stat.totalHours) || 0;
      const overtimePercentage = totalHours > 0 ? (overtimeHours / totalHours) * 100 : 0;

      return {
        agentId: stat.engineerId,
        agentName: `${stat.firstName || ''} ${stat.lastName || ''}`.trim() || 'Unknown',
        overtimeHours,
        regularHours,
        totalHours,
        overtimePercentage: Number(overtimePercentage.toFixed(2)),
      };
    });
  }

  async getComprehensiveStatistics(
    year: number,
    month: number,
    options: ComprehensiveStatisticsOptions
  ): Promise<ComprehensiveStatisticsDto> {
    // Получаем базовую статистику
    const baseStats = await this.getMonthlyStatistics(year, month);

    const result: ComprehensiveStatisticsDto = {
      ...baseStats,
    };

    // Временная аналитика
    if (options.includeTimeBased) {
      result.timeBasedAnalytics = {
        salaryChart: await this.getSalaryTimeChart(year, month),
        hoursChart: await this.getHoursTimeChart(year, month),
      };
    }

    // Детальная финансовая аналитика
    if (options.includeFinancial) {
      result.financialAnalytics = {
        breakdown: await this.getFinancialBreakdown(year, month),
        monthlyComparison: {
          currentMonth: baseStats.agentEarnings,
          previousMonth: await this.getPreviousMonthEarnings(year, month),
        },
      };
    }

    // Рейтинги и производительность
    if (options.includeRankings) {
      result.rankings = {
        topEarners: await this.getTopEarners(year, month, 10),
        topByHours: await this.getTopByHours(year, month, 10),
        efficiency: await this.getEfficiencyData(year, month),
      };
    }

    // Прогнозная аналитика
    if (options.includeForecast) {
      result.forecast = await this.getForecastData(year, month);
    }

    return result;
  }

  // Вспомогательные методы для комплексной статистики
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getSalaryTimeChart(year: number, month: number): Promise<EngineerTimeBasedData[]> {
    // TODO: Реализовать получение данных по дням месяца
    console.log('getSalaryTimeChart called with:', { year, month });
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getHoursTimeChart(year: number, month: number): Promise<EngineerTimeBasedData[]> {
    // TODO: Реализовать получение данных по дням месяца
    console.log('getHoursTimeChart called with:', { year, month });
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getFinancialBreakdown(
    year: number,
    month: number
  ): Promise<FinancialBreakdownData[]> {
    // TODO: Реализовать детальную финансовую разбивку
    console.log('getFinancialBreakdown called with:', { year, month });
    return [];
  }

  private async getPreviousMonthEarnings(
    year: number,
    month: number
  ): Promise<AgentEarningsData[]> {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const prevStats = await this.getMonthlyStatistics(prevYear, prevMonth);
    return prevStats.agentEarnings;
  }

  private async getTopEarners(year: number, month: number, limit: number): Promise<RankingData[]> {
    const stats = await this.getMonthlyStatistics(year, month);
    return stats.agentEarnings
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit)
      .map((item, index) => ({
        engineerId: item.agentId,
        engineerName: item.agentName,
        value: item.totalEarnings,
        rank: index + 1,
      }));
  }

  private async getTopByHours(year: number, month: number, limit: number): Promise<RankingData[]> {
    const stats = await this.getMonthlyStatistics(year, month);
    return stats.overtimeStatistics
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, limit)
      .map((item, index) => ({
        engineerId: item.agentId,
        engineerName: item.agentName,
        value: item.totalHours,
        rank: index + 1,
      }));
  }

  private async getEfficiencyData(year: number, month: number): Promise<EfficiencyData[]> {
    const stats = await this.getMonthlyStatistics(year, month);
    return stats.agentEarnings.map(earnings => {
      const overtimeStats = stats.overtimeStatistics.find(s => s.agentId === earnings.agentId);
      const totalHours = overtimeStats?.totalHours || 0;
      const efficiency = totalHours > 0 ? earnings.totalEarnings / totalHours : 0;

      return {
        engineerId: earnings.agentId,
        engineerName: earnings.agentName,
        totalEarnings: earnings.totalEarnings,
        totalHours,
        efficiency: Number(efficiency.toFixed(2)),
      };
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getForecastData(year: number, month: number): Promise<ForecastData> {
    // TODO: Реализовать прогнозную аналитику
    console.log('getForecastData called with:', { year, month });
    return {
      currentWorkPace: 0,
      monthEndForecast: 0,
      growthPotential: 0,
      actualData: [],
      forecastData: [],
    };
  }

  /**
   * Получает общую сумму выплат инженерам за период
   * ВАЖНО: Статистика теперь считается ТОЛЬКО из WorkSession (по workDate!)
   * ВАЖНО: Используем только calculatedAmount, так как carUsageAmount оплачивает организация
   */
  private async getTotalAgentPayments(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await this.workSessionRepository
        .createQueryBuilder('session')
        .select('SUM(session.calculatedAmount)', 'totalPayments')
        .where('session.workDate >= :startDate', { startDate })
        .andWhere('session.workDate < :endDate', { endDate })
        .andWhere('session.status = :status', { status: 'completed' })
        .getRawOne();

      return Number(result?.totalPayments) || 0;
    } catch (error) {
      console.error('Error getting total agent payments:', error);
      return 0;
    }
  }

  /**
   * Получает общую сумму платежей от организаций за период
   * ВАЖНО: Статистика теперь считается ТОЛЬКО из WorkSession (по workDate!)
   * Используем organizationPayment для согласованности с getOrganizationEarningsData
   */
  private async getTotalOrganizationPayments(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await this.workSessionRepository
        .createQueryBuilder('session')
        .select('SUM(session.organizationPayment)', 'totalPayments')
        .where('session.workDate >= :startDate', { startDate })
        .andWhere('session.workDate < :endDate', { endDate })
        .andWhere('session.status = :status', { status: 'completed' })
        .getRawOne();

      return Number(result?.totalPayments) || 0;
    } catch (error) {
      console.error('Error getting total organization payments:', error);
      return 0;
    }
  }

  // Новая статистика по долгам и обязательствам
  async getPaymentDebtsStatistics(
    year: number,
    month: number
  ): Promise<{
    engineerDebts: Array<{
      engineerId: number;
      engineerName: string;
      totalDebt: number;
      completedOrders: number;
      paidOrders: number;
      pendingOrders: number;
    }>;
    organizationDebts: Array<{
      organizationId: number;
      organizationName: string;
      totalDebt: number;
      completedOrders: number;
      receivedOrders: number;
      pendingOrders: number;
    }>;
    summary: {
      totalEngineerDebt: number;
      totalOrganizationDebt: number;
      netDebt: number; // organizationDebt - engineerDebt
    };
  }> {
    // ВАЖНО: Статистика теперь считается ТОЛЬКО из WorkSession (по workDate!)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Статистика по долгам инженерам (из WorkSession)
    const engineerDebts = await this.workSessionRepository
      .createQueryBuilder('session')
      .select('engineer.userId', 'engineerId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect(
        'SUM(CASE WHEN order.status = "completed" THEN session.calculatedAmount ELSE 0 END)',
        'totalDebt'
      )
      .addSelect(
        'COUNT(DISTINCT CASE WHEN order.status IN ("completed", "paid_to_engineer") THEN session.orderId END)',
        'completedOrders'
      )
      .addSelect(
        'COUNT(DISTINCT CASE WHEN order.status = "paid_to_engineer" THEN session.orderId END)',
        'paidOrders'
      )
      .addSelect(
        'COUNT(DISTINCT CASE WHEN order.status = "completed" THEN session.orderId END)',
        'pendingOrders'
      )
      .innerJoin('session.engineer', 'engineer')
      .innerJoin('engineer.user', 'user')
      .innerJoin('session.order', 'order')
      .where('session.workDate >= :startDate', { startDate })
      .andWhere('session.workDate < :endDate', { endDate })
      .andWhere('session.status = :status', { status: 'completed' })
      .andWhere('order.status IN (:...statuses)', { statuses: ['completed', 'paid_to_engineer'] })
      .groupBy('engineer.userId')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .getRawMany();

    // Статистика по долгам организаций (из WorkSession)
    const organizationDebts = await this.workSessionRepository
      .createQueryBuilder('session')
      .select('order.organizationId', 'organizationId')
      .addSelect('organization.name', 'organizationName')
      .addSelect(
        'SUM(CASE WHEN order.status IN ("completed", "paid_to_engineer") AND NOT order.receivedFromOrganization THEN session.organizationPayment ELSE 0 END)',
        'totalDebt'
      )
      .addSelect(
        'COUNT(DISTINCT CASE WHEN order.status IN ("completed", "paid_to_engineer") THEN session.orderId END)',
        'completedOrders'
      )
      .addSelect(
        'COUNT(DISTINCT CASE WHEN order.receivedFromOrganization THEN session.orderId END)',
        'receivedOrders'
      )
      .addSelect(
        'COUNT(DISTINCT CASE WHEN order.status IN ("completed", "paid_to_engineer") AND NOT order.receivedFromOrganization THEN session.orderId END)',
        'pendingOrders'
      )
      .innerJoin('session.order', 'order')
      .leftJoin('order.organization', 'organization')
      .where('session.workDate >= :startDate', { startDate })
      .andWhere('session.workDate < :endDate', { endDate })
      .andWhere('session.status = :status', { status: 'completed' })
      .andWhere('order.status IN (:...statuses)', { statuses: ['completed', 'paid_to_engineer'] })
      .andWhere('order.organizationId IS NOT NULL')
      .groupBy('order.organizationId')
      .addGroupBy('organization.name')
      .getRawMany();

    // Подсчет общей суммы долгов
    const totalEngineerDebt = engineerDebts.reduce(
      (sum, debt) => sum + (Number(debt.totalDebt) || 0),
      0
    );
    const totalOrganizationDebt = organizationDebts.reduce(
      (sum, debt) => sum + (Number(debt.totalDebt) || 0),
      0
    );

    return {
      engineerDebts: engineerDebts.map(debt => ({
        engineerId: Number(debt.engineerId),
        engineerName: `${debt.firstName || ''} ${debt.lastName || ''}`.trim() || 'Unknown',
        totalDebt: Number(debt.totalDebt) || 0,
        completedOrders: Number(debt.completedOrders) || 0,
        paidOrders: Number(debt.paidOrders) || 0,
        pendingOrders: Number(debt.pendingOrders) || 0,
      })),
      organizationDebts: organizationDebts.map(debt => ({
        organizationId: Number(debt.organizationId),
        organizationName: debt.organizationName || 'Unknown',
        totalDebt: Number(debt.totalDebt) || 0,
        completedOrders: Number(debt.completedOrders) || 0,
        receivedOrders: Number(debt.receivedOrders) || 0,
        pendingOrders: Number(debt.pendingOrders) || 0,
      })),
      summary: {
        totalEngineerDebt,
        totalOrganizationDebt,
        netDebt: totalOrganizationDebt - totalEngineerDebt,
      },
    };
  }

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

    // Общая сумма к доплате за автомобили (организации должны заплатить)
    const totalCarAmount = carPayments.reduce(
      (sum, session) => sum + (Number(session.carUsageAmount) || 0),
      0
    );

    // Уже заплачено за автомобили (проверяем по receivedFromOrganization)
    // ВАЖНО: Организации оплачивают расходы на авто отдельно, поэтому проверяем получение оплаты от организации
    const paidCarAmount = carPayments
      .filter(session => session.order?.receivedFromOrganization === true)
      .reduce((sum, session) => sum + (Number(session.carUsageAmount) || 0), 0);

    // Группировка по организациям
    const organizationBreakdown = this.groupCarPaymentsByOrganization(carPayments);

    // Группировка по инженерам
    const engineerBreakdown = this.groupCarPaymentsByEngineer(carPayments);

    // Сортируем организации по сумме к оплате (от большей к меньшей)
    const sortedOrganizationBreakdown = organizationBreakdown.sort(
      (a, b) => b.pendingCarAmount - a.pendingCarAmount
    );

    const result = {
      year,
      month,
      monthName: new Date(year, month - 1, 1).toLocaleString('ru-RU', { month: 'long' }),
      // Общая статистика
      totalCarAmount: Number(totalCarAmount.toFixed(2)),
      paidCarAmount: Number(paidCarAmount.toFixed(2)),
      pendingCarAmount: Number((totalCarAmount - paidCarAmount).toFixed(2)),
      paymentStatus: totalCarAmount > 0 ? Number(((paidCarAmount / totalCarAmount) * 100).toFixed(2)) : 0,
      // Детальная статистика по организациям (сортировка по сумме к оплате)
      organizationBreakdown: sortedOrganizationBreakdown,
      // Статистика по инженерам
      engineerBreakdown,
      // Сводка по организациям
      organizationSummary: {
        totalOrganizations: sortedOrganizationBreakdown.length,
        organizationsWithPendingPayments: sortedOrganizationBreakdown.filter(org => org.pendingCarAmount > 0).length,
        organizationsFullyPaid: sortedOrganizationBreakdown.filter(org => org.pendingCarAmount === 0).length,
      },
    };

    return result;
  }

  /**
   * Получить список организаций с долгами по автомобильным расходам
   * ВАЖНО: Организации оплачивают расходы на авто отдельно
   */
  async getOrganizationCarPayments(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Получаем все рабочие сессии с автомобильными отчислениями
    const carPayments = await this.workSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.order', 'order')
      .leftJoinAndSelect('order.organization', 'organization')
      .where('session.workDate >= :startDate', { startDate })
      .andWhere('session.workDate < :endDate', { endDate })
      .andWhere('session.carUsageAmount > 0')
      .andWhere('session.status = :status', { status: 'completed' })
      .getMany();

    // Группируем по организациям
    const orgMap = new Map<
      number,
      {
        organizationId: number;
        organizationName: string;
        totalCarAmount: number;
        paidCarAmount: number;
        totalRevenue: number; // Поступления от организаций (organizationPayment)
        engineerCost: number; // Выплаты инженерам (calculatedAmount)
        completedOrders: number;
        paidOrders: number;
        orderIds: Set<number>;
        sessions: Array<{
          orderId: number;
          carAmount: number;
          organizationPayment: number;
          engineerPayment: number;
          paid: boolean;
          workDate: Date;
        }>;
      }
    >();

    for (const session of carPayments) {
      const orgId = session.order?.organization?.id;
      if (!orgId) continue;

      const orgName = session.order?.organization?.name || 'Неизвестная организация';

      if (!orgMap.has(orgId)) {
        orgMap.set(orgId, {
          organizationId: orgId,
          organizationName: orgName,
          totalCarAmount: 0,
          paidCarAmount: 0,
        totalRevenue: 0,
        engineerCost: 0,
          completedOrders: 0,
          paidOrders: 0,
          orderIds: new Set(),
        sessions: [],
        });
      }

      const orgData = orgMap.get(orgId);
      const carAmount = Number(session.carUsageAmount) || 0;
    const organizationPayment = Number(session.organizationPayment) || 0;
    const engineerPayment = Number(session.calculatedAmount) || 0;
      orgData.totalCarAmount += carAmount;
    orgData.totalRevenue += organizationPayment;
    orgData.engineerCost += engineerPayment;

      // ВАЖНО: Оплата определяется по receivedFromOrganization
      if (session.order?.receivedFromOrganization === true) {
        orgData.paidCarAmount += carAmount;
      }

      // Подсчитываем уникальные заказы
      const orderId = session.orderId;
      if (!orgData.orderIds.has(orderId)) {
        orgData.orderIds.add(orderId);
        orgData.completedOrders += 1;
        if (session.order?.receivedFromOrganization === true) {
          orgData.paidOrders += 1;
        }
      }

      orgData.sessions.push({
        orderId,
        carAmount,
        organizationPayment,
        engineerPayment,
        paid: session.order?.receivedFromOrganization === true,
        workDate: session.workDate,
      });
    }

    // Преобразуем в массив и сортируем по сумме к оплате (от большей к меньшей)
    const organizations = Array.from(orgMap.values())
      .map(org => ({
        organizationId: org.organizationId,
        organizationName: org.organizationName,
        totalCarAmount: Number(org.totalCarAmount.toFixed(2)),
        paidCarAmount: Number(org.paidCarAmount.toFixed(2)),
        pendingCarAmount: Number((org.totalCarAmount - org.paidCarAmount).toFixed(2)),
        totalRevenue: Number(org.totalRevenue.toFixed(2)),
        engineerCost: Number(org.engineerCost.toFixed(2)),
        netIncome: Number((org.totalRevenue - org.engineerCost).toFixed(2)),
        completedOrders: org.completedOrders,
        paidOrders: org.paidOrders,
        pendingOrders: org.completedOrders - org.paidOrders,
        paymentStatus:
          org.totalCarAmount > 0
            ? Number(((org.paidCarAmount / org.totalCarAmount) * 100).toFixed(2))
            : 0,
        sessions: org.sessions,
      }))
      .sort((a, b) => b.pendingCarAmount - a.pendingCarAmount);

    // Подсчитываем общую статистику
    const totalCarAmount = organizations.reduce((sum, org) => sum + org.totalCarAmount, 0);
    const totalPaidAmount = organizations.reduce((sum, org) => sum + org.paidCarAmount, 0);
    const totalPendingAmount = organizations.reduce((sum, org) => sum + org.pendingCarAmount, 0);
    const totalRevenue = organizations.reduce((sum, org) => sum + org.totalRevenue, 0);
    const totalEngineerCost = organizations.reduce((sum, org) => sum + org.engineerCost, 0);

    return {
      year,
      month,
      monthName: new Date(year, month - 1, 1).toLocaleString('ru-RU', { month: 'long' }),
      organizations,
      summary: {
        totalOrganizations: organizations.length,
        totalCarAmount: Number(totalCarAmount.toFixed(2)),
        totalPaidAmount: Number(totalPaidAmount.toFixed(2)),
        totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalEngineerCost: Number(totalEngineerCost.toFixed(2)),
        netIncome: Number((totalRevenue - totalEngineerCost).toFixed(2)),
        organizationsWithPendingPayments: organizations.filter(org => org.pendingCarAmount > 0).length,
        organizationsFullyPaid: organizations.filter(org => org.pendingCarAmount === 0).length,
        averagePaymentStatus:
          organizations.length > 0
            ? Number(
                (
                  organizations.reduce((sum, org) => sum + org.paymentStatus, 0) / organizations.length
                ).toFixed(2)
              )
            : 0,
      },
    };
  }

  /**
   * Получить список инженеров с автомобильными расходами
   */
  async getEngineerCarPayments(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Получаем все рабочие сессии с автомобильными отчислениями
    const carPayments = await this.workSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.engineer', 'engineer')
      .leftJoinAndSelect('engineer.user', 'user')
      .leftJoinAndSelect('session.order', 'order')
      .where('session.workDate >= :startDate', { startDate })
      .andWhere('session.workDate < :endDate', { endDate })
      .andWhere('session.carUsageAmount > 0')
      .andWhere('session.status = :status', { status: 'completed' })
      .getMany();

    // Группируем по инженерам
    const engineerMap = new Map<
      number,
      {
        engineerId: number;
        engineerName: string;
        totalCarAmount: number;
        paidCarAmount: number;
        completedOrders: number;
        paidOrders: number;
        orderIds: Set<number>;
      }
    >();

    for (const session of carPayments) {
      const engineerId = session.engineerId;
      if (!engineerId) continue;

      const engineerName = session.engineer?.user
        ? `${session.engineer.user.firstName} ${session.engineer.user.lastName}`
        : 'Неизвестный инженер';

      if (!engineerMap.has(engineerId)) {
        engineerMap.set(engineerId, {
          engineerId,
          engineerName,
          totalCarAmount: 0,
          paidCarAmount: 0,
          completedOrders: 0,
          paidOrders: 0,
          orderIds: new Set(),
        });
      }

      const engineerData = engineerMap.get(engineerId);
      const carAmount = Number(session.carUsageAmount) || 0;
      engineerData.totalCarAmount += carAmount;

      // ВАЖНО: Оплата определяется по статусу заказа (paid_to_engineer)
      if (session.order?.status === 'paid_to_engineer') {
        engineerData.paidCarAmount += carAmount;
      }

      // Подсчитываем уникальные заказы
      const orderId = session.orderId;
      if (!engineerData.orderIds.has(orderId)) {
        engineerData.orderIds.add(orderId);
        engineerData.completedOrders += 1;
        if (session.order?.status === 'paid_to_engineer') {
          engineerData.paidOrders += 1;
        }
      }
    }

    // Получаем всех активных инженеров с fixedCarAmount
    const allEngineers = await this.engineerRepository.find({
      where: { isActive: true },
      relations: ['user'],
    });

    // Создаем карту fixedCarAmount для каждого инженера
    const fixedCarAmountMap = new Map<number, { name: string; amount: number }>();
    for (const eng of allEngineers) {
      if (eng.fixedCarAmount > 0) {
        const name = eng.user ? `${eng.user.firstName} ${eng.user.lastName}` : 'Неизвестный инженер';
        fixedCarAmountMap.set(eng.id, { name, amount: Number(eng.fixedCarAmount) });
      }
    }

    // Преобразуем в массив и сортируем по сумме (от большей к меньшей)
    const engineers = Array.from(engineerMap.values())
      .map(engineer => {
        const fixedCar = fixedCarAmountMap.get(engineer.engineerId);
        return {
          engineerId: engineer.engineerId,
          engineerName: engineer.engineerName,
          totalCarAmount: Number(engineer.totalCarAmount.toFixed(2)),
          paidCarAmount: Number(engineer.paidCarAmount.toFixed(2)),
          pendingCarAmount: Number((engineer.totalCarAmount - engineer.paidCarAmount).toFixed(2)),
          completedOrders: engineer.completedOrders,
          paidOrders: engineer.paidOrders,
          pendingOrders: engineer.completedOrders - engineer.paidOrders,
          paymentStatus:
            engineer.totalCarAmount > 0
              ? Number(((engineer.paidCarAmount / engineer.totalCarAmount) * 100).toFixed(2))
              : 0,
          fixedCarAmount: fixedCar?.amount || 0,
        };
      })
      .sort((a, b) => b.totalCarAmount - a.totalCarAmount);

    // Создаем список инженеров с только фиксированными платежами (у которых нет фактических расходов в этом месяце)
    const engineersWithOnlyFixedPayments = Array.from(fixedCarAmountMap.entries())
      .filter(([engineerId]) => !engineerMap.has(engineerId))
      .map(([engineerId, data]) => ({
        engineerId,
        engineerName: data.name,
        fixedCarAmount: data.amount,
      }))
      .sort((a, b) => b.fixedCarAmount - a.fixedCarAmount);

    // Подсчитываем общую статистику
    const totalCarAmount = engineers.reduce((sum, eng) => sum + eng.totalCarAmount, 0);
    const totalPaidAmount = engineers.reduce((sum, eng) => sum + eng.paidCarAmount, 0);
    const totalPendingAmount = engineers.reduce((sum, eng) => sum + eng.pendingCarAmount, 0);
    const totalFixedCarAmount = Array.from(fixedCarAmountMap.values()).reduce(
      (sum, data) => sum + data.amount,
      0,
    );

    return {
      year,
      month,
      monthName: new Date(year, month - 1, 1).toLocaleString('ru-RU', { month: 'long' }),
      engineers,
      engineersWithOnlyFixedPayments,
      summary: {
        totalEngineers: engineers.length,
        totalCarAmount: Number(totalCarAmount.toFixed(2)),
        totalPaidAmount: Number(totalPaidAmount.toFixed(2)),
        totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
        totalFixedCarAmount: Number(totalFixedCarAmount.toFixed(2)),
        engineersWithPendingPayments: engineers.filter(eng => eng.pendingCarAmount > 0).length,
        engineersFullyPaid: engineers.filter(eng => eng.pendingCarAmount === 0).length,
        averagePaymentStatus:
          engineers.length > 0
            ? Number(
                (engineers.reduce((sum, eng) => sum + eng.paymentStatus, 0) / engineers.length).toFixed(2)
              )
            : 0,
      },
    };
  }

  /**
   * Группировка автомобильных отчислений по организациям
   * ВАЖНО: Организации оплачивают расходы на авто отдельно
   */
  private groupCarPaymentsByOrganization(carPayments: WorkSession[]) {
    const orgMap = new Map<
      number,
      {
        organizationId: number;
        organizationName: string;
        totalCarAmount: number; // Сколько организация должна заплатить за расходы на авто
        paidCarAmount: number; // Сколько уже заплачено
        pendingCarAmount: number; // Сколько осталось заплатить
        completedOrders: number; // Количество заказов с расходами на авто
        paidOrders: number; // Количество оплаченных заказов
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
          pendingCarAmount: 0,
          completedOrders: 0,
          paidOrders: 0,
          sessions: [],
        });
      }

      const orgData = orgMap.get(orgId);
      const carAmount = Number(session.carUsageAmount) || 0;
      orgData.totalCarAmount += carAmount;
      
      // ВАЖНО: Оплата определяется по receivedFromOrganization (организация оплатила счет)
      if (session.order?.receivedFromOrganization === true) {
        orgData.paidCarAmount += carAmount;
      }
      
      // Подсчитываем уникальные заказы
      const orderId = session.orderId;
      if (!orgData.sessions.some(s => s.orderId === orderId)) {
        orgData.completedOrders += 1;
        if (session.order?.receivedFromOrganization === true) {
          orgData.paidOrders += 1;
        }
      }
      
      orgData.sessions.push(session);
    }

    return Array.from(orgMap.values()).map(org => ({
      organizationId: org.organizationId,
      organizationName: org.organizationName,
      totalCarAmount: Number(org.totalCarAmount.toFixed(2)),
      paidCarAmount: Number(org.paidCarAmount.toFixed(2)),
      pendingCarAmount: Number((org.totalCarAmount - org.paidCarAmount).toFixed(2)),
      completedOrders: org.completedOrders,
      paidOrders: org.paidOrders,
      pendingOrders: org.completedOrders - org.paidOrders,
      paymentStatus: org.totalCarAmount > 0 ? Number(((org.paidCarAmount / org.totalCarAmount) * 100).toFixed(2)) : 0,
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
      const carAmount = Number(session.carUsageAmount) || 0;
      engineerData.totalCarAmount += carAmount;
      // Оплата определяется по статусу заказа
      if (session.order?.status === 'paid_to_engineer') {
        engineerData.paidCarAmount += carAmount;
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
