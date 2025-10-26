import { Controller, Get, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { MonthlyStatisticsDto, StatisticsQueryDto } from '../../dtos/reports.dto';

@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('earnings')
  async getUserEarningsStatistics(
    @Request() req,
    @Query('months', ParseIntPipe) months: number = 12
  ) {
    return this.statisticsService.getUserEarningsStatistics(req.user.id, months);
  }

  @Get('earnings/comparison')
  async getEarningsComparison(@Request() req) {
    return this.statisticsService.getEarningsComparison(req.user.id);
  }

  @Get('earnings/rank')
  async getUserRank(
    @Request() req,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number
  ) {
    const rank = await this.statisticsService.getUserRankByEarnings(req.user.id, year, month);
    return { rank };
  }

  @Get('engineer/detailed')
  async getEngineerDetailedStats(
    @Request() req,
    @Query('year', ParseIntPipe) year?: number,
    @Query('month', ParseIntPipe) month?: number
  ) {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || currentDate.getMonth() + 1;

    return this.statisticsService.getEngineerDetailedStats(req.user.id, targetYear, targetMonth);
  }

  @Get('monthly')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getMonthlyStatistics(
    @Query('year', ParseIntPipe) year?: number,
    @Query('month', ParseIntPipe) month?: number
  ): Promise<MonthlyStatisticsDto> {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || currentDate.getMonth() + 1;

    return this.statisticsService.getMonthlyStatistics(targetYear, targetMonth);
  }

  @Get('comprehensive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getComprehensiveStatistics(
    @Query('year', ParseIntPipe) year?: number,
    @Query('month', ParseIntPipe) month?: number,
    @Query('includeTimeBased') includeTimeBased: boolean = true,
    @Query('includeFinancial') includeFinancial: boolean = true,
    @Query('includeRankings') includeRankings: boolean = true,
    @Query('includeForecast') includeForecast: boolean = true
  ) {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || currentDate.getMonth() + 1;

    return this.statisticsService.getComprehensiveStatistics(targetYear, targetMonth, {
      includeTimeBased,
      includeFinancial,
      includeRankings,
      includeForecast,
    });
  }

  @Get('admin/engineers')
  @Roles(UserRole.ADMIN)
  async getAdminEngineerStatistics(
    @Query('year', ParseIntPipe) year?: number,
    @Query('month', ParseIntPipe) month?: number
  ) {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || currentDate.getMonth() + 1;

    return this.statisticsService.getAdminEngineerStatistics(targetYear, targetMonth);
  }

  @Get('payment-debts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getPaymentDebtsStatistics(
    @Query('year', ParseIntPipe) year?: number,
    @Query('month', ParseIntPipe) month?: number
  ) {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || currentDate.getMonth() + 1;

    return this.statisticsService.getPaymentDebtsStatistics(targetYear, targetMonth);
  }
}
