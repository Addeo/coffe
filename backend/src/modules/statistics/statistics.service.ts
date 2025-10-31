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
        totalHours += (Number(session.regularHours) || 0) + (Number(session.overtimeHours) || 0);
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

    // Рассчитываем заработок текущего пользователя из orders
    const userOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.assignedEngineerId = :engineerId', { engineerId: engineer.id })
      .andWhere('order.status = :status', { status: 'completed' })
      .andWhere('order.completionDate >= :startDate', { startDate })
      .andWhere('order.completionDate < :endDate', { endDate })
      .getMany();

    let userTotalEarnings = 0;
    for (const order of userOrders) {
      userTotalEarnings +=
        (Number(order.calculatedAmount) || 0) + (Number(order.carUsageAmount) || 0);
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

      const otherOrders = await this.orderRepository
        .createQueryBuilder('order')
        .where('order.assignedEngineerId = :engineerId', { engineerId: otherEngineer.id })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.completionDate >= :startDate', { startDate })
        .andWhere('order.completionDate < :endDate', { endDate })
        .getMany();

      let otherTotalEarnings = 0;
      for (const order of otherOrders) {
        otherTotalEarnings +=
          (Number(order.calculatedAmount) || 0) + (Number(order.carUsageAmount) || 0);
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

    // Рассчитываем статистику за текущий месяц из orders
    const currentStartDate = new Date(currentYear, currentMonth - 1, 1);
    const currentEndDate = new Date(currentYear, currentMonth, 1);

    const currentOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.assignedEngineerId = :engineerId', { engineerId: engineer.id })
      .andWhere('order.status = :status', { status: 'completed' })
      .andWhere('order.completionDate >= :startDate', { startDate: currentStartDate })
      .andWhere('order.completionDate < :endDate', { endDate: currentEndDate })
      .getMany();

    let currentTotalEarnings = 0;
    let currentTotalHours = 0;

    for (const order of currentOrders) {
      currentTotalEarnings +=
        (Number(order.calculatedAmount) || 0) + (Number(order.carUsageAmount) || 0);
      currentTotalHours += (Number(order.regularHours) || 0) + (Number(order.overtimeHours) || 0);
    }

    // Рассчитываем статистику за предыдущий месяц из orders
    const prevStartDate = new Date(previousYear, previousMonth - 1, 1);
    const prevEndDate = new Date(previousYear, previousMonth, 1);

    const prevOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.assignedEngineerId = :engineerId', { engineerId: engineer.id })
      .andWhere('order.status = :status', { status: 'completed' })
      .andWhere('order.completionDate >= :startDate', { startDate: prevStartDate })
      .andWhere('order.completionDate < :endDate', { endDate: prevEndDate })
      .getMany();

    let prevTotalEarnings = 0;
    let prevTotalHours = 0;

    for (const order of prevOrders) {
      prevTotalEarnings +=
        (Number(order.calculatedAmount) || 0) + (Number(order.carUsageAmount) || 0);
      prevTotalHours += (Number(order.regularHours) || 0) + (Number(order.overtimeHours) || 0);
    }

    let growth = 0;
    if (prevTotalEarnings > 0) {
      growth = ((currentTotalEarnings - prevTotalEarnings) / prevTotalEarnings) * 100;
    }

    return {
      currentMonth: {
        totalEarnings: currentTotalEarnings,
        completedOrders: currentOrders.length,
        totalHours: currentTotalHours,
        month: currentMonth,
        year: currentYear,
      },
      previousMonth:
        prevOrders.length > 0
          ? {
              totalEarnings: prevTotalEarnings,
              completedOrders: prevOrders.length,
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

    // Получаем orders за текущий месяц (включая новый статус)
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.assignedEngineerId = :engineerId', { engineerId })
      .andWhere('order.status IN (:...statuses)', { statuses: ['completed', 'paid_to_engineer'] })
      .andWhere('order.completionDate >= :startDate', { startDate })
      .andWhere('order.completionDate < :endDate', { endDate })
      .getMany();

    // Получаем orders за предыдущий месяц для сравнения
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 1);

    const prevOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.assignedEngineerId = :engineerId', { engineerId })
      .andWhere('order.status IN (:...statuses)', { statuses: ['completed', 'paid_to_engineer'] })
      .andWhere('order.completionDate >= :startDate', { startDate: prevStartDate })
      .andWhere('order.completionDate < :endDate', { endDate: prevEndDate })
      .getMany();

    // Рассчитываем текущую статистику из Order fields
    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let totalEarnings = 0;
    let baseEarnings = 0;
    let overtimeEarnings = 0;

    for (const order of orders) {
      const orderRegularHours = Number(order.regularHours) || 0;
      const orderOvertimeHours = Number(order.overtimeHours) || 0;
      regularHours += orderRegularHours;
      overtimeHours += orderOvertimeHours;
      totalHours += orderRegularHours + orderOvertimeHours;

      const orderEarnings =
        (Number(order.calculatedAmount) || 0) + (Number(order.carUsageAmount) || 0);
      totalEarnings += orderEarnings;

      // Примерное разделение на base/overtime (пропорционально часам)
      if (totalHours > 0) {
        baseEarnings +=
          (orderEarnings * orderRegularHours) / (orderRegularHours + orderOvertimeHours || 1);
        overtimeEarnings +=
          (orderEarnings * orderOvertimeHours) / (orderRegularHours + orderOvertimeHours || 1);
      }
    }

    // Рассчитываем статистику за предыдущий месяц
    let prevTotalHours = 0;
    let prevTotalEarnings = 0;

    for (const order of prevOrders) {
      prevTotalHours += (Number(order.regularHours) || 0) + (Number(order.overtimeHours) || 0);
      prevTotalEarnings +=
        (Number(order.calculatedAmount) || 0) + (Number(order.carUsageAmount) || 0);
    }

    const completedOrders = orders.length;
    const averageHoursPerOrder = completedOrders > 0 ? totalHours / completedOrders : 0;
    const earningsGrowth =
      prevTotalEarnings > 0 ? ((totalEarnings - prevTotalEarnings) / prevTotalEarnings) * 100 : 0;
    const hoursGrowth =
      prevTotalHours > 0 ? ((totalHours - prevTotalHours) / prevTotalHours) * 100 : 0;

    // Статистика по платежам
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

    // Get all orders for the period with engineer data (from aggregated Order fields)
    const engineerStats = await this.orderRepository
      .createQueryBuilder('order')
      .select('engineer.userId', 'engineerId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('user.email', 'email')
      .addSelect('COUNT(order.id)', 'completedOrders')
      .addSelect('SUM(order.regularHours + order.overtimeHours)', 'totalHours')
      .addSelect('SUM(order.calculatedAmount)', 'engineerEarnings')
      .addSelect('SUM(order.organizationPayment)', 'organizationPayments')
      .addSelect('SUM(order.carUsageAmount)', 'carUsageAmount')
      .leftJoin('order.assignedEngineer', 'engineer')
      .leftJoin('engineer.user', 'user')
      .where('order.completionDate >= :startDate', { startDate })
      .andWhere('order.completionDate < :endDate', { endDate })
      .andWhere('order.status = :status', { status: 'completed' })
      .andWhere('user.role = :role', { role: UserRole.USER })
      .groupBy('engineer.userId')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .addGroupBy('user.email')
      .orderBy('engineerEarnings', 'DESC')
      .getRawMany();

    const engineerStatsWithProfit = engineerStats.map(stat => {
      const engineerEarnings = Number(stat.engineerEarnings) || 0;
      const organizationPayments = Number(stat.organizationPayments) || 0;
      const carUsageAmount = Number(stat.carUsageAmount) || 0;

      // Прибыль = (оплата от организации) - (оплата инженеру)
      // Доплата за машину не учитывается в прибыли, так как она идёт напрямую инженеру
      const profit = organizationPayments - engineerEarnings;

      // Общая сумма от организации включает доплату за машину
      const totalOrganizationPayment = organizationPayments + carUsageAmount;
      const totalEngineerPayment = engineerEarnings + carUsageAmount;

      const profitMargin =
        totalOrganizationPayment > 0 ? (profit / totalOrganizationPayment) * 100 : 0;

      return {
        engineerId: stat.engineerId,
        engineerName: `${stat.firstName || ''} ${stat.lastName || ''}`.trim() || 'Unknown',
        email: stat.email,
        completedOrders: Number(stat.completedOrders) || 0,
        totalHours: Number(stat.totalHours) || 0,
        engineerEarnings: engineerEarnings, // Оплата за работу (без машины)
        carUsageAmount: carUsageAmount, // Доплата за машину отдельно
        totalEarnings: totalEngineerPayment, // Общая сумма (работа + машина)
        organizationPayments: totalOrganizationPayment, // Включаем доплату за машину
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
        totalEarnings: acc.totalEarnings + stat.totalEarnings,
        organizationPayments: acc.organizationPayments + stat.organizationPayments,
        profit: acc.profit + stat.profit,
      }),
      {
        completedOrders: 0,
        totalHours: 0,
        engineerEarnings: 0,
        carUsageAmount: 0,
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
    // Calculate directly from Order fields (aggregated data from work_reports)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const agentData = await this.orderRepository
      .createQueryBuilder('order')
      .select('engineer.userId', 'userId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('SUM(order.calculatedAmount + order.carUsageAmount)', 'totalEarnings')
      .addSelect('COUNT(order.id)', 'completedOrders')
      .addSelect('AVG(order.calculatedAmount + order.carUsageAmount)', 'averageOrderValue')
      .innerJoin('order.assignedEngineer', 'engineer')
      .innerJoin('engineer.user', 'user')
      .where('order.completionDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('order.status IN (:...statuses)', { statuses: ['completed', 'paid_to_engineer'] })
      .andWhere('order.assignedEngineerId IS NOT NULL')
      .andWhere('user.role = :role', { role: UserRole.USER })
      .groupBy('engineer.userId')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .orderBy('totalEarnings', 'DESC')
      .getRawMany();

    return agentData.map(data => ({
      agentId: data.userId,
      agentName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown',
      totalEarnings: Number(data.totalEarnings) || 0,
      completedOrders: Number(data.completedOrders) || 0,
      averageOrderValue: Number(data.averageOrderValue) || 0,
    }));
  }

  private async getOrganizationEarningsData(
    startDate: Date,
    endDate: Date
  ): Promise<OrganizationEarningsData[]> {
    // Calculate from Order aggregated fields:
    // 1. Revenue: organizationPayment (what organizations pay us)
    // 2. Costs: calculatedAmount + carUsageAmount (what we pay engineers)
    // 3. Profit: Revenue - Costs
    const organizationStats = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.organizationId', 'organizationId')
      .addSelect('organization.name', 'organizationName')
      .addSelect('COUNT(order.id)', 'totalOrders')
      .addSelect('SUM(order.regularHours + order.overtimeHours)', 'totalHours')
      .addSelect('SUM(order.organizationPayment)', 'totalRevenue')
      .addSelect('SUM(order.calculatedAmount)', 'totalCosts')
      .addSelect('AVG(order.organizationPayment)', 'averageOrderValue')
      .leftJoin('order.organization', 'organization')
      .where('order.completionDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('order.status IN (:...statuses)', { statuses: ['completed', 'paid_to_engineer'] })
      .andWhere('order.organizationId IS NOT NULL')
      .groupBy('order.organizationId')
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
    // Calculate from Order aggregated fields
    const engineerStats = await this.orderRepository
      .createQueryBuilder('order')
      .select('engineer.userId', 'engineerId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('SUM(order.overtimeHours)', 'overtimeHours')
      .addSelect('SUM(order.regularHours)', 'regularHours')
      .addSelect('SUM(order.regularHours + order.overtimeHours)', 'totalHours')
      .innerJoin('order.assignedEngineer', 'engineer')
      .innerJoin('engineer.user', 'user')
      .where('order.completionDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('order.status IN (:...statuses)', { statuses: ['completed', 'paid_to_engineer'] })
      .andWhere('order.assignedEngineerId IS NOT NULL')
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
   */
  private async getTotalAgentPayments(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.regularPayment + order.overtimePayment)', 'totalPayments')
        .where('order.completionDate >= :startDate', { startDate })
        .andWhere('order.completionDate < :endDate', { endDate })
        .andWhere('order.status = :status', { status: 'completed' })
        .getRawOne();

      return Number(result?.totalPayments) || 0;
    } catch (error) {
      console.error('Error getting total agent payments:', error);
      return 0;
    }
  }

  /**
   * Получает общую сумму платежей от организаций за период
   */
  private async getTotalOrganizationPayments(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await this.orderRepository
        .createQueryBuilder('order')
        .select(
          'SUM(order.organizationRegularPayment + order.organizationOvertimePayment)',
          'totalPayments'
        )
        .where('order.completionDate >= :startDate', { startDate })
        .andWhere('order.completionDate < :endDate', { endDate })
        .andWhere('order.status = :status', { status: 'completed' })
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
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Статистика по долгам инженерам
    const engineerDebts = await this.orderRepository
      .createQueryBuilder('order')
      .select('engineer.userId', 'engineerId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect(
        'SUM(CASE WHEN order.status = "completed" THEN order.calculatedAmount + order.carUsageAmount ELSE 0 END)',
        'totalDebt'
      )
      .addSelect(
        'COUNT(CASE WHEN order.status IN ("completed", "paid_to_engineer") THEN 1 END)',
        'completedOrders'
      )
      .addSelect('COUNT(CASE WHEN order.status = "paid_to_engineer" THEN 1 END)', 'paidOrders')
      .addSelect('COUNT(CASE WHEN order.status = "completed" THEN 1 END)', 'pendingOrders')
      .innerJoin('order.assignedEngineer', 'engineer')
      .innerJoin('engineer.user', 'user')
      .where('order.completionDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('order.status IN (:...statuses)', { statuses: ['completed', 'paid_to_engineer'] })
      .andWhere('order.assignedEngineerId IS NOT NULL')
      .groupBy('engineer.userId')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .getRawMany();

    // Статистика по долгам организаций
    const organizationDebts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.organizationId', 'organizationId')
      .addSelect('organization.name', 'organizationName')
      .addSelect(
        'SUM(CASE WHEN order.status IN ("completed", "paid_to_engineer") AND NOT order.receivedFromOrganization THEN order.organizationPayment ELSE 0 END)',
        'totalDebt'
      )
      .addSelect(
        'COUNT(CASE WHEN order.status IN ("completed", "paid_to_engineer") THEN 1 END)',
        'completedOrders'
      )
      .addSelect('COUNT(CASE WHEN order.receivedFromOrganization THEN 1 END)', 'receivedOrders')
      .addSelect(
        'COUNT(CASE WHEN order.status IN ("completed", "paid_to_engineer") AND NOT order.receivedFromOrganization THEN 1 END)',
        'pendingOrders'
      )
      .leftJoin('order.organization', 'organization')
      .where('order.completionDate BETWEEN :startDate AND :endDate', { startDate, endDate })
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
        engineerId: debt.engineerId,
        engineerName: `${debt.firstName || ''} ${debt.lastName || ''}`.trim() || 'Unknown',
        totalDebt: Number(debt.totalDebt) || 0,
        completedOrders: Number(debt.completedOrders) || 0,
        paidOrders: Number(debt.paidOrders) || 0,
        pendingOrders: Number(debt.pendingOrders) || 0,
      })),
      organizationDebts: organizationDebts.map(debt => ({
        organizationId: debt.organizationId,
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

    console.log('🚗 Backend - Поиск автомобильных отчислений:', {
      year,
      month,
      startDate,
      endDate,
    });

    // Сначала проверим все рабочие сессии за период
    const allSessions = await this.workSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.order', 'order')
      .leftJoinAndSelect('order.organization', 'organization')
      .leftJoinAndSelect('session.engineer', 'engineer')
      .leftJoinAndSelect('engineer.user', 'user')
      .where('session.workDate >= :startDate', { startDate })
      .andWhere('session.workDate < :endDate', { endDate })
      .getMany();

    console.log('🚗 Backend - Все рабочие сессии за период:', allSessions.length);
    console.log(
      '🚗 Backend - Детали всех сессий:',
      allSessions.map(s => ({
        id: s.id,
        carUsageAmount: s.carUsageAmount,
        workDate: s.workDate,
        status: s.status,
        orderId: s.order?.id,
        organizationName: s.order?.organization?.name,
      }))
    );

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

    console.log(
      '🚗 Backend - Найдено рабочих сессий с автомобильными отчислениями:',
      carPayments.length
    );
    console.log(
      '🚗 Backend - Данные сессий:',
      carPayments.map(s => ({
        id: s.id,
        carUsageAmount: s.carUsageAmount,
        workDate: s.workDate,
        status: s.status,
        orderId: s.order?.id,
        organizationName: s.order?.organization?.name,
      }))
    );

    // Общая сумма к доплате за автомобили
    const totalCarAmount = carPayments.reduce((sum, session) => sum + session.carUsageAmount, 0);

    // Уже заплачено за автомобили (пока используем все как неоплаченные)
    const paidCarAmount = carPayments
      .filter(session => session.status === 'completed') // Временно используем статус
      .reduce((sum, session) => sum + session.carUsageAmount, 0);

    // Группировка по организациям
    const organizationBreakdown = this.groupCarPaymentsByOrganization(carPayments);

    // Группировка по инженерам
    const engineerBreakdown = this.groupCarPaymentsByEngineer(carPayments);

    const result = {
      totalCarAmount,
      paidCarAmount,
      pendingCarAmount: totalCarAmount - paidCarAmount,
      organizationBreakdown,
      engineerBreakdown,
      paymentStatus: totalCarAmount > 0 ? (paidCarAmount / totalCarAmount) * 100 : 0,
    };

    console.log('🚗 Backend - Результат автомобильных отчислений:', result);
    return result;
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
      if (session.status === 'completed') {
        // Временно используем статус
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
      if (session.status === 'completed') {
        // Временно используем статус
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
