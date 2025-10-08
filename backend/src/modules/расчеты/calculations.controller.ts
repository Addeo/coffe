import { Controller, Get, Post, Put, Query, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { SalaryCalculationService, SalaryCalculationResult } from './salary-calculation.service';
import { CalculationService } from './calculation.service';

@Controller('calculations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalculationsController {
  constructor(
    private salaryCalculationService: SalaryCalculationService,
    private calculationService: CalculationService
  ) {}

  /**
   * Ручной запуск расчета зарплаты за месяц
   */
  @Post('calculate-monthly/:month/:year')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async calculateMonthlySalary(
    @Param('month') month: number,
    @Param('year') year: number
  ): Promise<{ message: string; results: SalaryCalculationResult[] }> {
    const results = await this.salaryCalculationService.calculateSalaryForMonthManual(month, year);

    return {
      message: `Расчет зарплаты за ${month}/${year} выполнен для ${results.length} инженеров`,
      results,
    };
  }

  /**
   * Получение расчетов зарплаты с фильтрами
   */
  @Get('salary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  async getSalaryCalculations(
    @Query('engineerId') engineerId?: number,
    @Query('month') month?: number,
    @Query('year') year?: number,
    @Query('status') status?: string
  ) {
    return this.salaryCalculationService.getSalaryCalculations(
      engineerId ? Number(engineerId) : undefined,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
      status as any
    );
  }

  /**
   * Получение конкретного расчета зарплаты
   */
  @Get('salary/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  async getSalaryCalculation(@Param('id') id: number) {
    const calculations = await this.salaryCalculationService.getSalaryCalculations();
    return calculations.find(calc => calc.id === id);
  }

  /**
   * Обновление статуса расчета
   */
  @Put('salary/:id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateCalculationStatus(
    @Param('id') calculationId: number,
    @Body() body: { status: string; userId?: number }
  ) {
    return this.salaryCalculationService.updateCalculationStatus(
      calculationId,
      body.status as any,
      body.userId
    );
  }

  /**
   * Получение статистики расчетов
   */
  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getCalculationStatistics(@Query('month') month?: number, @Query('year') year?: number) {
    const currentMonth = month ? Number(month) : new Date().getMonth() + 1;
    const currentYear = year ? Number(year) : new Date().getFullYear();

    const calculations = await this.salaryCalculationService.getSalaryCalculations(
      undefined,
      currentMonth,
      currentYear
    );

    const stats = {
      totalEngineers: calculations.length,
      totalSalaryAmount: calculations.reduce((sum, calc) => sum + calc.totalAmount, 0),
      totalClientRevenue: calculations.reduce((sum, calc) => sum + calc.clientRevenue, 0),
      averageProfitMargin: 0,
      topEarners: [] as any[],
    };

    if (stats.totalClientRevenue > 0) {
      stats.averageProfitMargin =
        ((stats.totalClientRevenue - stats.totalSalaryAmount) / stats.totalClientRevenue) * 100;
    }

    // Топ-5 инженеров
    stats.topEarners = calculations
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)
      .map(calc => ({
        name: calc.engineer.user
          ? `${calc.engineer.user.firstName} ${calc.engineer.user.lastName}`
          : 'Unknown',
        amount: calc.totalAmount,
      }));

    return stats;
  }

  /**
   * Тестовый endpoint для проверки расчетов
   */
  @Post('test-calculation')
  @Roles(UserRole.ADMIN)
  async testCalculation(@Body() body: any) {
    const { engineer, organization, hours, isOvertime, distanceKm, territoryType } = body;

    const payment = await this.calculationService.calculateEngineerPayment(
      engineer,
      organization,
      hours,
      isOvertime
    );

    const carUsage = await this.calculationService.calculateCarUsage(
      engineer,
      organization,
      distanceKm || 0,
      territoryType || 'HOME'
    );

    return {
      payment,
      carUsage,
      total: payment + carUsage,
      details: {
        engineerType: engineer.type,
        organizationName: organization.name,
        baseRate: engineer.baseRate,
        hours,
        isOvertime,
        distanceKm,
        territoryType,
      },
    };
  }
}
