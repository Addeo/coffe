import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { Setting, SettingKey } from '../../entities/settings.entity';
import { CreateOrderDto, UpdateOrderDto, AssignEngineerDto, OrdersQueryDto } from '@dtos/order.dto';
import { OrderStatus } from '@interfaces/order.interface';
import { UserRole } from '../../entities/user.entity';

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
    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,
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
      status: OrderStatus.WAITING,
    });

    const savedOrder = await this.ordersRepository.save(order);

    // Check if auto-distribution is enabled and try to assign the order
    const autoDistributionEnabled = await this.getAutoDistributionEnabled();
    if (autoDistributionEnabled) {
      await this.autoAssignOrder(savedOrder);
    }

    return savedOrder;
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
      // Regular users can only see orders assigned to them
      queryBuilder.andWhere('order.assignedEngineerId = :userId', { userId: user.id });
    }
    // Admins and managers can see all orders

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
      // Regular users can only see orders assigned to them
      queryBuilder.andWhere('order.assignedEngineerId = :userId', { userId: user.id });
    }
    // Admins and managers can see all orders

    const order = await queryBuilder.getOne();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto, user: User): Promise<Order> {
    const order = await this.findOne(id, user);

    // Check permissions for status updates
    if (updateOrderDto.status && user.role === UserRole.USER && updateOrderDto.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Users can only mark orders as completed');
    }

    // Set assignedBy if assigning engineer
    if (updateOrderDto.assignedEngineerId && !order.assignedById) {
      updateOrderDto.assignedById = user.id;
    }

    // Set actual dates based on status
    if (updateOrderDto.status === OrderStatus.WORKING && !order.actualStartDate) {
      updateOrderDto.actualStartDate = new Date();
    } else if (updateOrderDto.status === OrderStatus.COMPLETED && !order.completionDate) {
      updateOrderDto.completionDate = new Date();
    }

    Object.assign(order, updateOrderDto);
    return this.ordersRepository.save(order);
  }

  async assignEngineer(id: number, assignEngineerDto: AssignEngineerDto, user: User): Promise<Order> {
    // Only managers can assign engineers
    if (user.role !== UserRole.MANAGER) {
      throw new BadRequestException('Only managers can assign engineers to orders');
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
    order.status = OrderStatus.PROCESSING;

    return this.ordersRepository.save(order);
  }

  async remove(id: number, user: User): Promise<void> {
    const order = await this.findOne(id, user);

    // Only allow deletion of waiting orders
    if (order.status !== OrderStatus.WAITING) {
      throw new BadRequestException('Can only delete waiting orders');
    }

    // Only creator or admin can delete
    if (user.role !== UserRole.ADMIN && order.createdById !== user.id) {
      throw new BadRequestException('Insufficient permissions to delete this order');
    }

    await this.ordersRepository.remove(order);
  }

  async getOrderStats(user: User): Promise<{
    total: number;
    waiting: number;
    processing: number;
    working: number;
    review: number;
    completed: number;
  }> {
    const queryBuilder = this.ordersRepository.createQueryBuilder('order');

    // Apply role-based filtering
    if (user.role === UserRole.USER) {
      // Regular users can only see orders assigned to them
      queryBuilder.where('order.assignedEngineerId = :userId', { userId: user.id });
    }
    // Admins and managers can see all orders

    const stats = await queryBuilder
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();

    const result = {
      total: 0,
      waiting: 0,
      processing: 0,
      working: 0,
      review: 0,
      completed: 0,
    };

    stats.forEach(stat => {
      result.total += parseInt(stat.count);
      result[stat.status] = parseInt(stat.count);
    });

    return result;
  }

  private async getAutoDistributionEnabled(): Promise<boolean> {
    const setting = await this.settingsRepository.findOne({
      where: { key: SettingKey.AUTO_DISTRIBUTION_ENABLED }
    });
    return setting?.value === 'true';
  }

  private async getMaxOrdersPerEngineer(): Promise<number> {
    const setting = await this.settingsRepository.findOne({
      where: { key: SettingKey.MAX_ORDERS_PER_ENGINEER }
    });
    return setting ? parseInt(setting.value, 10) : 5;
  }

  private async autoAssignOrder(order: Order): Promise<void> {
    try {
      const availableEngineer = await this.findAvailableEngineer();
      if (availableEngineer) {
        order.assignedEngineerId = availableEngineer.id;
        order.assignedById = 1; // System user ID for auto-assignment
        order.status = OrderStatus.PROCESSING;
        await this.ordersRepository.save(order);
      }
    } catch (error) {
      // Log error but don't fail the order creation
      console.error('Auto-assignment failed:', error);
    }
  }

  private async findAvailableEngineer(): Promise<User | null> {
    const maxOrders = await this.getMaxOrdersPerEngineer();

    // Find engineers with fewer than max orders assigned
    const engineers = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.assignedOrders', 'order', 'order.status IN (:statuses)', {
        statuses: [OrderStatus.PROCESSING, OrderStatus.WORKING, OrderStatus.REVIEW]
      })
      .where('user.role = :userRole', { userRole: UserRole.USER })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .groupBy('user.id')
      .having('COUNT(order.id) < :maxOrders', { maxOrders })
      .orderBy('COUNT(order.id)', 'ASC')
      .getMany();

    return engineers.length > 0 ? engineers[0] : null;
  }
}
