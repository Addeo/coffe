import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { SalaryPaymentService } from './salary-payment.service';
// Temporary - types not yet in shared package
type CreateSalaryPaymentDto = any;
type UpdateSalaryPaymentDto = any;
type SalaryPaymentDto = any;
type EngineerBalanceDto = any;
type EngineerBalanceDetailDto = any;
type PaymentType = any;

@Controller('api/salary-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalaryPaymentController {
  constructor(private readonly salaryPaymentService: SalaryPaymentService) {}

  /**
   * Создать выплату
   * POST /api/salary-payments
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async createPayment(
    @Body() createDto: CreateSalaryPaymentDto,
    @Request() req
  ): Promise<SalaryPaymentDto> {
    return this.salaryPaymentService.createPayment(createDto, req.user.userId);
  }

  /**
   * Получить все выплаты инженера
   * GET /api/salary-payments/engineer/:engineerId
   */
  @Get('engineer/:engineerId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getEngineerPayments(
    @Param('engineerId', ParseIntPipe) engineerId: number,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('type') type?: PaymentType,
    @Query('limit') limit?: string
  ): Promise<SalaryPaymentDto[]> {
    return this.salaryPaymentService.getEngineerPayments(engineerId, {
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Получить выплаты по начислению
   * GET /api/salary-payments/calculation/:calculationId
   */
  @Get('calculation/:calculationId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getPaymentsByCalculation(
    @Param('calculationId', ParseIntPipe) calculationId: number
  ): Promise<SalaryPaymentDto[]> {
    return this.salaryPaymentService.getPaymentsByCalculation(calculationId);
  }

  /**
   * Обновить выплату
   * PUT /api/salary-payments/:id
   */
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSalaryPaymentDto
  ): Promise<SalaryPaymentDto> {
    return this.salaryPaymentService.updatePayment(id, updateDto);
  }

  /**
   * Удалить выплату
   * DELETE /api/salary-payments/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async deletePayment(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.salaryPaymentService.deletePayment(id);
    return { success: true };
  }

  /**
   * Получить баланс инженера
   * GET /api/salary-payments/balance/:engineerId
   */
  @Get('balance/:engineerId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getEngineerBalance(
    @Param('engineerId', ParseIntPipe) engineerId: number
  ): Promise<EngineerBalanceDto> {
    return this.salaryPaymentService.getEngineerBalance(engineerId);
  }

  /**
   * Получить детальный баланс инженера
   * GET /api/salary-payments/balance/:engineerId/detail
   */
  @Get('balance/:engineerId/detail')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getEngineerBalanceDetail(
    @Param('engineerId', ParseIntPipe) engineerId: number
  ): Promise<EngineerBalanceDetailDto> {
    return this.salaryPaymentService.getEngineerBalanceDetail(engineerId);
  }

  /**
   * Получить балансы всех инженеров
   * GET /api/salary-payments/balances
   */
  @Get('balances')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAllEngineersBalances(): Promise<EngineerBalanceDto[]> {
    return this.salaryPaymentService.getAllEngineersBalances();
  }
}
