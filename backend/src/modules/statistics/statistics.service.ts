import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { EarningsStatistic } from '../../entities/earnings-statistic.entity';
import { Order } from '../../entities/order.entity';
import { User, UserRole } from '../../entities/user.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { Organization } from '../../entities/organization.entity';
import { OrderStatus } from '../../../shared/interfaces/order.interface';
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
    @InjectRepository(WorkReport)
    private workReportRepository: Repository<WorkReport>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>
  ) {}

  async calculateMonthlyEarnings(userId: number, month: number, year: number): Promise<void> {
    // Получаем все завершенные заказы пользователя за месяц
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const completedOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.assignedEngineerId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('order.completionDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    if (completedOrders.length === 0) {
      return;
    }

    // Рассчитываем статистику
    const totalEarnings = completedOrders.reduce((sum, order) => {
      // Здесь должна быть логика расчета стоимости заказа
      // Пока используем заглушку - можно будет доработать
      return sum + 100; // Примерная стоимость заказа
    }, 0);

    const averageOrderValue = totalEarnings / completedOrders.length;

    // Обновляем или создаем запись статистики
    let statistic = await this.earningsStatisticRepository.findOne({
      where: { userId, month, year },
    });

    if (statistic) {
      statistic.totalEarnings = totalEarnings;
      statistic.completedOrders = completedOrders.length;
      statistic.averageOrderValue = averageOrderValue;
    } else {
      statistic = this.earningsStatisticRepository.create({
        userId,
        month,
        year,
        totalEarnings,
        completedOrders: completedOrders.length,
        averageOrderValue,
        totalHours: 0, // Можно рассчитать на основе времени выполнения заказов
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

  async getMonthlyStatistics(year: number, month: number): Promise<MonthlyStatisticsDto> {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Get agent earnings data
    const agentEarnings = await this.getAgentEarningsData(year, month);

    // Get organization earnings data
    const organizationEarnings = await this.getOrganizationEarningsData(startDate, endDate);

    // Get overtime statistics
    const overtimeStatistics = await this.getOvertimeStatisticsData(startDate, endDate);

    // Calculate totals
    const totalEarnings = agentEarnings.reduce((sum, agent) => sum + agent.totalEarnings, 0);
    const totalOrders = agentEarnings.reduce((sum, agent) => sum + agent.completedOrders, 0);
    const totalOvertimeHours = overtimeStatistics.reduce((sum, stat) => sum + stat.overtimeHours, 0);

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
  }

  private async getAgentEarningsData(year: number, month: number): Promise<AgentEarningsData[]> {
    const earningsStats = await this.earningsStatisticRepository
      .createQueryBuilder('stat')
      .leftJoinAndSelect('stat.user', 'user')
      .where('stat.year = :year', { year })
      .andWhere('stat.month = :month', { month })
      .andWhere('user.role = :role', { role: UserRole.USER })
      .orderBy('stat.totalEarnings', 'DESC')
      .getMany();

    return earningsStats.map(stat => ({
      agentId: stat.userId,
      agentName: stat.user ? `${stat.user.firstName} ${stat.user.lastName}` : 'Unknown',
      totalEarnings: Number(stat.totalEarnings),
      completedOrders: stat.completedOrders,
      averageOrderValue: Number(stat.averageOrderValue),
    }));
  }

  private async getOrganizationEarningsData(startDate: Date, endDate: Date): Promise<OrganizationEarningsData[]> {
    // Get earnings data from work reports which contain the calculated amounts
    const organizationStats = await this.workReportRepository
      .createQueryBuilder('report')
      .select('order.organizationId', 'organizationId')
      .addSelect('organization.name', 'organizationName')
      .addSelect('COUNT(DISTINCT order.id)', 'totalOrders')
      .addSelect('SUM(report.calculatedAmount)', 'totalEarnings')
      .addSelect('AVG(report.calculatedAmount)', 'averageOrderValue')
      .leftJoin('report.order', 'order')
      .leftJoin('order.organization', 'organization')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('report.submittedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('order.organizationId')
      .addGroupBy('organization.name')
      .orderBy('totalEarnings', 'DESC')
      .getRawMany();

    return organizationStats.map(stat => ({
      organizationId: stat.organizationId,
      organizationName: stat.organizationName || 'Unknown',
      totalEarnings: Number(stat.totalEarnings) || 0,
      totalOrders: Number(stat.totalOrders) || 0,
      averageOrderValue: Number(stat.averageOrderValue) || 0,
    }));
  }

  private async getOvertimeStatisticsData(startDate: Date, endDate: Date): Promise<OvertimeStatisticsData[]> {
    const overtimeStats = await this.workReportRepository
      .createQueryBuilder('report')
      .select('report.engineerId', 'engineerId')
      .addSelect('engineer.firstName', 'firstName')
      .addSelect('engineer.lastName', 'lastName')
      .addSelect('SUM(CASE WHEN report.isOvertime = true THEN report.totalHours ELSE 0 END)', 'overtimeHours')
      .addSelect('SUM(CASE WHEN report.isOvertime = false THEN report.totalHours ELSE 0 END)', 'regularHours')
      .addSelect('SUM(report.totalHours)', 'totalHours')
      .leftJoin('report.engineer', 'engineer')
      .where('report.submittedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('report.engineerId')
      .addGroupBy('engineer.firstName')
      .addGroupBy('engineer.lastName')
      .orderBy('overtimeHours', 'DESC')
      .getRawMany();

    return overtimeStats.map(stat => {
      const overtimeHours = Number(stat.overtimeHours) || 0;
      const regularHours = Number(stat.regularHours) || 0;
      const totalHours = Number(stat.totalHours) || 0;
      const overtimePercentage = totalHours > 0 ? (overtimeHours / totalHours) * 100 : 0;

      return {
        agentId: stat.engineerId,
        agentName: stat.firstName && stat.lastName ? `${stat.firstName} ${stat.lastName}` : 'Unknown',
        overtimeHours,
        regularHours,
        totalHours,
        overtimePercentage: Math.round(overtimePercentage * 100) / 100,
      };
    });
  }
}
