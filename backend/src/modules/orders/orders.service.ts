import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { Engineer } from '../../entities/engineer.entity';
import { Organization } from '../../entities/organization.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { File } from '../../entities/file.entity';
import { Setting, SettingKey } from '../../entities/settings.entity';
import { UserActivityLog, ActivityType } from '../../entities/user-activity-log.entity';
import { StatisticsService } from '../statistics/statistics.service';
import { CalculationService } from '../расчеты/calculation.service';
// Temporarily define DTOs locally until shared package is fixed
interface CreateOrderDto {
  organizationId: number;
  title: string;
  description?: string;
  location: string;
  distanceKm?: number;
  territoryType?: TerritoryType;
  source?: OrderSource;
  plannedStartDate?: Date;
  files?: string[];
}

interface UpdateOrderDto {
  organizationId?: number;
  title?: string;
  description?: string;
  location?: string;
  distanceKm?: number;
  territoryType?: TerritoryType;
  status?: OrderStatus;
  source?: OrderSource;
  plannedStartDate?: Date;
  actualStartDate?: Date;
  completionDate?: Date;
  assignedEngineerId?: number;
  assignedById?: number;
  files?: string[];
}

import { AssignEngineerDto, OrdersQueryDto } from '../../../shared/dtos/order.dto';
// Temporarily import OrderSource locally until shared package is fixed
import { OrderSource } from '../../entities/order.entity';
import { OrderStatus, TerritoryType } from '../../../shared/interfaces/order.interface';

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
import { WorkResult } from '../../entities/work-report.entity';
import { UserRole } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
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
    @InjectRepository(Engineer)
    private readonly engineersRepository: Repository<Engineer>,
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(WorkReport)
    private readonly workReportsRepository: Repository<WorkReport>,
    @InjectRepository(File)
    private readonly filesRepository: Repository<File>,
    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,
    @InjectRepository(UserActivityLog)
    private readonly activityLogRepository: Repository<UserActivityLog>,
    private readonly notificationsService: NotificationsService,
    private readonly statisticsService: StatisticsService,
    private readonly calculationService: CalculationService
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: number): Promise<Order> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { files, ...orderData } = createOrderDto;
    const order = this.ordersRepository.create({
      ...orderData,
      createdBy: user,
      createdById: userId,
      status: OrderStatus.WAITING,
      source: createOrderDto.source || OrderSource.MANUAL,
    });

    const savedOrder = await this.ordersRepository.save(order);

    // Attach files if provided
    if (createOrderDto.files && createOrderDto.files.length > 0) {
      await this.attachFilesToOrder(savedOrder.id, createOrderDto.files);
    }

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

    // Return order with attached files
    return this.findOne(savedOrder.id, user);
  }

  /**
   * Создание автоматического заказа (например, из email интеграции)
   */
  async createAutomaticOrder(
    createOrderDto: CreateOrderDto,
    source: OrderSource = OrderSource.AUTOMATIC,
    createdById?: number
  ): Promise<Order> {
    // Если createdById не указан, используем системного пользователя (ID 1)
    const systemUserId = createdById || 1;

    const user = await this.usersRepository.findOne({ where: { id: systemUserId } });
    if (!user) {
      throw new NotFoundException('System user not found');
    }

    const { files, ...orderData } = createOrderDto;
    const order = this.ordersRepository.create({
      ...orderData,
      createdBy: user,
      createdById: systemUserId,
      status: OrderStatus.WAITING,
      source: source,
    });

    const savedOrder = await this.ordersRepository.save(order);

    // Log automatic order creation
    await this.logActivity(
      savedOrder.id,
      ActivityType.ORDER_CREATED,
      `Automatic order "${savedOrder.title}" was created from ${source}`,
      {
        createdById: systemUserId,
        source: source,
        organizationId: createOrderDto.organizationId,
      },
      systemUserId
    );

    return savedOrder;
  }

  async findAll(query: ExtendedOrdersQueryDto = {}, user: User): Promise<OrdersResponse> {
    const {
      page = 1,
      limit = 10,
      status,
      organizationId,
      engineerId,
      source,
      createdById,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      territoryType,
      minDistanceKm,
      maxDistanceKm,
      plannedStartDateFrom,
      plannedStartDateTo,
      actualStartDateFrom,
      actualStartDateTo,
      completionDateFrom,
      completionDateTo,
      assignedById,
    } = query;

    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.organization', 'organization')
      .leftJoinAndSelect('order.assignedEngineer', 'assignedEngineerEntity')
      .leftJoinAndSelect('assignedEngineerEntity.user', 'assignedEngineerUser')
      .leftJoinAndSelect('order.createdBy', 'createdBy')
      .leftJoinAndSelect('order.assignedBy', 'assignedBy')
      .leftJoin('order.files', 'files')
      .leftJoin('files.uploadedBy', 'fileUploadedBy')
      .addSelect([
        'files.id', 'files.filename', 'files.originalName', 'files.mimetype',
        'files.size', 'files.path', 'files.type', 'files.description',
        'files.uploadedById', 'files.orderId', 'files.uploadedAt',
        'fileUploadedBy.id', 'fileUploadedBy.firstName', 'fileUploadedBy.lastName', 'fileUploadedBy.email'
      ]);

    // Apply filters based on user role
    if (user.role === UserRole.USER) {
      // Regular users can only see orders assigned to them
      // Find engineer profile for this user
      const engineer = await this.engineersRepository.findOne({
        where: { userId: user.id, isActive: true },
      });

      if (engineer) {
        queryBuilder.andWhere('order.assignedEngineerId = :engineerId', { engineerId: engineer.id });
      } else {
        // If no engineer profile found, return no orders
        queryBuilder.andWhere('1 = 0'); // Always false condition
      }
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

    if (source) {
      queryBuilder.andWhere('order.source = :source', { source });
    }

    if (createdById) {
      queryBuilder.andWhere('order.createdById = :createdById', { createdById });
    }

    if (assignedById) {
      queryBuilder.andWhere('order.assignedById = :assignedById', { assignedById });
    }

    if (search) {
      queryBuilder.andWhere(
        '(order.title LIKE :search OR order.description LIKE :search OR order.location LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (territoryType) {
      queryBuilder.andWhere('order.territoryType = :territoryType', { territoryType });
    }

    if (minDistanceKm !== undefined) {
      queryBuilder.andWhere('order.distanceKm >= :minDistanceKm', { minDistanceKm });
    }

    if (maxDistanceKm !== undefined) {
      queryBuilder.andWhere('order.distanceKm <= :maxDistanceKm', { maxDistanceKm });
    }

    if (plannedStartDateFrom) {
      queryBuilder.andWhere('order.plannedStartDate >= :plannedStartDateFrom', {
        plannedStartDateFrom,
      });
    }

    if (plannedStartDateTo) {
      queryBuilder.andWhere('order.plannedStartDate <= :plannedStartDateTo', {
        plannedStartDateTo,
      });
    }

    if (actualStartDateFrom) {
      queryBuilder.andWhere('order.actualStartDate >= :actualStartDateFrom', {
        actualStartDateFrom,
      });
    }

    if (actualStartDateTo) {
      queryBuilder.andWhere('order.actualStartDate <= :actualStartDateTo', { actualStartDateTo });
    }

    if (completionDateFrom) {
      queryBuilder.andWhere('order.completionDate >= :completionDateFrom', { completionDateFrom });
    }

    if (completionDateTo) {
      queryBuilder.andWhere('order.completionDate <= :completionDateTo', { completionDateTo });
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
    const order = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.organization', 'organization')
      .leftJoinAndSelect('order.assignedEngineer', 'assignedEngineerEntity')
      .leftJoinAndSelect('assignedEngineerEntity.user', 'assignedEngineerUser')
      .leftJoinAndSelect('order.createdBy', 'createdBy')
      .leftJoinAndSelect('order.assignedBy', 'assignedBy')
      .leftJoin('order.files', 'files')
      .leftJoin('files.uploadedBy', 'fileUploadedBy')
      .addSelect([
        'files.id', 'files.filename', 'files.originalName', 'files.mimetype',
        'files.size', 'files.path', 'files.type', 'files.description',
        'files.uploadedById', 'files.orderId', 'files.uploadedAt',
        'fileUploadedBy.id', 'fileUploadedBy.firstName', 'fileUploadedBy.lastName', 'fileUploadedBy.email'
      ])
      .leftJoinAndSelect('order.workReports', 'workReports')
      .where('order.id = :id', { id })
      .getOne();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Apply role-based access control
    if (user.role === UserRole.USER) {
      // Regular users can only see orders assigned to them
      if (order.assignedEngineerId !== user.id) {
        throw new NotFoundException('Order not found');
      }
    }
    // Admins and managers can see all orders

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto, user: User): Promise<Order> {
    const order = await this.findOne(id, user);
    const oldStatus = order.status;

    // Check permissions for status updates
    if (updateOrderDto.status && user.role === UserRole.USER) {
      // Engineers can only update their own assigned orders
      if (order.assignedEngineerId !== user.id) {
        throw new BadRequestException('You can only update your assigned orders');
      }

      // Engineers can change status from PROCESSING to WORKING, or WORKING to COMPLETED
      if (updateOrderDto.status === OrderStatus.WORKING && order.status !== OrderStatus.PROCESSING) {
        throw new BadRequestException('You can only start working on orders in PROCESSING status');
      }
      if (updateOrderDto.status === OrderStatus.COMPLETED && order.status !== OrderStatus.WORKING) {
        throw new BadRequestException('You can only complete orders that are in WORKING status');
      }
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

    console.log('\n🔄 UPDATE ORDER:', {
      orderId: id,
      hasFiles: updateOrderDto.files !== undefined,
      filesCount: updateOrderDto.files?.length,
      files: updateOrderDto.files,
    });

    Object.assign(order, updateOrderDto);
    const updatedOrder = await this.ordersRepository.save(order);
    console.log('💾 Order saved to database');

    // Attach files if provided (this will replace existing file associations)
    if (updateOrderDto.files !== undefined) {
      console.log('📎 Calling attachFilesToOrder...');
      await this.attachFilesToOrder(updatedOrder.id, updateOrderDto.files);
      console.log('✅ attachFilesToOrder completed');
    } else {
      console.log('ℹ️  No files field in update DTO, skipping file attachment');
    }

    // Log order status change
    if (updateOrderDto.status && oldStatus !== updateOrderDto.status) {
      await this.logActivity(
        id,
        ActivityType.ORDER_STATUS_CHANGED,
        `Order "${order.title}" status changed from ${oldStatus} to ${updateOrderDto.status}`,
        {
          oldStatus,
          newStatus: updateOrderDto.status,
          orderId: id,
        },
        user.id
      );

      // Send notifications
      await this.sendStatusChangeNotifications(updatedOrder, user.id);
    }

    // Recalculate earnings statistics if order status changed to/from completed
    // or if assigned engineer changed (to update both old and new engineer's stats)
    const shouldUpdateStats = 
      (updateOrderDto.status === OrderStatus.COMPLETED && oldStatus !== OrderStatus.COMPLETED) ||
      (oldStatus === OrderStatus.COMPLETED && updateOrderDto.status && updateOrderDto.status !== OrderStatus.COMPLETED) ||
      (updateOrderDto.assignedEngineerId && updateOrderDto.assignedEngineerId !== order.assignedEngineerId);

    if (shouldUpdateStats) {
      const completionDate = updatedOrder.completionDate || new Date();
      const engineersToUpdate = new Set<number>();

      // Add current assigned engineer
      if (updatedOrder.assignedEngineerId) {
        const engineer = await this.engineersRepository.findOne({
          where: { id: updatedOrder.assignedEngineerId },
        });
        if (engineer) {
          engineersToUpdate.add(engineer.userId);
        }
      }

      // Add old assigned engineer if it changed
      if (order.assignedEngineerId && order.assignedEngineerId !== updatedOrder.assignedEngineerId) {
        const oldEngineer = await this.engineersRepository.findOne({
          where: { id: order.assignedEngineerId },
        });
        if (oldEngineer) {
          engineersToUpdate.add(oldEngineer.userId);
        }
      }

      // Update statistics for all affected engineers
      for (const engineerUserId of engineersToUpdate) {
        try {
          await this.statisticsService.calculateMonthlyEarnings(
            engineerUserId,
            completionDate.getMonth() + 1,
            completionDate.getFullYear()
          );
          console.log(`Statistics updated for engineer ${engineerUserId} after order update`);
        } catch (error) {
          console.error(`Failed to update statistics for engineer ${engineerUserId}:`, error);
        }
      }
    }

    // Return updated order with attached files
    return this.findOne(id, user);
  }

  async assignEngineer(
    id: number,
    assignEngineerDto: AssignEngineerDto,
    user: User
  ): Promise<Order> {
    console.log('🚀 assignEngineer called:', { id, engineerId: assignEngineerDto.engineerId, userRole: user.role, userId: user.id });

    // Only admins and managers can assign engineers
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
      console.log('❌ User role not allowed:', user.role);
      throw new BadRequestException('Only admins and managers can assign engineers to orders');
    }

    console.log('✅ User role allowed, proceeding...');

    const order = await this.findOne(id, user);

    // Check if there's already an assigned engineer
    if (order.assignedEngineerId && order.assignedEngineerId !== assignEngineerDto.engineerId) {
      // Check if user wants to overwrite existing assignment
      // Additional confirmation logic can be added here
    }

    // Check if engineer exists and is active
    const engineer = await this.engineersRepository.findOne({
      where: { id: assignEngineerDto.engineerId, isActive: true },
      relations: ['user'],
    });

    console.log('🔍 Engineer lookup result:', {
      engineerId: assignEngineerDto.engineerId,
      engineerFound: !!engineer,
      engineerData: engineer ? {
        id: engineer.id,
        userId: engineer.userId,
        isActive: engineer.isActive,
        hasUser: !!engineer.user,
        user: engineer.user ? {
          id: engineer.user.id,
          email: engineer.user.email,
          isActive: engineer.user.isActive
        } : null
      } : null
    });

    if (!engineer) {
      throw new NotFoundException('Engineer not found or is inactive');
    }

    if (!engineer.user) {
      throw new NotFoundException('Engineer has no associated user');
    }

    if (!engineer.user.isActive) {
      throw new NotFoundException('Engineer user account is inactive');
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
      `Order "${order.title}" was assigned to engineer ${engineer.user.firstName} ${engineer.user.lastName}`,
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

    return this.findOne(id, user);
  }

  async remove(id: number, user: User): Promise<void> {
    console.log(`Attempting to delete order ${id} by user ${user.id} (${user.role})`);

    try {
      const order = await this.findOne(id, user);
      console.log(
        `Order found: ${order.id}, status: ${order.status}, createdBy: ${order.createdById}`
      );

      // Check permissions: Admin can delete any order, others can only delete waiting orders they created
      if (user.role !== UserRole.ADMIN) {
        // Non-admins can only delete waiting orders they created
        if (order.status !== OrderStatus.WAITING) {
          console.log(`Cannot delete order: status is ${order.status}, not WAITING`);
          throw new BadRequestException('Can only delete waiting orders');
        }
        
        if (order.createdById !== user.id) {
          console.log(`User ${user.id} cannot delete order created by ${order.createdById}`);
          throw new BadRequestException('Insufficient permissions to delete this order');
        }
      }

      console.log(
        `Deleting order ${id} with ${order.files?.length || 0} files and ${order.workReports?.length || 0} work reports`
      );

      // First, check for any other relations that might prevent deletion
      // Check for work reports
      const workReportsCount = await this.workReportsRepository.count({ where: { orderId: id } });
      console.log(`Found ${workReportsCount} work reports for order ${id}`);

      // Check for files
      const filesCount = await this.filesRepository.count({ where: { orderId: id } });
      console.log(`Found ${filesCount} files for order ${id}`);

      // Manually delete related entities first (cascade deletion)
      console.log('Deleting related files...');
      await this.filesRepository.delete({ orderId: id });

      // Get work reports before deletion to update statistics
      const workReportsToDelete = await this.workReportsRepository.find({ 
        where: { orderId: id },
        relations: ['engineer']
      });

      console.log('Deleting related work reports...');
      await this.workReportsRepository.delete({ orderId: id });

      // Update statistics for affected engineers
      if (workReportsToDelete.length > 0) {
        const affectedEngineers = new Set<number>();
        const reportDates = new Map<number, Date>();

        for (const report of workReportsToDelete) {
          if (report.engineer?.userId) {
            affectedEngineers.add(report.engineer.userId);
            reportDates.set(report.engineer.userId, report.submittedAt || new Date());
          }
        }

        // Update statistics for each affected engineer
        for (const engineerUserId of affectedEngineers) {
          const reportDate = reportDates.get(engineerUserId) || new Date();
          try {
            await this.statisticsService.calculateMonthlyEarnings(
              engineerUserId,
              reportDate.getMonth() + 1,
              reportDate.getFullYear()
            );
            console.log(`Statistics updated for engineer ${engineerUserId} after deleting work reports`);
          } catch (error) {
            console.error(`Failed to update statistics for engineer ${engineerUserId}:`, error);
          }
        }
      }

      console.log('Deleting related activity logs...');
      await this.activityLogRepository
        .createQueryBuilder()
        .delete()
        .where("metadata->>'orderId' = :orderId", { orderId: id.toString() })
        .execute();

      // Now delete the order
      console.log('Deleting order...');
      await this.ordersRepository.delete(id);
      console.log(`Order ${id} successfully deleted with all related data`);
    } catch (error) {
      console.error(`Error deleting order ${id}:`, error);
      throw error;
    }
  }

  async getOrderStats(user: User): Promise<{
    total: number;
    waiting: number;
    processing: number;
    working: number;
    review: number;
    completed: number;
    bySource: {
      manual: number;
      automatic: number;
      email: number;
      api: number;
    };
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
      bySource: {
        manual: 0,
        automatic: 0,
        email: 0,
        api: 0,
      },
    };

    stats.forEach(stat => {
      result.total += parseInt(stat.count);
      result[stat.status] = parseInt(stat.count);
    });

    // Get source statistics
    const sourceQuery = this.ordersRepository
      .createQueryBuilder('order')
      .select('order.source', 'source')
      .addSelect('COUNT(*)', 'count');

    // Apply same role-based filtering
    if (user.role === UserRole.USER) {
      sourceQuery.where('order.assignedEngineerId = :userId', { userId: user.id });
    }

    sourceQuery.groupBy('order.source');

    const sourceStats = await sourceQuery.getRawMany();

    sourceStats.forEach(stat => {
      const count = parseInt(stat.count);
      switch (stat.source) {
        case OrderSource.MANUAL:
          result.bySource.manual = count;
          break;
        case OrderSource.AUTOMATIC:
          result.bySource.automatic = count;
          break;
        case OrderSource.EMAIL:
          result.bySource.email = count;
          break;
        case OrderSource.API:
          result.bySource.api = count;
          break;
      }
    });

    return result;
  }

  private async getAutoDistributionEnabled(): Promise<boolean> {
    const setting = await this.settingsRepository.findOne({
      where: { key: SettingKey.AUTO_DISTRIBUTION_ENABLED },
    });
    return setting?.value === 'true';
  }

  private async getMaxOrdersPerEngineer(): Promise<number> {
    const setting = await this.settingsRepository.findOne({
      where: { key: SettingKey.MAX_ORDERS_PER_ENGINEER },
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
          where: { role: UserRole.ADMIN, isActive: true },
        });

        const managerUsers = await this.usersRepository.find({
          where: { role: UserRole.MANAGER, isActive: true },
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
        statuses: [OrderStatus.PROCESSING, OrderStatus.WORKING, OrderStatus.REVIEW],
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
      if (
        order.assignedById &&
        order.assignedById !== performedById &&
        !affectedUserIds.includes(order.assignedById)
      ) {
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

  /**
   * Создание отчета о выполненной работе с данными от инженера
   */
  async createWorkReport(
    orderId: number,
    engineerId: number,
    workReportData: {
      regularHours: number;
      overtimeHours: number;
      carPayment: number;
      distanceKm?: number;
      territoryType?: TerritoryType;
      photoUrl?: string;
      notes?: string;
    }
  ): Promise<WorkReport> {
    // Получаем заказ
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['organization'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Получаем инженера
    const engineer = await this.engineersRepository.findOne({
      where: { userId: engineerId },
      relations: ['user'],
    });

    if (!engineer) {
      throw new NotFoundException('Engineer not found');
    }

    // Проверяем, что инженер назначен на этот заказ
    if (order.assignedEngineerId !== engineer.id) {
      throw new ForbiddenException('You are not assigned to this order');
    }

    // Общее количество часов
    const totalHours = workReportData.regularHours + workReportData.overtimeHours;

    // Получаем ставки инженера для организации (с учётом кастомных ставок)
    let rates;
    try {
      rates = await this.calculationService.getEngineerRatesForOrganization(engineer, order.organization);
    } catch (error) {
      // Если индивидуальные ставки не установлены, используем базовые ставки инженера
      console.warn(`Using default rates for engineer ${engineer.id} and organization ${order.organizationId}:`, error.message);
      rates = {
        baseRate: engineer.baseRate || 700,
        overtimeRate: engineer.overtimeRate || engineer.baseRate || 700,
        fixedSalary: engineer.fixedSalary,
        fixedCarAmount: engineer.fixedCarAmount,
      };
    }

    // Рассчитываем оплату инженеру с учётом индивидуальных ставок
    const regularPayment = workReportData.regularHours * rates.baseRate;
    const overtimePayment = workReportData.overtimeHours * (rates.overtimeRate || rates.baseRate);
    const totalPayment = regularPayment + overtimePayment;

    // Рассчитываем оплату от организации (базовая ставка организации * коэффициент * часы)
    const organizationRegularPayment = workReportData.regularHours * order.organization.baseRate;
    const organizationOvertimePayment = workReportData.overtimeHours > 0 && order.organization.hasOvertime
      ? workReportData.overtimeHours * order.organization.baseRate * order.organization.overtimeMultiplier
      : workReportData.overtimeHours * order.organization.baseRate;
    const organizationPayment = organizationRegularPayment + organizationOvertimePayment;

    console.log('💰 Payment calculation:', {
      engineer: {
        regularHours: workReportData.regularHours,
        overtimeHours: workReportData.overtimeHours,
        baseRate: rates.baseRate,
        overtimeRate: rates.overtimeRate,
        regularPayment,
        overtimePayment,
        totalPayment
      },
      organization: {
        name: order.organization.name,
        baseRate: order.organization.baseRate,
        overtimeMultiplier: order.organization.overtimeMultiplier,
        hasOvertime: order.organization.hasOvertime,
        regularPayment: organizationRegularPayment,
        overtimePayment: organizationOvertimePayment,
        totalPayment: organizationPayment
      },
      profit: organizationPayment - totalPayment,
      carPayment: workReportData.carPayment
    });

    // Создаем отчет о работе
    const now = new Date();
    const workReport = this.workReportsRepository.create({
      order,
      engineer,
      startTime: now, // Используем текущее время как время начала
      endTime: now, // Используем текущее время как время окончания
      totalHours,
      isOvertime: workReportData.overtimeHours > 0,
      distanceKm: workReportData.distanceKm,
      territoryType: workReportData.territoryType,
      photoUrl: workReportData.photoUrl,
      notes: workReportData.notes,
      workResult: WorkResult.COMPLETED,
      calculatedAmount: totalPayment,
      carUsageAmount: workReportData.carPayment,
      organizationPayment: organizationPayment,
    });

    // Сохраняем отчет
    const savedReport = await this.workReportsRepository.save(workReport);

    // Логируем создание отчета
    await this.logActivity(
      orderId,
      ActivityType.ORDER_STATUS_CHANGED,
      `Work report created for order ${order.title} by engineer ${engineer.user.firstName} ${engineer.user.lastName}`,
      {
        workReportId: savedReport.id,
        regularHours: workReportData.regularHours,
        overtimeHours: workReportData.overtimeHours,
        totalHours,
        regularPayment,
        overtimePayment,
        totalPayment,
        carPayment: workReportData.carPayment,
      },
      engineer.userId
    );

    // Обновляем статистику заработка инженера
    const reportDate = savedReport.submittedAt || new Date();
    try {
      await this.statisticsService.calculateMonthlyEarnings(
        engineer.userId, // Используем userId, не engineer.id!
        reportDate.getMonth() + 1,
        reportDate.getFullYear()
      );
      console.log('Statistics updated for engineer', engineer.userId);
    } catch (error) {
      console.error('Failed to update statistics for engineer', engineer.userId, error);
      // Не блокируем сохранение отчета если статистика не обновилась
    }

    return savedReport;
  }

  /**
   * Получение отчетов о работе для заказа
   */
  async getWorkReports(orderId: number): Promise<WorkReport[]> {
    return this.workReportsRepository.find({
      where: { orderId },
      relations: ['engineer', 'engineer.user'],
      order: { submittedAt: 'DESC' },
    });
  }

  /**
   * Получение отчетов о работе для инженера
   */
  async getEngineerWorkReports(
    engineerId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<WorkReport[]> {
    const query = this.workReportsRepository
      .createQueryBuilder('workReport')
      .leftJoinAndSelect('workReport.order', 'order')
      .leftJoinAndSelect('workReport.engineer', 'engineer')
      .leftJoinAndSelect('engineer.user', 'user')
      .where('workReport.engineerId = :engineerId', { engineerId });

    if (startDate) {
      query.andWhere('workReport.submittedAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('workReport.submittedAt <= :endDate', { endDate });
    }

    return query.orderBy('workReport.submittedAt', 'DESC').getMany();
  }

  /**
   * Attach files to order (replace existing file associations)
   */
  private async attachFilesToOrder(orderId: number, fileIds: string[]): Promise<void> {
    console.log('\n========================================');
    console.log(`🔗 ATTACHING FILES TO ORDER ${orderId}`);
    console.log(`📋 Received file IDs:`, JSON.stringify(fileIds));
    console.log('========================================\n');

    // First, detach all existing files from this order
    const detachResult = await this.filesRepository.update({ orderId }, { order: null, orderId: null });
    console.log(`✂️  Detached ${detachResult.affected || 0} existing files from order ${orderId}`);

    // Helper function to validate UUID
    const isValidUUID = (uuid: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    };

    // Then attach the new files
    if (fileIds.length > 0) {
      const order = await this.ordersRepository.findOne({ where: { id: orderId } });
      if (!order) {
        console.error(`❌ Order ${orderId} not found!`);
        throw new NotFoundException('Order not found');
      }
      console.log(`✅ Found order: ${order.title}`);

      let attachedCount = 0;
      let skippedCount = 0;

      for (const fileId of fileIds) {
        console.log(`\n  Processing file ID: ${fileId}`);
        
        // Skip invalid UUIDs
        if (!isValidUUID(fileId)) {
          console.warn(`  ⚠️  Invalid UUID format: ${fileId}, skipping`);
          skippedCount++;
          continue;
        }

        const file = await this.filesRepository.findOne({ where: { id: fileId } });
        if (file) {
          console.log(`  📄 Found file: ${file.originalName} (${file.mimetype}, ${file.size} bytes)`);
          file.order = order;
          file.orderId = orderId;
          const savedFile = await this.filesRepository.save(file);
          console.log(`  ✅ Successfully attached file ${fileId} to order ${orderId}`);
          console.log(`  📊 Saved file orderId: ${savedFile.orderId}`);
          attachedCount++;
        } else {
          console.warn(`  ❌ File ${fileId} not found in database, skipping`);
          skippedCount++;
        }
      }

      console.log('\n========================================');
      console.log(`✅ Successfully attached: ${attachedCount} files`);
      console.log(`⚠️  Skipped: ${skippedCount} files`);
      console.log('========================================\n');
    } else {
      console.log('ℹ️  No files to attach (empty array)');
    }
  }
}
