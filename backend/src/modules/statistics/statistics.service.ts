import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EarningsStatistic } from '../../entities/earnings-statistic.entity';
import { Order } from '../../entities/order.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { Engineer } from '../../entities/engineer.entity';
import {
  MonthlyStatisticsDto,
  AgentEarningsData,
  OrganizationEarningsData,
  OvertimeStatisticsData
} from '@dtos/reports.dto';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(EarningsStatistic)
    private earningsStatisticRepository: Repository<EarningsStatistic>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(WorkReport)
    private workReportRepository: Repository<WorkReport>,
    @InjectRepository(Engineer)
    private engineerRepository: Repository<Engineer>
  ) {}

  async calculateMonthlyEarnings(userId: number, month: number, year: number): Promise<void> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Получаем инженера по userId
    const engineer = await this.engineerRepository.findOne({
      where: { userId }
    });

    if (!engineer) {
      console.warn(`No engineer profile found for userId ${userId}`);
      return;
    }

    // Получаем все work reports инженера за месяц (вместо завершенных заказов)
    const workReports = await this.workReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.order', 'order')
      .where('report.engineerId = :engineerId', { engineerId: engineer.id })
      .andWhere('report.submittedAt >= :startDate', { startDate })
      .andWhere('report.submittedAt < :endDate', { endDate })
      .getMany();

    if (workReports.length === 0) {
      return;
    }

    // Рассчитываем статистику на основе реальных work reports
    let totalEarnings = 0;
    let totalHours = 0;
    const uniqueOrders = new Set<number>();

    for (const report of workReports) {
      totalEarnings += Number(report.calculatedAmount) || 0;
      totalHours += Number(report.totalHours) || 0;
      if (report.order?.id) {
        uniqueOrders.add(report.order.id);
      }
    }

    const completedOrders = uniqueOrders.size;
    const averageOrderValue = completedOrders > 0 ? totalEarnings / completedOrders : 0;

    // Обновляем или создаем запись статистики
    let statistic = await this.earningsStatisticRepository.findOne({
      where: { userId, month, year },
    });

    if (statistic) {
      statistic.totalEarnings = totalEarnings;
      statistic.completedOrders = completedOrders;
      statistic.averageOrderValue = averageOrderValue;
      statistic.totalHours = totalHours;
    } else {
      statistic = this.earningsStatisticRepository.create({
        userId,
        month,
        year,
        totalEarnings,
        completedOrders,
        averageOrderValue,
        totalHours,
      });
    }

    await this.earningsStatisticRepository.save(statistic);
  }

  async getUserEarningsStatistics(
    userId: number,
    months: number = 12
  ): Promise<EarningsStatistic[]> {
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - months + 1, 1);

    return this.earningsStatisticRepository
      .createQueryBuilder('statistic')
      .where('statistic.userId = :userId', { userId })
      .andWhere('statistic.createdAt >= :startDate', { startDate })
      .orderBy('statistic.year', 'DESC')
      .addOrderBy('statistic.month', 'DESC')
      .getMany();
  }

  async getTopEarnersByMonth(
    year: number,
    month: number,
    limit: number = 10
  ): Promise<EarningsStatistic[]> {
    return this.earningsStatisticRepository
      .createQueryBuilder('statistic')
      .leftJoinAndSelect('statistic.user', 'user')
      .where('statistic.year = :year', { year })
      .andWhere('statistic.month = :month', { month })
      .andWhere('user.role = :role', { role: UserRole.USER })
      .orderBy('statistic.totalEarnings', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getTotalEarningsByPeriod(
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<{ totalEarnings: number; totalOrders: number; averageOrderValue: number }> {
    const queryBuilder = this.earningsStatisticRepository
      .createQueryBuilder('statistic')
      .select('SUM(statistic.totalEarnings)', 'totalEarnings')
      .addSelect('SUM(statistic.completedOrders)', 'totalOrders')
      .addSelect('AVG(statistic.averageOrderValue)', 'averageOrderValue')
      .where('statistic.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (userId) {
      queryBuilder.andWhere('statistic.userId = :userId', { userId });
    }

    const result = await queryBuilder.getRawOne();

    return {
      totalEarnings: parseFloat(result.totalEarnings) || 0,
      totalOrders: parseInt(result.totalOrders) || 0,
      averageOrderValue: parseFloat(result.averageOrderValue) || 0,
    };
  }

  async getUserRankByEarnings(userId: number, year: number, month: number): Promise<number> {
    const userStatistic = await this.earningsStatisticRepository.findOne({
      where: { userId, year, month },
    });

    if (!userStatistic) {
      return -1; // Пользователь не имеет статистики за этот период
    }

    const rank = await this.earningsStatisticRepository
      .createQueryBuilder('statistic')
      .where('statistic.year = :year', { year })
      .andWhere('statistic.month = :month', { month })
      .andWhere('statistic.totalEarnings > :userEarnings', {
        userEarnings: userStatistic.totalEarnings,
      })
      .getCount();

    return rank + 1; // +1 потому что ранк начинается с 1
  }

  async getEarningsComparison(userId: number): Promise<{
    currentMonth: EarningsStatistic | null;
    previousMonth: EarningsStatistic | null;
    growth: number;
  }> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const [currentMonthStat, previousMonthStat] = await Promise.all([
      this.earningsStatisticRepository.findOne({
        where: { userId, month: currentMonth, year: currentYear },
      }),
      this.earningsStatisticRepository.findOne({
        where: { userId, month: previousMonth, year: previousYear },
      }),
    ]);

    let growth = 0;
    if (currentMonthStat && previousMonthStat && previousMonthStat.totalEarnings > 0) {
      growth =
        ((currentMonthStat.totalEarnings - previousMonthStat.totalEarnings) /
          previousMonthStat.totalEarnings) *
        100;
    }

    return {
      currentMonth: currentMonthStat,
      previousMonth: previousMonthStat,
      growth,
    };
  }

  async calculateAllUsersMonthlyEarnings(month: number, year: number): Promise<void> {
    const users = await this.userRepository.find({
      where: { role: UserRole.USER, isActive: true },
    });

    await Promise.all(users.map(user => this.calculateMonthlyEarnings(user.id, month, year)));
  }

  async getEngineerDetailedStats(userId: number, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Получаем инженера по userId
    const engineer = await this.engineerRepository.findOne({
      where: { userId }
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

    // Получаем work reports за текущий месяц
    const workReports = await this.workReportRepository
      .createQueryBuilder('report')
      .where('report.engineerId = :engineerId', { engineerId })
      .andWhere('report.submittedAt >= :startDate', { startDate })
      .andWhere('report.submittedAt < :endDate', { endDate })
      .getMany();

    // Получаем work reports за предыдущий месяц для сравнения
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 1);

    const prevWorkReports = await this.workReportRepository
      .createQueryBuilder('report')
      .where('report.engineerId = :engineerId', { engineerId })
      .andWhere('report.submittedAt >= :startDate', { startDate: prevStartDate })
      .andWhere('report.submittedAt < :endDate', { endDate: prevEndDate })
      .getMany();

    // Рассчитываем текущую статистику
    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let totalEarnings = 0;
    let baseEarnings = 0;
    let overtimeEarnings = 0;
    const uniqueOrders = new Set<number>();

    for (const report of workReports) {
      totalHours += Number(report.totalHours) || 0;
      totalEarnings += Number(report.calculatedAmount) || 0;

      if (report.isOvertime) {
        overtimeHours += Number(report.totalHours) || 0;
        overtimeEarnings += Number(report.calculatedAmount) || 0;
      } else {
        regularHours += Number(report.totalHours) || 0;
        baseEarnings += Number(report.calculatedAmount) || 0;
      }

      if (report.orderId) {
        uniqueOrders.add(report.orderId);
      }
    }

    // Рассчитываем статистику за предыдущий месяц
    let prevTotalHours = 0;
    let prevTotalEarnings = 0;

    for (const report of prevWorkReports) {
      prevTotalHours += Number(report.totalHours) || 0;
      prevTotalEarnings += Number(report.calculatedAmount) || 0;
    }

    const completedOrders = uniqueOrders.size;
    const averageHoursPerOrder = completedOrders > 0 ? totalHours / completedOrders : 0;
    const earningsGrowth = prevTotalEarnings > 0 
      ? ((totalEarnings - prevTotalEarnings) / prevTotalEarnings) * 100 
      : 0;
    const hoursGrowth = prevTotalHours > 0 
      ? ((totalHours - prevTotalHours) / prevTotalHours) * 100 
      : 0;

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
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
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
      const totalOvertimeHours = overtimeStatistics.reduce((sum, stat) => sum + stat.overtimeHours, 0);

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

  private async getAgentEarningsData(year: number, month: number): Promise<AgentEarningsData[]> {
    // First try to get data from earnings_statistics table
    const earningsStats = await this.earningsStatisticRepository
      .createQueryBuilder('stat')
      .leftJoinAndSelect('stat.user', 'user')
      .where('stat.year = :year', { year })
      .andWhere('stat.month = :month', { month })
      .andWhere('user.role = :role', { role: UserRole.USER })
      .orderBy('stat.totalEarnings', 'DESC')
      .getMany();

    if (earningsStats.length > 0) {
      return earningsStats.map(stat => ({
        agentId: stat.userId,
        agentName: stat.user ? `${stat.user.firstName} ${stat.user.lastName}` : 'Unknown',
        totalEarnings: Number(stat.totalEarnings),
        completedOrders: stat.completedOrders,
        averageOrderValue: Number(stat.averageOrderValue),
      }));
    }

    // If no data in earnings_statistics, calculate from work reports directly
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const agentData = await this.workReportRepository
      .createQueryBuilder('report')
      .select('engineer.userId', 'userId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('SUM(report.calculatedAmount)', 'totalEarnings')
      .addSelect('COUNT(DISTINCT report.orderId)', 'completedOrders')
      .addSelect('AVG(report.calculatedAmount)', 'averageOrderValue')
      .leftJoin('report.engineer', 'engineer')
      .leftJoin('engineer.user', 'user')
      .where('report.submittedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
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

  private async getOrganizationEarningsData(startDate: Date, endDate: Date): Promise<OrganizationEarningsData[]> {
    // Calculate full financial picture for each organization:
    // 1. Revenue: hours × organization.baseRate (what organizations pay us)
    // 2. Costs: report.calculatedAmount (what we pay engineers)
    // 3. Profit: Revenue - Costs
    const organizationStats = await this.workReportRepository
      .createQueryBuilder('report')
      .select('order.organizationId', 'organizationId')
      .addSelect('organization.name', 'organizationName')
      .addSelect('COUNT(DISTINCT order.id)', 'totalOrders')
      .addSelect('SUM(report.totalHours)', 'totalHours')
      .addSelect('SUM(report.totalHours * organization.baseRate)', 'totalRevenue')
      .addSelect('SUM(report.calculatedAmount)', 'totalCosts')
      .addSelect('AVG(report.totalHours * organization.baseRate)', 'averageOrderValue')
      .leftJoin('report.order', 'order')
      .leftJoin('order.organization', 'organization')
      .where('report.submittedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
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

  private async getOvertimeStatisticsData(startDate: Date, endDate: Date): Promise<OvertimeStatisticsData[]> {
    const engineerStats = await this.workReportRepository
      .createQueryBuilder('report')
      .select('report.engineerId', 'engineerId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('SUM(CASE WHEN report.isOvertime = true THEN report.totalHours ELSE 0 END)', 'overtimeHours')
      .addSelect('SUM(CASE WHEN report.isOvertime = false THEN report.totalHours ELSE 0 END)', 'regularHours')
      .addSelect('SUM(report.totalHours)', 'totalHours')
      .leftJoin('report.engineer', 'engineer')
      .leftJoin('engineer.user', 'user')
      .where('report.submittedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('report.engineerId')
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
