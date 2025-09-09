import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { EarningsStatistic } from '../../entities/earnings-statistic.entity';
import { Order } from '../../entities/order.entity';
import { User, UserRole } from '../../entities/user.entity';
import { OrderStatus } from '@interfaces/order.interface';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(EarningsStatistic)
    private earningsStatisticRepository: Repository<EarningsStatistic>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

  async getUserEarningsStatistics(userId: number, months: number = 12): Promise<EarningsStatistic[]> {
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

  async getTopEarnersByMonth(year: number, month: number, limit: number = 10): Promise<EarningsStatistic[]> {
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
    userId?: number,
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
      growth = ((currentMonthStat.totalEarnings - previousMonthStat.totalEarnings) / previousMonthStat.totalEarnings) * 100;
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

    await Promise.all(
      users.map(user => this.calculateMonthlyEarnings(user.id, month, year))
    );
  }
}
