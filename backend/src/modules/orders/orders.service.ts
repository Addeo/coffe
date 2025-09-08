import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { CreateOrderDto, UpdateOrderDto, AssignEngineerDto, OrdersQueryDto } from '../../../../shared/dtos/order.dto';
import { OrderStatus } from '../../../../shared/interfaces/order.interface';
import { UserRole } from '../../../../shared/interfaces/user.interface';

export interface OrdersResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: number): Promise<Order> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const order = this.ordersRepository.create({
      ...createOrderDto,
      createdBy: user,
      createdById: userId,
      status: OrderStatus.PENDING,
    });

    return this.ordersRepository.save(order);
  }

  async findAll(query: OrdersQueryDto = {}, user: User): Promise<OrdersResponse> {
    const { page = 1, limit = 10, status, organizationId, engineerId, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const queryBuilder = this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.organization', 'organization')
      .leftJoinAndSelect('order.assignedEngineer', 'engineer')
      .leftJoinAndSelect('order.createdBy', 'createdBy')
      .leftJoinAndSelect('order.assignedBy', 'assignedBy');

    // Apply filters based on user role
    if (user.role === UserRole.USER) {
      // Regular users can only see orders they created
      queryBuilder.andWhere('order.createdById = :userId', { userId: user.id });
    } else if (user.role === UserRole.MANAGER) {
      // Managers can see orders from their organization or assigned to them
      queryBuilder.andWhere('(order.createdById = :userId OR order.assignedById = :userId)', { userId: user.id });
    }
    // Admins can see all orders

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (organizationId) {
      queryBuilder.andWhere('order.organizationId = :organizationId', { organizationId });
    }

    if (engineerId) {
      queryBuilder.andWhere('order.assignedEngineerId = :engineerId', { engineerId });
    }

    queryBuilder
      .orderBy(`order.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, user: User): Promise<Order> {
    const queryBuilder = this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.organization', 'organization')
      .leftJoinAndSelect('order.assignedEngineer', 'engineer')
      .leftJoinAndSelect('order.createdBy', 'createdBy')
      .leftJoinAndSelect('order.assignedBy', 'assignedBy')
      .where('order.id = :id', { id });

    // Apply role-based access control
    if (user.role === UserRole.USER) {
      queryBuilder.andWhere('order.createdById = :userId', { userId: user.id });
    } else if (user.role === UserRole.MANAGER) {
      queryBuilder.andWhere('(order.createdById = :userId OR order.assignedById = :userId)', { userId: user.id });
    }

    const order = await queryBuilder.getOne();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto, user: User): Promise<Order> {
    const order = await this.findOne(id, user);

    // Check permissions for status updates
    if (updateOrderDto.status && user.role === UserRole.USER && updateOrderDto.status !== OrderStatus.CANCELLED) {
      throw new BadRequestException('Users can only cancel orders');
    }

    // Set assignedBy if assigning engineer
    if (updateOrderDto.assignedEngineerId && !order.assignedById) {
      updateOrderDto.assignedById = user.id;
    }

    // Set actual dates based on status
    if (updateOrderDto.status === OrderStatus.IN_PROGRESS && !order.actualStartDate) {
      updateOrderDto.actualStartDate = new Date();
    } else if (updateOrderDto.status === OrderStatus.COMPLETED && !order.completionDate) {
      updateOrderDto.completionDate = new Date();
    }

    Object.assign(order, updateOrderDto);
    return this.ordersRepository.save(order);
  }

  async assignEngineer(id: number, assignEngineerDto: AssignEngineerDto, user: User): Promise<Order> {
    // Only managers and admins can assign engineers
    if (user.role === UserRole.USER) {
      throw new BadRequestException('Insufficient permissions to assign engineers');
    }

    const order = await this.findOne(id, user);

    // Check if engineer exists and is active
    const engineer = await this.usersRepository.findOne({
      where: { id: assignEngineerDto.engineerId, role: UserRole.USER, isActive: true }
    });

    if (!engineer) {
      throw new NotFoundException('Engineer not found or inactive');
    }

    order.assignedEngineerId = assignEngineerDto.engineerId;
    order.assignedById = user.id;
    order.status = OrderStatus.ASSIGNED;

    return this.ordersRepository.save(order);
  }

  async remove(id: number, user: User): Promise<void> {
    const order = await this.findOne(id, user);

    // Only allow deletion of pending orders
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Can only delete pending orders');
    }

    // Only creator or admin can delete
    if (user.role !== UserRole.ADMIN && order.createdById !== user.id) {
      throw new BadRequestException('Insufficient permissions to delete this order');
    }

    await this.ordersRepository.remove(order);
  }

  async getOrderStats(user: User): Promise<{
    total: number;
    pending: number;
    assigned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  }> {
    const queryBuilder = this.ordersRepository.createQueryBuilder('order');

    // Apply role-based filtering
    if (user.role === UserRole.USER) {
      queryBuilder.where('order.createdById = :userId', { userId: user.id });
    } else if (user.role === UserRole.MANAGER) {
      queryBuilder.where('(order.createdById = :userId OR order.assignedById = :userId)', { userId: user.id });
    }

    const stats = await queryBuilder
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();

    const result = {
      total: 0,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    };

    stats.forEach(stat => {
      result.total += parseInt(stat.count);
      result[stat.status] = parseInt(stat.count);
    });

    return result;
  }
}
