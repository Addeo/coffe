import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { WorkSessionsService, CreateWorkSessionDto } from '../work-sessions/work-sessions.service';
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { UpdateOrderDto, AssignEngineerDto, OrdersQueryDto } from '../../shared/dtos/order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderSource } from '../../entities/order.entity';
import { TerritoryType } from '../../shared/interfaces/order.interface';

// Extended OrdersQueryDto with additional filters
interface ExtendedOrdersQueryDto extends OrdersQueryDto {
  source?: OrderSource;
  createdById?: number;
  search?: string;
  territoryType?: TerritoryType;
  minDistanceKm?: number;
  maxDistanceKm?: number;
  plannedStartDateFrom?: Date;
  plannedStartDateTo?: Date;
  actualStartDateFrom?: Date;
  actualStartDateTo?: Date;
  completionDateFrom?: Date;
  completionDateTo?: Date;
  assignedById?: number;
}

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly workSessionsService: WorkSessionsService
  ) {}

  @Post()
  @Roles(UserRole.MANAGER) // ИЗМЕНЕНИЕ: Админ не может создавать заявки, только Менеджер
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    console.log('📝 [OrdersController] Creating order:', {
      userId: req.user?.id,
      userRole: req.user?.role,
      orderData: {
        title: createOrderDto.title,
        organizationId: createOrderDto.organizationId,
        location: createOrderDto.location,
        hasFiles: !!createOrderDto.files && createOrderDto.files.length > 0,
        filesCount: createOrderDto.files?.length || 0,
      },
    });

    return this.ordersService.create(createOrderDto, req.user.id).catch(error => {
      console.error('❌ [OrdersController] Error creating order:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    });
  }

  @Post('automatic')
  @Roles(UserRole.MANAGER) // ИЗМЕНЕНИЕ: Менеджер может создавать автоматические заявки
  createAutomatic(@Body() body: CreateOrderDto & { source?: OrderSource }, @Request() req) {
    const { source = OrderSource.AUTOMATIC, ...createOrderDto } = body;
    return this.ordersService.createAutomaticOrder(createOrderDto, source, req.user.id);
  }

  @Get()
  findAll(@Query() query: ExtendedOrdersQueryDto, @Request() req) {
    return this.ordersService.findAll(query, req.user);
  }

  @Get('my-orders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getMyCreatedOrders(@Query() query: ExtendedOrdersQueryDto, @Request() req) {
    // Показываем заказы, созданные текущим пользователем
    return this.ordersService.findAll({ ...query, createdById: req.user.id }, req.user);
  }

  @Get('by-source/:source')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getOrdersBySource(
    @Param('source') source: OrderSource,
    @Query() query: ExtendedOrdersQueryDto,
    @Request() req
  ) {
    return this.ordersService.findAll({ ...query, source }, req.user);
  }

  @Get('stats')
  getStats(@Request() req) {
    return this.ordersService.getOrderStats(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.ordersService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req
  ) {
    return this.ordersService.update(id, updateOrderDto, req.user);
  }

  @Post(':id/assign-engineer')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  assignEngineer(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignEngineerDto: AssignEngineerDto,
    @Request() req
  ) {
    console.log('🎯 Controller: assignEngineer called', {
      id,
      engineerId: assignEngineerDto.engineerId,
      engineerIds: assignEngineerDto.engineerIds,
      userRole: req.user?.role,
    });

    // Если передан массив engineerIds, используем множественное назначение
    if (assignEngineerDto.engineerIds && assignEngineerDto.engineerIds.length > 0) {
      return this.ordersService.assignMultipleEngineers(
        id,
        assignEngineerDto.engineerIds,
        assignEngineerDto.engineerId || assignEngineerDto.engineerIds[0], // primaryEngineerId
        req.user
      );
    }

    return this.ordersService.assignEngineer(id, assignEngineerDto, req.user);
  }

  /**
   * Назначить нескольких инженеров на заявку
   * POST /orders/:id/assign-multiple
   */
  @Post(':id/assign-multiple')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  assignMultipleEngineers(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { engineerIds: number[]; primaryEngineerId?: number },
    @Request() req
  ) {
    console.log('🎯 Controller: assignMultipleEngineers called', {
      id,
      engineerIds: body.engineerIds,
      primaryEngineerId: body.primaryEngineerId,
      userRole: req.user?.role,
    });
    return this.ordersService.assignMultipleEngineers(
      id,
      body.engineerIds,
      body.primaryEngineerId,
      req.user
    );
  }

  /**
   * Получить все назначения инженеров на заявку
   * GET /orders/:id/assignments
   */
  @Get(':id/assignments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  getOrderAssignments(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.ordersService.getOrderAssignments(id, req.user);
  }

  /**
   * Удалить назначение инженера
   * DELETE /orders/:id/assignments/:assignmentId
   */
  @Delete(':id/assignments/:assignmentId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  removeEngineerAssignment(
    @Param('id', ParseIntPipe) orderId: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Request() req
  ) {
    return this.ordersService.removeEngineerAssignment(orderId, assignmentId, req.user);
  }

  @Post(':id/accept')
  @Roles(UserRole.USER) // Only engineers can accept orders
  acceptOrder(@Param('id', ParseIntPipe) id: number, @Request() req) {
    console.log('✅ Controller: acceptOrder called', {
      id,
      userId: req.user?.id,
      userRole: req.user?.role,
    });
    return this.ordersService.acceptOrder(id, req.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.ordersService.remove(id, req.user);
  }

  // Complete work endpoint
  @Post(':id/complete-work')
  @Roles(UserRole.USER) // Only engineers can complete work
  async completeWork(
    @Param('id', ParseIntPipe) orderId: number,
    @Body()
    workData: {
      regularHours: number;
      overtimeHours: number;
      carPayment: number;
      distanceKm?: number;
      territoryType?: string;
      notes?: string;
      isFullyCompleted?: boolean;
      files?: string[];
    },
    @Request() req
  ) {
    console.log('🔧 Controller: completeWork called', {
      orderId,
      userId: req.user?.id,
      isFullyCompleted: workData.isFullyCompleted,
      regularHours: workData.regularHours,
      overtimeHours: workData.overtimeHours,
    });
    return this.ordersService.completeWork(orderId, req.user.id, workData);
  }

  /**
   * Создать рабочую сессию (выезд) для заказа
   * POST /orders/:id/work-sessions
   */
  @Post(':id/work-sessions')
  @Roles(UserRole.USER, UserRole.MANAGER, UserRole.ADMIN)
  createWorkSession(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() createWorkSessionDto: CreateWorkSessionDto,
    @Request() req
  ) {
    return this.workSessionsService.createWorkSession(orderId, req.user.id, createWorkSessionDto);
  }

  /**
   * Получить все рабочие сессии по заказу
   * GET /orders/:id/work-sessions
   */
  @Get(':id/work-sessions')
  getOrderWorkSessions(@Param('id', ParseIntPipe) orderId: number) {
    return this.workSessionsService.getOrderWorkSessions(orderId);
  }

  /**
   * Завершить заказ (после создания всех рабочих сессий)
   * POST /orders/:id/complete
   */
  @Post(':id/complete')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  completeOrder(@Param('id', ParseIntPipe) orderId: number, @Request() req) {
    return this.ordersService.completeOrder(orderId, req.user.id);
  }

  // Temporary test endpoint
  @Get('test')
  test() {
    return { message: 'Orders API is working', timestamp: new Date() };
  }

  @Get('test/files')
  testFiles() {
    return { message: 'Files test from OrdersController', timestamp: new Date() };
  }
}
