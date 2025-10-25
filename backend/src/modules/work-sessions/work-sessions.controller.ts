import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import {
  WorkSessionsService,
  CreateWorkSessionDto,
  UpdateWorkSessionDto,
} from './work-sessions.service';
import { WorkSession } from '../../entities/work-session.entity';

@Controller('work-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkSessionsController {
  constructor(private readonly workSessionsService: WorkSessionsService) {}

  /**
   * Получить одну сессию по ID
   * GET /work-sessions/:id
   */
  @Get(':id')
  async getWorkSession(@Param('id', ParseIntPipe) id: number): Promise<WorkSession> {
    return this.workSessionsService.getWorkSessionById(id);
  }

  /**
   * Получить свои рабочие сессии (для инженера)
   * GET /work-sessions/my?startDate=...&endDate=...
   */
  @Get('my/sessions')
  @Roles(UserRole.USER, UserRole.MANAGER, UserRole.ADMIN)
  async getMyWorkSessions(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<WorkSession[]> {
    const engineerId = req.user.engineerId;

    if (!engineerId) {
      return [];
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.workSessionsService.getEngineerWorkSessions(engineerId, start, end);
  }

  /**
   * Обновить рабочую сессию
   * PATCH /work-sessions/:id
   */
  @Patch(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async updateWorkSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateWorkSessionDto
  ): Promise<WorkSession> {
    return this.workSessionsService.updateWorkSession(id, updateData);
  }

  /**
   * Удалить рабочую сессию
   * DELETE /work-sessions/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteWorkSession(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.workSessionsService.deleteWorkSession(id);
    return { success: true };
  }
}
