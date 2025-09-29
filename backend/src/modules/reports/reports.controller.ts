import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Получение данных для графика зарплат инженеров
   */
  @Get('engineer-salaries-chart')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getEngineerSalariesChart(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('engineerIds') engineerIds?: string,
  ) {
    const monthNum = month ? parseInt(month) : undefined;
    const yearNum = year ? parseInt(year) : undefined;
    const engineerIdsArray = engineerIds ? engineerIds.split(',').map(id => parseInt(id.trim())) : undefined;

    const data = await this.reportsService.getEngineerSalariesChart(
      monthNum,
      yearNum,
      engineerIdsArray
    );

    return {
      success: true,
      data,
    };
  }

  /**
   * Получение данных для графика отработанных часов инженеров
   */
  @Get('engineer-hours-chart')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getEngineerHoursChart(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('engineerIds') engineerIds?: string,
  ) {
    const monthNum = month ? parseInt(month) : undefined;
    const yearNum = year ? parseInt(year) : undefined;
    const engineerIdsArray = engineerIds ? engineerIds.split(',').map(id => parseInt(id.trim())) : undefined;

    const data = await this.reportsService.getEngineerHoursChart(
      monthNum,
      yearNum,
      engineerIdsArray
    );

    return {
      success: true,
      data,
    };
  }
}

