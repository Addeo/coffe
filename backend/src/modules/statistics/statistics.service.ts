import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { Engineer } from '../../entities/engineer.entity';
import {
  MonthlyStatisticsDto,
  AgentEarningsData,
  OrganizationEarningsData,
  OvertimeStatisticsData,
} from '@dtos/reports.dto';

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
    private engineerRepository: Repository<Engineer>
  ) {}


  async getUserEarningsStatistics(
    userId: number,
    months: number = 12
  ): Promise<Array<{
    userId: number;
    month: number;
    year: number;
    totalEarnings: number;
    completedOrders: number;
    totalHours: number;
  }>> {
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

    // Рассчитываем статистику для каждого месяца из Order
    for (let i = 0; i < months; i++) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const targetMonth = targetDate.getMonth() + 1;
      const targetYear = targetDate.getFullYear();

      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 1);

      const orders = await this.orderRepository
        .createQueryBuilder('order')
        .where('order.assignedEngineerId = :engineerId', { engineerId: engineer.id })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.completionDate >= :startDate', { startDate })
        .andWhere('order.completionDate < :endDate', { endDate })
        .getMany();

      let totalEarnings = 0;
      let totalHours = 0;

      for (const order of orders) {
        totalEarnings +=
          (Number(order.calculatedAmount) || 0) + (Number(order.carUsageAmount) || 0);
        totalHours += (Number(order.regularHours) || 0) + (Number(order.overtimeHours) || 0);
      }

      statistics.push({
        userId,
        month: targetMonth,
        year: targetYear,
        totalEarnings,
        completedOrders: orders.length,
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
      previousMonth: prevOrders.length > 0 ? {
        totalEarnings: prevTotalEarnings,
        completedOrders: prevOrders.length,
        totalHours: prevTotalHours,
        month: previousMonth,
        year: previousYear,
      } : null,
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
      };
    }

    const engineerId = engineer.id;

    // Получаем orders за текущий месяц
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.assignedEngineerId = :engineerId', { engineerId })
      .andWhere('order.status = :status', { status: 'completed' })
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
      .andWhere('order.status = :status', { status: 'completed' })
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
        baseEarnings += (orderEarnings * orderRegularHours) / (orderRegularHours + orderOvertimeHours || 1);
        overtimeEarnings += (orderEarnings * orderOvertimeHours) / (orderRegularHours + orderOvertimeHours || 1);
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
        engineerEarnings: totalEngineerPayment, // Включаем доплату за машину
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
        organizationPayments: acc.organizationPayments + stat.organizationPayments,
        profit: acc.profit + stat.profit,
      }),
      {
        completedOrders: 0,
        totalHours: 0,
        engineerEarnings: 0,
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
      .leftJoin('order.assignedEngineer', 'engineer')
      .leftJoin('engineer.user', 'user')
      .where('order.completionDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('order.status = :status', { status: 'completed' })
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
      .andWhere('order.status = :status', { status: 'completed' })
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
      .select('order.assignedEngineerId', 'engineerId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('SUM(order.overtimeHours)', 'overtimeHours')
      .addSelect('SUM(order.regularHours)', 'regularHours')
      .addSelect('SUM(order.regularHours + order.overtimeHours)', 'totalHours')
      .leftJoin('order.assignedEngineer', 'engineer')
      .leftJoin('engineer.user', 'user')
      .where('order.completionDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('order.status = :status', { status: 'completed' })
      .andWhere('order.assignedEngineerId IS NOT NULL')
      .groupBy('order.assignedEngineerId')
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
}
