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
import { JwtAuthGuard } from '../аутентификация/jwt-auth.guard';
import { RolesGuard } from '../аутентификация/roles.guard';
import { Roles } from '../аутентификация/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import {
  CreateOrderDto,
  UpdateOrderDto,
  AssignEngineerDto,
  OrdersQueryDto,
} from '../../shared/dtos/order.dto';
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
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    return this.ordersService.create(createOrderDto, req.user.id);
  }

  @Post('automatic')
  @Roles(UserRole.ADMIN) // Только администраторы могут создавать автоматические заказы
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
      userRole: req.user?.role,
    });
    return this.ordersService.assignEngineer(id, assignEngineerDto, req.user);
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
    },
    @Request() req
  ) {
    return this.ordersService.completeWork(orderId, req.user.id, workData);
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
