import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CreateOrderDto, UpdateOrderDto, AssignEngineerDto, OrdersQueryDto } from '../../../shared/dtos/order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    return this.ordersService.create(createOrderDto, req.user.id);
  }

  @Get()
  findAll(@Query() query: OrdersQueryDto, @Request() req) {
    return this.ordersService.findAll(query, req.user);
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
  update(@Param('id', ParseIntPipe) id: number, @Body() updateOrderDto: UpdateOrderDto, @Request() req) {
    return this.ordersService.update(id, updateOrderDto, req.user);
  }

  @Post(':id/assign-engineer')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  assignEngineer(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignEngineerDto: AssignEngineerDto,
    @Request() req
  ) {
    return this.ordersService.assignEngineer(id, assignEngineerDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.ordersService.remove(id, req.user);
  }
}
