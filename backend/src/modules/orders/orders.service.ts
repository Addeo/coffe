import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Engineer } from '../../entities/engineer.entity';
import { Organization } from '../../entities/organization.entity';
import { File } from '../../entities/file.entity';
import { Setting, SettingKey } from '../../entities/settings.entity';
import { UserActivityLog, ActivityType } from '../../entities/user-activity-log.entity';
import { StatisticsService } from '../statistics/statistics.service';
import { CalculationService } from '../расчеты/calculation.service';
import { NotificationType, NotificationPriority } from '../../entities/notification.entity';
import { OrderSource } from '../../entities/order.entity';
import { OrderStatus, TerritoryType } from '../../shared/interfaces/order.interface';
import {
  UpdateOrderDto,
  AssignEngineerDto,
  OrdersQueryDto,
  OrderStatsDto,
  EngineerOrderSummaryDto,
} from '../../shared/dtos/order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  OrderEngineerAssignment,
  AssignmentStatus,
} from '../../entities/order-engineer-assignment.entity';

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
    @InjectRepository(File)
    private readonly filesRepository: Repository<File>,
    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,
    @InjectRepository(UserActivityLog)
    private readonly activityLogRepository: Repository<UserActivityLog>,
    @InjectRepository(OrderEngineerAssignment)
    private readonly assignmentRepository: Repository<OrderEngineerAssignment>,
    private readonly notificationsService: NotificationsService,
    private readonly statisticsService: StatisticsService,
    private readonly calculationService: CalculationService
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: number): Promise<Order> {
    console.log('🔨 [OrdersService] Starting order creation:', {
      userId,
      organizationId: createOrderDto.organizationId,
      title: createOrderDto.title,
      filesCount: createOrderDto.files?.length || 0,
    });

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      console.error('❌ [OrdersService] User not found:', userId);
      throw new NotFoundException('User not found');
    }
    console.log('✅ [OrdersService] User found:', user.email);

    // Validate organization exists
    const organization = await this.organizationsRepository.findOne({
      where: { id: createOrderDto.organizationId },
    });
    if (!organization) {
      console.error('❌ [OrdersService] Organization not found:', createOrderDto.organizationId);
      throw new NotFoundException(
        `Organization with ID ${createOrderDto.organizationId} not found`
      );
    }
    console.log('✅ [OrdersService] Organization found:', organization.name);

    console.log('🏗️ [OrdersService] Creating order entity...');
    const order = this.ordersRepository.create({
      organizationId: createOrderDto.organizationId,
      title: createOrderDto.title,
      description: createOrderDto.description,
      location: createOrderDto.location,
      distanceKm: createOrderDto.distanceKm,
      territoryType: createOrderDto.territoryType,
      plannedStartDate: createOrderDto.plannedStartDate,
      createdBy: user,
      createdById: userId,
      status: OrderStatus.WAITING,
      source: createOrderDto.source || OrderSource.MANUAL,
    });

    const savedOrder = await this.ordersRepository.save(order);
    console.log('✅ [OrdersService] Order saved with ID:', savedOrder.id);

    // Attach files if provided
    if (createOrderDto.files && createOrderDto.files.length > 0) {
      console.log('📎 [OrdersService] Attaching files:', createOrderDto.files);
      await this.attachFilesToOrder(savedOrder.id, createOrderDto.files);
      console.log('✅ [OrdersService] Files attached successfully');
    } else {
      console.log('ℹ️ [OrdersService] No files to attach');
    }

    // Log order creation
    console.log('📝 [OrdersService] Logging order creation activity...');
    await this.logActivity(
      savedOrder.id,
      ActivityType.ORDER_CREATED,
      `Order "${savedOrder.title}" was created`,
      { createdById: userId },
      userId
    );

    // Check if auto-distribution is enabled and try to assign the order
    try {
      const autoDistributionEnabled = await this.getAutoDistributionEnabled();
      if (autoDistributionEnabled) {
        await this.autoAssignOrder(savedOrder, userId);
      }
    } catch (error) {
      console.error('Error during auto-assignment, continuing with order creation:', error);
      // Don't throw - order creation should succeed even if auto-assignment fails
    }

    // Return order with attached files
    console.log('📤 [OrdersService] Returning order to controller...');
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

    const order = this.ordersRepository.create({
      organizationId: createOrderDto.organizationId,
      title: createOrderDto.title,
      description: createOrderDto.description,
      location: createOrderDto.location,
      distanceKm: createOrderDto.distanceKm,
      territoryType: createOrderDto.territoryType,
      plannedStartDate: createOrderDto.plannedStartDate,
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
    // ИЗМЕНЕНИЕ: Инженер видит только свои заявки
    if (user.role === UserRole.USER) {
      const engineer = await this.engineersRepository.findOne({
        where: { userId: user.id },
      });
      if (engineer) {
        query.engineerId = engineer.id;
      } else {
        // Если у пользователя нет профиля инженера, возвращаем пустой список
        return {
          data: [],
          total: 0,
          page: query.page || 1,
          limit: query.limit || 10,
          totalPages: 0,
        };
      }
    }
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
        'files.id',
        'files.filename',
        'files.originalName',
        'files.mimetype',
        'files.size',
        'files.path',
        'files.type',
        'files.description',
        'files.uploadedById',
        'files.orderId',
        'files.uploadedAt',
        'fileUploadedBy.id',
        'fileUploadedBy.firstName',
        'fileUploadedBy.lastName',
        'fileUploadedBy.email',
      ]);

    // Apply filters based on user role
    if (user.role === UserRole.USER) {
      // Regular users can only see orders assigned to them
      // Find engineer profile for this user
      const engineer = await this.engineersRepository.findOne({
        where: { userId: user.id, isActive: true },
      });

      if (engineer) {
        // ИСПРАВЛЕНИЕ: Инженер видит заявки, на которые он назначен через assignments или assignedEngineerId
        queryBuilder
          .leftJoin('order.engineerAssignments', 'assignment')
          .andWhere(
            '(order.assignedEngineerId = :engineerId OR assignment.engineerId = :engineerId)',
            { engineerId: engineer.id }
          )
          .andWhere(
            '(assignment.status IS NULL OR assignment.status IN (:...assignmentStatuses))',
            {
              assignmentStatuses: [
                AssignmentStatus.PENDING,
                AssignmentStatus.ACCEPTED,
                AssignmentStatus.COMPLETED,
              ],
            }
          );
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
        'files.id',
        'files.filename',
        'files.originalName',
        'files.mimetype',
        'files.size',
        'files.path',
        'files.type',
        'files.description',
        'files.uploadedById',
        'files.orderId',
        'files.uploadedAt',
        'fileUploadedBy.id',
        'fileUploadedBy.firstName',
        'fileUploadedBy.lastName',
        'fileUploadedBy.email',
      ])
      .where('order.id = :id', { id })
      .getOne();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Apply role-based access control
    if (user.role === UserRole.USER) {
      // Regular users can only see orders assigned to them
      // Need to find engineer profile for this user first
      const engineerProfile = await this.engineersRepository.findOne({
        where: { userId: user.id, isActive: true },
      });

      // Проверяем через assignments или assignedEngineerId для обратной совместимости
      const assignment = await this.assignmentRepository.findOne({
        where: {
          orderId: id,
          engineerId: engineerProfile.id,
          status: In([
            AssignmentStatus.PENDING,
            AssignmentStatus.ACCEPTED,
            AssignmentStatus.COMPLETED,
          ]),
        },
      });

      if (!assignment && order.assignedEngineerId !== engineerProfile.id) {
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
      if (
        updateOrderDto.status === OrderStatus.WORKING &&
        order.status !== OrderStatus.PROCESSING
      ) {
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

    // Fix date format for MySQL DATE field (plannedStartDate should be DATE, not DATETIME)
    if (updateOrderDto.plannedStartDate) {
      const date = new Date(updateOrderDto.plannedStartDate);
      // Extract only date part (YYYY-MM-DD)
      updateOrderDto.plannedStartDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
    }

    console.log('\n🔄 UPDATE ORDER:', {
      orderId: id,
      hasFiles: updateOrderDto.files !== undefined,
      filesCount: updateOrderDto.files?.length,
      files: updateOrderDto.files,
      hasWorkData: !!(updateOrderDto.regularHours || updateOrderDto.overtimeHours),
    });

    // Если обновляются данные о работе (regularHours, overtimeHours), рассчитываем оплату
    if (updateOrderDto.regularHours !== undefined || updateOrderDto.overtimeHours !== undefined) {
      const regularHours = updateOrderDto.regularHours || 0;
      const overtimeHours = updateOrderDto.overtimeHours || 0;

      // Загружаем организацию и инженера для расчёта
      if (!order.organization) {
        order.organization = await this.organizationsRepository.findOne({
          where: { id: order.organizationId },
        });
      }

      if (order.assignedEngineerId && order.organization) {
        const engineer = await this.engineersRepository.findOne({
          where: { id: order.assignedEngineerId },
          relations: ['user'],
        });

        if (engineer) {
          // Получаем ставки инженера для организации
          let rates;
          try {
            rates = await this.calculationService.getEngineerRatesForOrganization(
              engineer,
              order.organization
            );
          } catch (error) {
            rates = {
              baseRate: engineer.baseRate || 700,
              overtimeRate: engineer.overtimeRate || engineer.baseRate || 700,
              fixedSalary: engineer.fixedSalary,
              fixedCarAmount: engineer.fixedCarAmount,
            };
          }

          // Рассчитываем оплату инженеру
          const regularPayment = regularHours * rates.baseRate;
          const overtimePayment = overtimeHours * (rates.overtimeRate || rates.baseRate);
          updateOrderDto.calculatedAmount = regularPayment + overtimePayment;

          // Рассчитываем оплату от организации
          const organizationRegularPayment = regularHours * order.organization.baseRate;
          const organizationOvertimePayment =
            overtimeHours > 0 && order.organization.hasOvertime
              ? overtimeHours * order.organization.baseRate * order.organization.overtimeMultiplier
              : overtimeHours * order.organization.baseRate;
          updateOrderDto.organizationPayment =
            organizationRegularPayment + organizationOvertimePayment;

          // Сохраняем детальную разбивку расчётов для аудита
          updateOrderDto['engineerBaseRate'] = rates.baseRate;
          updateOrderDto['engineerOvertimeRate'] = rates.overtimeRate || rates.baseRate;
          updateOrderDto['organizationBaseRate'] = order.organization.baseRate;
          updateOrderDto['organizationOvertimeMultiplier'] = order.organization.overtimeMultiplier;
          updateOrderDto['regularPayment'] = regularPayment;
          updateOrderDto['overtimePayment'] = overtimePayment;
          updateOrderDto['organizationRegularPayment'] = organizationRegularPayment;
          updateOrderDto['organizationOvertimePayment'] = organizationOvertimePayment;
          updateOrderDto['profit'] =
            updateOrderDto.organizationPayment - updateOrderDto.calculatedAmount;

          console.log('💰 Auto-calculated payments with details:', {
            regularHours,
            overtimeHours,
            engineerRates: {
              base: rates.baseRate,
              overtime: rates.overtimeRate || rates.baseRate,
            },
            organizationRates: {
              base: order.organization.baseRate,
              overtimeMultiplier: order.organization.overtimeMultiplier,
            },
            payments: {
              engineerRegular: regularPayment,
              engineerOvertime: overtimePayment,
              engineerTotal: updateOrderDto.calculatedAmount,
              organizationRegular: organizationRegularPayment,
              organizationOvertime: organizationOvertimePayment,
              organizationTotal: updateOrderDto.organizationPayment,
              carUsage: updateOrderDto.carUsageAmount || 0,
              profit: updateOrderDto['profit'],
            },
          });
        }
      }
    }

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

    // Statistics are calculated in real-time from order fields
    // No need to update cached statistics

    // Return updated order with attached files
    return this.findOne(id, user);
  }

  async assignEngineer(
    id: number,
    assignEngineerDto: AssignEngineerDto,
    user: User
  ): Promise<Order> {
    console.log('🚀 assignEngineer called:', {
      id,
      engineerId: assignEngineerDto.engineerId,
      userRole: user.role,
      userId: user.id,
    });

    // Only admins and managers can assign engineers
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
      console.log('❌ User role not allowed:', user.role);
      throw new BadRequestException('Only admins and managers can assign engineers to orders');
    }

    console.log('✅ User role allowed, proceeding...');

    const order = await this.findOne(id, user);

    // Check if engineer exists and is active
    // Try to find by engineer ID first, then by user ID
    let engineer = await this.engineersRepository.findOne({
      where: { id: assignEngineerDto.engineerId, isActive: true },
      relations: ['user'],
    });

    // If not found by engineer ID, try to find by user ID
    if (!engineer) {
      console.log('⚠️ Engineer not found by engineer ID, trying user ID...');
      engineer = await this.engineersRepository.findOne({
        where: { userId: assignEngineerDto.engineerId, isActive: true },
        relations: ['user'],
      });
    }

    console.log('🔍 Engineer lookup result:', {
      searchId: assignEngineerDto.engineerId,
      engineerFound: !!engineer,
      engineerData: engineer
        ? {
            id: engineer.id,
            userId: engineer.userId,
            isActive: engineer.isActive,
            hasUser: !!engineer.user,
            user: engineer.user
              ? {
                  id: engineer.user.id,
                  email: engineer.user.email,
                  isActive: engineer.user.isActive,
                }
              : null,
          }
        : null,
    });

    if (!engineer) {
      throw new NotFoundException(
        'Engineer not found or is inactive (checked both engineer ID and user ID)'
      );
    }

    // Check if there's already a different assigned engineer
    if (order.assignedEngineerId && order.assignedEngineerId !== engineer.id) {
      console.log(
        '⚠️ Reassigning order from engineer',
        order.assignedEngineerId,
        'to',
        engineer.id
      );
      // Check if user wants to overwrite existing assignment
      // Additional confirmation logic can be added here
    }

    if (!engineer.user) {
      throw new NotFoundException('Engineer has no associated user');
    }

    if (!engineer.user.isActive) {
      throw new NotFoundException('Engineer user account is inactive');
    }

    const oldEngineerId = order.assignedEngineerId;
    order.assignedEngineerId = engineer.id; // ← Always save the actual engineer ID from the engineer table
    order.assignedById = user.id;
    order.status = OrderStatus.ASSIGNED; // ⭐ Waiting for engineer acceptance

    await this.ordersRepository.save(order);

    // Log engineer assignment
    await this.logActivity(
      id,
      ActivityType.ORDER_ASSIGNED,
      `Order "${order.title}" was assigned to engineer ${engineer.user.firstName} ${engineer.user.lastName}`,
      {
        orderId: id,
        assignedEngineerId: engineer.id, // ← Log the actual engineer ID
        oldEngineerId,
      },
      user.id
    );

    // Send notification to engineer
    await this.notificationsService.createOrderAssignedNotification(
      id,
      order.title,
      engineer.id, // ← Send notification using actual engineer ID
      user.id
    );

    return this.findOne(id, user);
  }

  /**
   * Accept order by engineer
   * Engineer accepts the order assigned to them
   */
  async acceptOrder(orderId: number, user: User): Promise<Order> {
    console.log('✅ acceptOrder called:', {
      orderId,
      userId: user.id,
      userRole: user.role,
    });

    // Only engineers (USER role) can accept orders
    if (user.role !== UserRole.USER) {
      throw new ForbiddenException('Only engineers can accept orders');
    }

    // Find the engineer record for this user
    const engineer = await this.engineersRepository.findOne({
      where: { userId: user.id, isActive: true },
      relations: ['user'],
    });

    if (!engineer) {
      throw new NotFoundException('Engineer profile not found for this user');
    }

    // Find the order
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['organization', 'assignedEngineer', 'assignedEngineer.user', 'createdBy'],
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    // Проверяем назначение через assignments
    let assignment = await this.assignmentRepository.findOne({
      where: {
        orderId: orderId,
        engineerId: engineer.id,
        status: AssignmentStatus.PENDING,
      },
    });

    // Для обратной совместимости проверяем также assignedEngineerId
    if (!assignment && order.assignedEngineerId !== engineer.id) {
      throw new ForbiddenException('This order is not assigned to you');
    }

    // Verify order is in ASSIGNED status
    if (order.status !== OrderStatus.ASSIGNED) {
      throw new BadRequestException(
        `Order cannot be accepted in current status: ${order.status}. Expected: ${OrderStatus.ASSIGNED}`
      );
    }

    // Обновляем статус назначения
    if (assignment) {
      assignment.status = AssignmentStatus.ACCEPTED;
      assignment.acceptedAt = new Date();
      await this.assignmentRepository.save(assignment);
    }

    // Обновляем assignedEngineerId для обратной совместимости (если это первое принятие)
    if (!order.assignedEngineerId) {
      order.assignedEngineerId = engineer.id;
    }

    // Update order status to WORKING
    order.status = OrderStatus.WORKING;
    order.actualStartDate = new Date();

    await this.ordersRepository.save(order);

    // Log activity
    await this.logActivity(
      orderId,
      ActivityType.ORDER_STATUS_CHANGED,
      `Engineer ${engineer.user.firstName} ${engineer.user.lastName} accepted order "${order.title}"`,
      {
        orderId,
        engineerId: engineer.id,
        oldStatus: OrderStatus.ASSIGNED,
        newStatus: OrderStatus.WORKING,
      },
      user.id
    );

    // Send notification to order creator and admin
    if (order.createdBy) {
      await this.notificationsService.createNotification(
        order.createdById,
        NotificationType.ORDER_STATUS_CHANGED,
        'Order Accepted',
        `Engineer ${engineer.user.firstName} ${engineer.user.lastName} has accepted order "${order.title}"`,
        NotificationPriority.MEDIUM,
        {
          orderId: order.id,
          engineerId: engineer.id,
          status: OrderStatus.WORKING,
        }
      );
    }

    console.log('✅ Order accepted successfully:', {
      orderId,
      engineerId: engineer.id,
      newStatus: order.status,
    });

    return this.findOne(orderId, user);
  }

  /**
   * Назначить нескольких инженеров на заявку
   */
  async assignMultipleEngineers(
    orderId: number,
    engineerIds: number[],
    primaryEngineerId?: number,
    user?: User
  ): Promise<Order> {
    const order = await this.findOne(orderId, user || ({} as User));

    const assignments: OrderEngineerAssignment[] = [];

    for (const engineerId of engineerIds) {
      const engineer = await this.engineersRepository.findOne({
        where: { id: engineerId, isActive: true },
        relations: ['user'],
      });

      if (!engineer) {
        throw new NotFoundException(`Engineer with id ${engineerId} not found or inactive`);
      }

      // Проверяем существующее назначение
      let assignment = await this.assignmentRepository.findOne({
        where: { orderId, engineerId },
      });

      if (assignment) {
        // Если назначение существует и отклонено/отменено, обновляем
        if (
          assignment.status === AssignmentStatus.REJECTED ||
          assignment.status === AssignmentStatus.CANCELLED
        ) {
          assignment.status = AssignmentStatus.PENDING;
          assignment.acceptedAt = null;
          assignment.rejectedAt = null;
          assignment.rejectionReason = null;
          assignment.assignedById = user?.id || null;
          await this.assignmentRepository.save(assignment);
        }
      } else {
        // Создаем новое назначение
        assignment = this.assignmentRepository.create({
          orderId,
          engineerId,
          status: AssignmentStatus.PENDING,
          assignedById: user?.id || null,
          isPrimary:
            engineerId === primaryEngineerId ||
            (!order.assignedEngineerId && engineerIds.indexOf(engineerId) === 0),
        });
        assignment = await this.assignmentRepository.save(assignment);
      }

      assignments.push(assignment);

      // Отправляем уведомление инженеру
      if (engineer.user) {
        await this.notificationsService.createOrderAssignedNotification(
          orderId,
          order.title,
          engineer.id,
          user?.id || null
        );
      }
    }

    // Обновляем основной assignedEngineerId для обратной совместимости
    if (primaryEngineerId) {
      order.assignedEngineerId = primaryEngineerId;
    } else if (engineerIds.length > 0 && !order.assignedEngineerId) {
      order.assignedEngineerId = engineerIds[0];
    }

    order.assignedById = user?.id || null;
    if (order.status === OrderStatus.WAITING) {
      order.status = OrderStatus.ASSIGNED;
    }

    await this.ordersRepository.save(order);

    return this.findOne(orderId, user || ({} as User));
  }

  /**
   * Получить все назначения инженеров на заявку
   */
  async getOrderAssignments(orderId: number, user: User): Promise<OrderEngineerAssignment[]> {
    // Проверяем доступ к заявке
    await this.findOne(orderId, user);

    return this.assignmentRepository.find({
      where: { orderId },
      relations: ['engineer', 'engineer.user', 'assignedBy'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Удалить назначение инженера
   */
  async removeEngineerAssignment(orderId: number, assignmentId: number, user: User): Promise<void> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId, orderId },
      relations: ['order', 'engineer'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Проверяем доступ к заявке
    await this.findOne(orderId, user);

    // Если это основное назначение, обновляем assignedEngineerId
    if (assignment.isPrimary && assignment.order.assignedEngineerId === assignment.engineerId) {
      // Находим следующее основное назначение или обнуляем
      const nextPrimary = await this.assignmentRepository.findOne({
        where: {
          orderId,
          isPrimary: true,
          status: In([AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED]),
        },
        order: { createdAt: 'ASC' },
      });

      assignment.order.assignedEngineerId = nextPrimary?.engineerId || null;
      await this.ordersRepository.save(assignment.order);
    }

    // Удаляем назначение
    await this.assignmentRepository.remove(assignment);
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

      console.log(`Deleting order ${id} with ${order.files?.length || 0} files`);

      // Check for files
      const filesCount = await this.filesRepository.count({ where: { orderId: id } });
      console.log(`Found ${filesCount} files for order ${id}`);

      // Manually delete related entities first (cascade deletion)
      console.log('Deleting related files...');
      await this.filesRepository.delete({ orderId: id });

      // Delete related work reports
      console.log('Deleting related activity logs...');
      await this.activityLogRepository
        .createQueryBuilder()
        .delete()
        .where("JSON_EXTRACT(metadata, '$.orderId') = :orderId", { orderId: id.toString() })
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

  async getOrderStats(user: User): Promise<OrderStatsDto> {
    const queryBuilder = this.ordersRepository.createQueryBuilder('order');

    let engineerProfile: Engineer | null = null;

    // Apply role-based filtering
    if (user.role === UserRole.USER) {
      // Regular users can only see orders assigned to them
      // Find engineer profile for this user
      engineerProfile = await this.engineersRepository.findOne({
        where: { userId: user.id, isActive: true },
      });

      if (engineerProfile) {
        queryBuilder.where('order.assignedEngineerId = :engineerId', {
          engineerId: engineerProfile.id,
        });
      } else {
        // If no engineer profile found, return empty stats
        return {
          total: 0,
          waiting: 0,
          assigned: 0,
          processing: 0,
          working: 0,
          review: 0,
          completed: 0,
          paid_to_engineer: 0,
          bySource: {
            manual: 0,
            automatic: 0,
            email: 0,
            api: 0,
          },
          paymentStats: {
            totalCompleted: 0,
            receivedFromOrganization: 0,
            pendingFromOrganization: 0,
            paidToEngineer: 0,
            pendingToEngineer: 0,
          },
          engineerSummary: null,
        };
      }
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
      assigned: 0,
      processing: 0,
      working: 0,
      review: 0,
      completed: 0,
      paid_to_engineer: 0,
      bySource: {
        manual: 0,
        automatic: 0,
        email: 0,
        api: 0,
      },
      paymentStats: {
        totalCompleted: 0,
        receivedFromOrganization: 0,
        pendingFromOrganization: 0,
        paidToEngineer: 0,
        pendingToEngineer: 0,
      },
      engineerSummary: null,
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
    if (user.role === UserRole.USER && engineerProfile) {
      sourceQuery.where('order.assignedEngineerId = :engineerId', {
        engineerId: engineerProfile.id,
      });
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

    // Calculate payment statistics
    const paymentQuery = this.ordersRepository.createQueryBuilder('order');

    // Apply same role-based filtering
    if (user.role === UserRole.USER && engineerProfile) {
      paymentQuery.where('order.assignedEngineerId = :engineerId', {
        engineerId: engineerProfile.id,
      });
    }

    // Get completed orders statistics
    const completedOrdersQuery = paymentQuery.clone();
    const completedOrders = await completedOrdersQuery
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PAID_TO_ENGINEER],
      })
      .getCount();

    result.paymentStats.totalCompleted = completedOrders;

    // Get payment status statistics
    const receivedFromOrgQuery = paymentQuery.clone();
    const receivedFromOrg = await receivedFromOrgQuery
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.PAID_TO_ENGINEER],
      })
      .andWhere('order.receivedFromOrganization = :received', { received: true })
      .getCount();

    result.paymentStats.receivedFromOrganization = receivedFromOrg;
    result.paymentStats.pendingFromOrganization = completedOrders - receivedFromOrg;

    // Get paid to engineer statistics
    const paidToEngineerQuery = paymentQuery.clone();
    const paidToEngineer = await paidToEngineerQuery
      .andWhere('order.status = :status', { status: OrderStatus.PAID_TO_ENGINEER })
      .getCount();

    result.paymentStats.paidToEngineer = paidToEngineer;
    result.paymentStats.pendingToEngineer = completedOrders - paidToEngineer;

    if (engineerProfile) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const engineerOrders = await this.ordersRepository
        .createQueryBuilder('monthlyOrder')
        .where('monthlyOrder.assignedEngineerId = :engineerId', {
          engineerId: engineerProfile.id,
        })
        .andWhere(
          'COALESCE(monthlyOrder.actualStartDate, monthlyOrder.completionDate, monthlyOrder.createdAt) >= :startOfMonth',
          { startOfMonth }
        )
        .andWhere(
          'COALESCE(monthlyOrder.actualStartDate, monthlyOrder.completionDate, monthlyOrder.createdAt) < :endOfMonth',
          { endOfMonth }
        )
        .getMany();

      let workedHours = 0;
      let overtimeHours = 0;
      let earnedAmount = 0;
      let carPayments = 0;

      engineerOrders.forEach(order => {
        const regularHours = Number(order.regularHours ?? 0);
        const overtime = Number(order.overtimeHours ?? 0);
        workedHours += regularHours + overtime;
        overtimeHours += overtime;
        earnedAmount += Number(order.calculatedAmount ?? 0);
        carPayments += Number(order.carUsageAmount ?? 0);
      });

      const planHours = Number(engineerProfile.planHoursMonth ?? 0);
      const baseRate = Number(engineerProfile.baseRate ?? 0);
      const fixedSalary = Number(engineerProfile.fixedSalary ?? 0);
      const plannedCarAmount = Number(engineerProfile.fixedCarAmount ?? 0);

      const planEarnings = fixedSalary + planHours * baseRate;

      const engineerSummary: EngineerOrderSummaryDto = {
        engineerId: engineerProfile.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        planHours,
        workedHours,
        overtimeHours,
        planEarnings,
        earnedAmount,
        carPayments,
        plannedCarAmount,
      };

      result.engineerSummary = engineerSummary;
    }

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

    // Simplified: just return the engineer with the least active orders
    // TODO: Implement earnings-based distribution later with proper cross-database support
    return engineersWithCapacity.entities[0];
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
   * Complete work on order - saves work data with rates for audit
   * Supports partial and full completion
   */
  async completeWork(
    orderId: number,
    engineerId: number,
    workData: {
      regularHours: number;
      overtimeHours: number;
      carPayment: number;
      distanceKm?: number;
      territoryType?: string;
      notes?: string;
      isFullyCompleted?: boolean; // New field: true = completed, false/undefined = working
    }
  ): Promise<Order> {
    // Validate input data
    if (workData.regularHours === undefined || workData.regularHours === null) {
      throw new BadRequestException('regularHours is required');
    }
    if (workData.regularHours < 0) {
      throw new BadRequestException('regularHours cannot be negative');
    }
    if (workData.overtimeHours !== undefined && workData.overtimeHours < 0) {
      throw new BadRequestException('overtimeHours cannot be negative');
    }
    if (workData.carPayment < 0) {
      throw new BadRequestException('carPayment cannot be negative');
    }
    if (workData.distanceKm !== undefined && workData.distanceKm < 0) {
      throw new BadRequestException('distanceKm cannot be negative');
    }

    // Get order with relations
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['organization', 'assignedEngineer', 'assignedEngineer.user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check order status - must be 'working'
    if (order.status !== OrderStatus.WORKING) {
      throw new BadRequestException(
        `Order must be in 'working' status to complete work. Current status: ${order.status}`
      );
    }

    // Get engineer
    const engineer = await this.engineersRepository.findOne({
      where: { userId: engineerId },
      relations: ['user'],
    });

    if (!engineer) {
      throw new NotFoundException('Engineer not found');
    }

    // Verify this order is assigned to this engineer
    if (order.assignedEngineerId !== engineer.id) {
      throw new ForbiddenException('This order is not assigned to you');
    }

    // Get rates for this engineer-organization pair
    const rates = await this.calculationService.getEngineerRatesForOrganization(
      engineer,
      order.organization
    );

    // Calculate payments
    const totalHours = workData.regularHours + workData.overtimeHours;
    const regularPayment = workData.regularHours * rates.baseRate;
    const overtimePayment = workData.overtimeHours * (rates.overtimeRate || rates.baseRate);
    const totalPayment = regularPayment + overtimePayment;

    // Calculate organization payment
    const organizationRegularPayment = workData.regularHours * order.organization.baseRate;
    const organizationOvertimePayment = order.organization.hasOvertime
      ? workData.overtimeHours * order.organization.baseRate * order.organization.overtimeMultiplier
      : workData.overtimeHours * order.organization.baseRate;
    const organizationPayment = organizationRegularPayment + organizationOvertimePayment;

    // Update order with work data AND RATES
    order.regularHours = (order.regularHours || 0) + workData.regularHours;
    order.overtimeHours = (order.overtimeHours || 0) + workData.overtimeHours;
    order.calculatedAmount = (order.calculatedAmount || 0) + totalPayment;
    order.carUsageAmount = (order.carUsageAmount || 0) + workData.carPayment;
    order.organizationPayment = (order.organizationPayment || 0) + organizationPayment;

    // 🔥 SAVE RATES for audit
    order.engineerBaseRate = rates.baseRate;
    order.engineerOvertimeRate = rates.overtimeRate || rates.baseRate;
    order.organizationBaseRate = order.organization.baseRate;
    order.organizationOvertimeMultiplier = order.organization.overtimeMultiplier;

    // 🔥 SAVE PAYMENT BREAKDOWN for detailed reporting
    order.regularPayment = (order.regularPayment || 0) + regularPayment;
    order.overtimePayment = (order.overtimePayment || 0) + overtimePayment;
    order.organizationRegularPayment =
      (order.organizationRegularPayment || 0) + organizationRegularPayment;
    order.organizationOvertimePayment =
      (order.organizationOvertimePayment || 0) + organizationOvertimePayment;

    // Calculate profit
    const currentProfit = organizationPayment - totalPayment;
    order.profit = (order.profit || 0) + currentProfit;

    // Save additional work details
    order.distanceKm = workData.distanceKm || order.distanceKm;
    order.territoryType = (workData.territoryType as any) || order.territoryType;
    order.workNotes = workData.notes || order.workNotes;

    // Update timestamps and status
    const now = new Date();
    if (!order.actualStartDate) {
      order.actualStartDate = now;
    }

    // Update status based on isFullyCompleted flag
    if (order.status === 'working') {
      if (workData.isFullyCompleted === true) {
        // Work is fully completed - mark as completed
        order.completionDate = now;
        order.status = 'completed' as any;
        console.log('✅ Order marked as COMPLETED (isFullyCompleted = true)');
      } else {
        // Work continues - keep status as working
        console.log('🔄 Order remains in WORKING status (isFullyCompleted = false/undefined)');
      }
    }

    const savedOrder = await this.ordersRepository.save(order);

    console.log('✅ Work data saved with rates:', {
      regularHours: order.regularHours,
      overtimeHours: order.overtimeHours,
      engineerBaseRate: order.engineerBaseRate,
      engineerOvertimeRate: order.engineerOvertimeRate,
      calculatedAmount: order.calculatedAmount,
      status: order.status,
      isFullyCompleted: workData.isFullyCompleted,
    });

    // Log activity
    const activityDescription = workData.isFullyCompleted
      ? `Work fully completed for order ${order.title} by engineer ${engineer.user.firstName} ${engineer.user.lastName}`
      : `Work data saved for order ${order.title} by engineer ${engineer.user.firstName} ${engineer.user.lastName} (work continues)`;

    await this.logActivity(
      orderId,
      ActivityType.ORDER_STATUS_CHANGED,
      activityDescription,
      {
        regularHours: workData.regularHours,
        overtimeHours: workData.overtimeHours,
        totalHours,
        regularPayment,
        overtimePayment,
        totalPayment,
        carPayment: workData.carPayment,
        baseRate: rates.baseRate,
        overtimeRate: rates.overtimeRate,
        isFullyCompleted: workData.isFullyCompleted,
        newStatus: order.status,
      },
      engineerId
    );

    return savedOrder;
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
    const detachResult = await this.filesRepository.update(
      { orderId },
      { order: null, orderId: null }
    );
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
          console.log(
            `  📄 Found file: ${file.originalName} (${file.mimetype}, ${file.size} bytes)`
          );
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

  /**
   * Завершить заказ (отдельно от создания рабочей сессии)
   */
  async completeOrder(orderId: number, userId: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['workSessions'],
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    // Проверяем, что есть хотя бы одна рабочая сессия
    if (!order.workSessions || order.workSessions.length === 0) {
      throw new BadRequestException(
        'Cannot complete order without work sessions. Please create at least one work session first.'
      );
    }

    // Завершаем заказ
    order.status = OrderStatus.COMPLETED;
    order.completionDate = new Date();

    const savedOrder = await this.ordersRepository.save(order);

    console.log('✅ Order completed:', {
      orderId,
      totalSessions: order.workSessions.length,
      completionDate: order.completionDate,
    });

    // Логируем активность
    await this.logActivity(
      orderId,
      ActivityType.ORDER_STATUS_CHANGED,
      `Order "${order.title}" completed with ${order.workSessions.length} work session(s)`,
      {
        totalSessions: order.workSessions.length,
        status: OrderStatus.COMPLETED,
      },
      userId
    );

    // Отправляем уведомление
    if (order.assignedEngineerId) {
      const engineer = await this.engineersRepository.findOne({
        where: { id: order.assignedEngineerId },
        relations: ['user'],
      });

      if (engineer) {
        await this.notificationsService.createNotification(
          engineer.userId,
          NotificationType.ORDER_STATUS_CHANGED,
          `Заказ "${order.title}" успешно завершён`,
          'info',
          NotificationPriority.MEDIUM,
          orderId
        );
      }
    }

    return savedOrder;
  }
}
