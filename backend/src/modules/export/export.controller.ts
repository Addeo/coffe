import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { Request } from '@nestjs/common';

@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('orders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  async exportOrders(
    @Res() response: Response,
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    await this.exportService.exportOrdersReport(
      response,
      req.user.role,
      req.user.id,
      start,
      end
    );
  }

  @Get('earnings')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async exportEarnings(
    @Res() response: Response,
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('userId') userId?: number,
  ) {
    await this.exportService.exportEarningsReport(
      response,
      UserRole.ADMIN, // Для экспорта доступны все данные
      userId,
      year,
      month
    );
  }
}
