import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { Setting, SettingKey } from '../../entities/settings.entity';
import { UserActivityLog, ActivityType } from '../../entities/user-activity-log.entity';
import { CreateOrderDto, UpdateOrderDto, AssignEngineerDto, OrdersQueryDto } from '../../../shared/dtos/order.dto';
import { OrderStatus } from '../../../shared/interfaces/order.interface';
import { UserRole } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { StatisticsService } from '../statistics/statistics.service';
import { NotificationPriority } from '../../entities/notification.entity';

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
    @InjectRepository(UserActivityLog)
    private readonly activityLogRepository: Repository<UserActivityLog>,
    private readonly notificationsService: NotificationsService,
    private readonly statisticsService: StatisticsService,
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

    // Log order creation
    await this.logActivity(
      savedOrder.id,
      ActivityType.ORDER_CREATED,
      `Order "${savedOrder.title}" was created`,
      { createdById: userId },
      userId
    );

    // Check if auto-distribution is enabled and try to assign the order
    const autoDistributionEnabled = await this.getAutoDistributionEnabled();
    if (autoDistributionEnabled) {
      await this.autoAssignOrder(savedOrder, userId);
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
    const oldStatus = order.status;

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
    const updatedOrder = await this.ordersRepository.save(order);

    // Log order status change
    if (updateOrderDto.status && oldStatus !== updateOrderDto.status) {
      await this.logActivity(
        id,
        ActivityType.ORDER_STATUS_CHANGED,
        `Order "${order.title}" status changed from ${oldStatus} to ${updateOrderDto.status}`,
        {
          oldStatus,
          newStatus: updateOrderDto.status,
          orderId: id
        },
        user.id
      );

      // Send notifications
      await this.sendStatusChangeNotifications(updatedOrder, user.id);
    }

    // If order is completed, recalculate earnings statistics
    if (updateOrderDto.status === OrderStatus.COMPLETED && oldStatus !== OrderStatus.COMPLETED) {
      const completionDate = updatedOrder.completionDate || new Date();
      await this.statisticsService.calculateMonthlyEarnings(
        updatedOrder.assignedEngineerId,
        completionDate.getMonth() + 1,
        completionDate.getFullYear()
      );
    }

    return updatedOrder;
  }

  async assignEngineer(id: number, assignEngineerDto: AssignEngineerDto, user: User): Promise<Order> {
    // Only managers can assign engineers
    if (user.role !== UserRole.MANAGER) {
      throw new BadRequestException('Only managers can assign engineers to orders');
    }

    const order = await this.findOne(id, user);

    // Check if there's already an assigned engineer
    if (order.assignedEngineerId && order.assignedEngineerId !== assignEngineerDto.engineerId) {
      // Check if user wants to overwrite existing assignment
      // Additional confirmation logic can be added here
    }

    // Check if engineer exists and is active
    const engineer = await this.usersRepository.findOne({
      where: { id: assignEngineerDto.engineerId, role: UserRole.USER, isActive: true }
    });

    if (!engineer) {
      throw new NotFoundException('Engineer not found or inactive');
    }

    const oldEngineerId = order.assignedEngineerId;
    order.assignedEngineerId = assignEngineerDto.engineerId;
    order.assignedById = user.id;
    order.status = OrderStatus.PROCESSING;

    const updatedOrder = await this.ordersRepository.save(order);

    // Log engineer assignment
    await this.logActivity(
      id,
      ActivityType.ORDER_ASSIGNED,
      `Order "${order.title}" was assigned to engineer ${engineer.firstName} ${engineer.lastName}`,
      {
        orderId: id,
        assignedEngineerId: assignEngineerDto.engineerId,
        oldEngineerId,
      },
      user.id
    );

    // Send notification to engineer
    await this.notificationsService.createOrderAssignedNotification(
      id,
      order.title,
      assignEngineerDto.engineerId,
      user.id
    );

    return updatedOrder;
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

  private async autoAssignOrder(order: Order, createdById: number): Promise<void> {
    try {
      const availableEngineer = await this.findAvailableEngineer();
      if (availableEngineer) {
        const oldEngineerId = order.assignedEngineerId;
        order.assignedEngineerId = availableEngineer.id;
        order.assignedById = createdById; // Use order creator's ID
        order.status = OrderStatus.PROCESSING;
        await this.ordersRepository.save(order);

        // Log auto-assignment
        await this.logActivity(
          order.id,
          ActivityType.ORDER_AUTO_ASSIGNED,
          `Order "${order.title}" was auto-assigned to engineer ${availableEngineer.firstName} ${availableEngineer.lastName}`,
          {
            orderId: order.id,
            assignedEngineerId: availableEngineer.id,
            oldEngineerId,
            autoAssigned: true,
          },
          createdById
        );

        // Send notification to engineer
        await this.notificationsService.createOrderAssignedNotification(
          order.id,
          order.title,
          availableEngineer.id,
          createdById
        );
      } else {
        // If no engineers are available, send notification to admins and managers
        const adminUsers = await this.usersRepository.find({
          where: { role: UserRole.ADMIN, isActive: true }
        });

        const managerUsers = await this.usersRepository.find({
          where: { role: UserRole.MANAGER, isActive: true }
        });

        const adminIds = adminUsers.map(user => user.id);
        const managerIds = managerUsers.map(user => user.id);
        const allRecipientIds = [...adminIds, ...managerIds];

        await this.notificationsService.createSystemAlert(
          allRecipientIds,
          'No Available Engineers',
          `Order "${order.title}" could not be auto-assigned because no engineers are available.`,
          NotificationPriority.HIGH,
          { orderId: order.id }
        );
      }
    } catch (error) {
      // Log error but don't fail the order creation
      console.error('Auto-assignment failed:', error);
    }
  }

  private async findAvailableEngineer(): Promise<User | null> {
    const maxOrders = await this.getMaxOrdersPerEngineer();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // First, find engineers with active orders count less than maximum
    const engineersWithCapacity = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.assignedOrders', 'order', 'order.status IN (:statuses)', {
        statuses: [OrderStatus.PROCESSING, OrderStatus.WORKING, OrderStatus.REVIEW]
      })
      .where('user.role = :userRole', { userRole: UserRole.USER })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .groupBy('user.id')
      .having('COUNT(order.id) < :maxOrders', { maxOrders })
      .select(['user.id', 'user.firstName', 'user.lastName', 'COUNT(order.id) as activeOrders'])
      .orderBy('COUNT(order.id)', 'ASC')
      .getRawAndEntities();

    if (engineersWithCapacity.entities.length === 0) {
      return null;
    }

    // Among available engineers, select the one with the least earnings for the last month
    const engineerIds = engineersWithCapacity.entities.map(e => e.id);

    // Get earnings statistics for the last month
    const earningsStats = await this.settingsRepository
      .createQueryBuilder('setting')
      .where('setting.key = :key', { key: 'earnings_statistics' })
      .andWhere('JSON_EXTRACT(setting.value, "$.userId") IN (:userIds)', { userIds: engineerIds })
      .andWhere('JSON_EXTRACT(setting.value, "$.month") = :month', { month: currentMonth })
      .andWhere('JSON_EXTRACT(setting.value, "$.year") = :year', { year: currentYear })
      .getMany();

    // If no statistics available, select by active orders count
    if (earningsStats.length === 0) {
      return engineersWithCapacity.entities[0];
    }

    // Parse statistics and select engineer with minimum earnings
    let minEarnings = Infinity;
    let selectedEngineer = engineersWithCapacity.entities[0];

    for (const engineer of engineersWithCapacity.entities) {
      const stat = earningsStats.find(s => {
        try {
          const value = JSON.parse(s.value);
          return value.userId === engineer.id;
        } catch {
          return false;
        }
      });

      if (stat) {
        try {
          const statData = JSON.parse(stat.value);
          if (statData.totalEarnings < minEarnings) {
            minEarnings = statData.totalEarnings;
            selectedEngineer = engineer;
          }
        } catch {
          // If parsing failed, skip
          continue;
        }
      } else {
        // If no statistics available for this engineer, consider him priority
        selectedEngineer = engineer;
        break;
      }
    }

    return selectedEngineer;
  }

  private async sendStatusChangeNotifications(order: Order, performedById: number): Promise<void> {
    try {
      // Collect list of users to notify
      const affectedUserIds: number[] = [];

      // Add order creator
      if (order.createdById && order.createdById !== performedById) {
        affectedUserIds.push(order.createdById);
      }

      // Add assigned engineer
      if (order.assignedEngineerId && order.assignedEngineerId !== performedById) {
        affectedUserIds.push(order.assignedEngineerId);
      }

      // Add manager who assigned the order
      if (order.assignedById && order.assignedById !== performedById && !affectedUserIds.includes(order.assignedById)) {
        affectedUserIds.push(order.assignedById);
      }

      if (affectedUserIds.length > 0) {
        await this.notificationsService.createOrderStatusNotification(
          order.id,
          order.title,
          order.status,
          affectedUserIds,
          performedById
        );
      }
    } catch (error) {
      console.error('Failed to send status change notifications:', error);
    }
  }

  private async logActivity(
    orderId: number,
    activityType: ActivityType,
    description: string,
    metadata: any,
    performedById: number
  ): Promise<void> {
    try {
      const log = this.activityLogRepository.create({
        userId: performedById, // Use ID of user who performed the action
        activityType,
        description,
        metadata: {
          ...metadata,
          orderId,
        },
        performedById,
      });

      await this.activityLogRepository.save(log);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
}
