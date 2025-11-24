import { DataSource } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Organization } from './entities/organization.entity';
import { Setting, SettingKey } from './entities/settings.entity';
import { Engineer } from './entities/engineer.entity';
import { EngineerType } from './shared/interfaces/order.interface';
import { Order } from './entities/order.entity';
import { OrderStatus, OrderSource, TerritoryType } from './shared/interfaces/order.interface';
import { WorkSession, WorkSessionStatus } from './entities/work-session.entity';
import { EngineerOrganizationRate } from './entities/engineer-organization-rate.entity';
import {
  SalaryPayment,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
} from './entities/salary-payment.entity';
import { Product } from './entities/product.entity';
import * as bcrypt from 'bcrypt';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

// Helper function to make API calls using Node.js http/https
async function apiCall(
  method: string,
  endpoint: string,
  token?: string,
  data?: any
): Promise<{ status: number; data: any }> {
  return new Promise(resolve => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const options: any = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, res => {
      let responseData = '';
      res.on('data', chunk => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode || 500, data: parsed });
        } catch (e) {
          resolve({
            status: res.statusCode || 500,
            data: { error: 'Invalid JSON', raw: responseData },
          });
        }
      });
    });

    req.on('error', error => {
      resolve({ status: 500, data: { error: error.message } });
    });

    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Login function
async function login(email: string, password: string) {
  const result = await apiCall('POST', '/auth/login', undefined, { email, password });
  if (result.status === 200 && result.data.access_token) {
    return result.data.access_token;
  }
  return null;
}

async function seedStepByStep() {
  console.log('🚀 Starting step-by-step database seeding with API verification...\n');

  const dataSource = new DataSource({
    type: 'sqlite',
    database: './database.sqlite',
    entities: [__dirname + '/entities/*.entity{.ts,.js}'],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✓ Database connected\n');

  const userRepo = dataSource.getRepository(User);
  const orgRepo = dataSource.getRepository(Organization);
  const engineerRepo = dataSource.getRepository(Engineer);
  const orderRepo = dataSource.getRepository(Order);
  const workSessionRepo = dataSource.getRepository(WorkSession);
  const rateRepo = dataSource.getRepository(EngineerOrganizationRate);
  const paymentRepo = dataSource.getRepository(SalaryPayment);
  const productRepo = dataSource.getRepository(Product);

  let adminToken: string | null = null;
  let createdUsers: User[] = [];
  let createdOrgs: Organization[] = [];
  let createdEngineers: Engineer[] = [];
  let createdOrders: Order[] = [];

  // ============================================
  // STEP 1: CREATE USERS
  // ============================================
  console.log('📝 STEP 1: Creating users...');
  console.log('─'.repeat(60));

  const users = [
    {
      email: 'admin@coffee.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    },
    {
      email: 'manager@coffee.com',
      password: 'manager123',
      firstName: 'Manager',
      lastName: 'User',
      role: UserRole.MANAGER,
    },
    {
      email: 'engineer1@coffee.com',
      password: 'engineer123',
      firstName: 'Иван',
      lastName: 'Петров',
      role: UserRole.USER,
    },
    {
      email: 'engineer2@coffee.com',
      password: 'engineer123',
      firstName: 'Сергей',
      lastName: 'Сидоров',
      role: UserRole.USER,
    },
    {
      email: 'engineer3@coffee.com',
      password: 'engineer123',
      firstName: 'Алексей',
      lastName: 'Иванов',
      role: UserRole.USER,
    },
  ];

  for (const userData of users) {
    let user = await userRepo.findOne({ where: { email: userData.email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      user = userRepo.create({
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        primaryRole: userData.role,
        activeRole: null,
        isActive: true,
      });
      user = await userRepo.save(user);
      console.log(`  ✓ Created user: ${userData.email} (ID: ${user.id})`);
    } else {
      console.log(`  ⊙ User already exists: ${userData.email} (ID: ${user.id})`);
    }
    createdUsers.push(user);
  }

  // Verify via API
  console.log('\n  🔍 Verifying users via API...');
  adminToken = await login('admin@coffee.com', 'admin123');
  if (adminToken) {
    const usersResult = await apiCall('GET', '/users', adminToken);
    if (usersResult.status === 200) {
      console.log(`  ✅ API verification: Found ${usersResult.data.length} users`);
    } else {
      console.log(`  ⚠️  API verification failed: ${usersResult.status}`);
    }
  } else {
    console.log('  ⚠️  Could not login as admin');
  }

  // ============================================
  // STEP 2: CREATE ORGANIZATIONS
  // ============================================
  console.log('\n🏢 STEP 2: Creating organizations...');
  console.log('─'.repeat(60));

  const organizations = [
    { name: 'Вистекс', baseRate: 900, overtimeMultiplier: 1.5, hasOvertime: true },
    { name: 'РусХолтс', baseRate: 1100, overtimeMultiplier: null, hasOvertime: false },
    { name: 'ТО Франко', baseRate: 1100, overtimeMultiplier: null, hasOvertime: false },
    { name: 'Холод Вистекс', baseRate: 1200, overtimeMultiplier: 1.5, hasOvertime: true },
    { name: 'Франко', baseRate: 1210, overtimeMultiplier: 1.5, hasOvertime: true },
    { name: 'Локальный Сервис', baseRate: 1200, overtimeMultiplier: 1.5, hasOvertime: true },
  ];

  for (const orgData of organizations) {
    let org = await orgRepo.findOne({ where: { name: orgData.name } });
    if (!org) {
      org = orgRepo.create(orgData);
      org = await orgRepo.save(org);
      console.log(`  ✓ Created organization: ${orgData.name} (ID: ${org.id})`);
    } else {
      console.log(`  ⊙ Organization already exists: ${orgData.name} (ID: ${org.id})`);
    }
    createdOrgs.push(org);
  }

  // Verify via API
  if (adminToken) {
    console.log('\n  🔍 Verifying organizations via API...');
    const orgsResult = await apiCall('GET', '/organizations', adminToken);
    if (orgsResult.status === 200) {
      console.log(`  ✅ API verification: Found ${orgsResult.data.length} organizations`);
    }
  }

  // ============================================
  // STEP 3: CREATE ENGINEERS
  // ============================================
  console.log('\n👨‍💼 STEP 3: Creating engineers...');
  console.log('─'.repeat(60));

  const engineer1User = createdUsers.find(u => u.email === 'engineer1@coffee.com')!;
  const engineer2User = createdUsers.find(u => u.email === 'engineer2@coffee.com')!;
  const engineer3User = createdUsers.find(u => u.email === 'engineer3@coffee.com')!;

  const engineers = [
    {
      userId: engineer1User.id,
      type: EngineerType.STAFF,
      baseRate: 700,
      overtimeRate: 700,
      planHoursMonth: 160,
      homeTerritoryFixedAmount: 5000,
      fixedSalary: 0,
      fixedCarAmount: 0,
    },
    {
      userId: engineer2User.id,
      type: EngineerType.CONTRACT,
      baseRate: 700,
      overtimeRate: 700,
      planHoursMonth: 0,
      homeTerritoryFixedAmount: 0,
      fixedSalary: 0,
      fixedCarAmount: 0,
    },
    {
      userId: engineer3User.id,
      type: EngineerType.STAFF,
      baseRate: 650,
      overtimeRate: 650,
      planHoursMonth: 160,
      homeTerritoryFixedAmount: 4500,
      fixedSalary: 0,
      fixedCarAmount: 0,
    },
  ];

  for (const engData of engineers) {
    let engineer = await engineerRepo.findOne({ where: { userId: engData.userId } });
    if (!engineer) {
      engineer = engineerRepo.create(engData);
      engineer = await engineerRepo.save(engineer);
      console.log(
        `  ✓ Created engineer for user ID: ${engData.userId} (Engineer ID: ${engineer.id})`
      );
    } else {
      console.log(
        `  ⊙ Engineer already exists for user ID: ${engData.userId} (Engineer ID: ${engineer.id})`
      );
    }
    createdEngineers.push(engineer);
  }

  // ============================================
  // STEP 4: CREATE ORDERS WITH CAR USAGE DATA
  // ============================================
  console.log('\n📦 STEP 4: Creating orders with car usage data...');
  console.log('─'.repeat(60));

  const managerUser = createdUsers.find(u => u.email === 'manager@coffee.com')!;

  // Create orders with different car usage scenarios
  const orderTemplates = [
    {
      title: 'Ремонт холодильника - Домашняя территория',
      description: 'Ремонт в пределах города',
      location: 'Москва, ул. Ленина, д. 10',
      distanceKm: 25, // Домашняя территория
      territoryType: TerritoryType.HOME,
      status: OrderStatus.WAITING,
      source: OrderSource.MANUAL,
      carUsageAmount: 0, // Домашняя территория - фиксированная сумма
    },
    {
      title: 'Обслуживание кондиционеров - Зона 2',
      description: 'Обслуживание на расстоянии 150 км',
      location: 'Санкт-Петербург, пр. Невский, д. 50',
      distanceKm: 150, // Зона 2 (200-250 км)
      territoryType: TerritoryType.ZONE_2,
      status: OrderStatus.ASSIGNED,
      source: OrderSource.MANUAL,
      carUsageAmount: 150 * 14, // 14 руб/км для наемных
    },
    {
      title: 'Установка оборудования - Зона 1',
      description: 'Установка на расстоянии 80 км',
      location: 'Казань, ул. Баумана, д. 30',
      distanceKm: 80,
      territoryType: TerritoryType.ZONE_1,
      status: OrderStatus.WORKING,
      source: OrderSource.AUTOMATIC,
      carUsageAmount: 80 * 14, // 1120 руб
    },
    {
      title: 'Диагностика системы - Зона 3',
      description: 'Диагностика на расстоянии 220 км',
      location: 'Екатеринбург, ул. Мира, д. 15',
      distanceKm: 220,
      territoryType: TerritoryType.ZONE_2,
      status: OrderStatus.REVIEW,
      source: OrderSource.EMAIL,
      carUsageAmount: 220 * 14, // 3080 руб
    },
    {
      title: 'Замена компрессора - Зона 3',
      description: 'Срочная замена на расстоянии 300 км',
      location: 'Новосибирск, ул. Красный проспект, д. 20',
      distanceKm: 300,
      territoryType: TerritoryType.ZONE_3,
      status: OrderStatus.COMPLETED,
      source: OrderSource.MANUAL,
      carUsageAmount: 300 * 14, // 4200 руб
    },
    {
      title: 'Профилактический осмотр - Домашняя территория',
      description: 'Осмотр в пределах города',
      location: 'Краснодар, ул. Красная, д. 5',
      distanceKm: 45,
      territoryType: TerritoryType.HOME,
      status: OrderStatus.COMPLETED,
      source: OrderSource.AUTOMATIC,
      carUsageAmount: 0, // Домашняя территория
    },
  ];

  for (let i = 0; i < orderTemplates.length; i++) {
    const template = orderTemplates[i];
    const org = createdOrgs[i % createdOrgs.length];
    const engineer =
      template.status === OrderStatus.ASSIGNED ||
      template.status === OrderStatus.WORKING ||
      template.status === OrderStatus.REVIEW ||
      template.status === OrderStatus.COMPLETED
        ? createdEngineers[i % createdEngineers.length]
        : null;

    const order = orderRepo.create({
      organizationId: org.id,
      assignedEngineerId: engineer?.id || null,
      createdById: managerUser.id,
      assignedById: engineer ? createdUsers[0].id : null,
      title: template.title,
      description: template.description,
      location: template.location,
      distanceKm: template.distanceKm,
      territoryType: template.territoryType,
      status: template.status,
      source: template.source,
      plannedStartDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      actualStartDate:
        template.status === OrderStatus.WORKING ||
        template.status === OrderStatus.REVIEW ||
        template.status === OrderStatus.COMPLETED
          ? new Date(Date.now() - (orderTemplates.length - i) * 24 * 60 * 60 * 1000)
          : null,
      completionDate:
        template.status === OrderStatus.COMPLETED
          ? new Date(Date.now() - (orderTemplates.length - i - 1) * 24 * 60 * 60 * 1000)
          : null,
      regularHours: template.status === OrderStatus.COMPLETED ? 4 + Math.random() * 4 : 0,
      overtimeHours: template.status === OrderStatus.COMPLETED ? Math.random() * 2 : 0,
      calculatedAmount: template.status === OrderStatus.COMPLETED ? 3000 + Math.random() * 2000 : 0,
      carUsageAmount: template.carUsageAmount, // ⭐ Важно: данные о расходах на машину
    });

    const savedOrder = await orderRepo.save(order);
    createdOrders.push(savedOrder);
    console.log(
      `  ✓ Created order: ${template.title} (ID: ${savedOrder.id}, Status: ${template.status}, Car: ${template.carUsageAmount}₽)`
    );
  }

  // Verify orders via API
  if (adminToken) {
    console.log('\n  🔍 Verifying orders via API...');
    const ordersResult = await apiCall('GET', '/orders', adminToken);
    if (ordersResult.status === 200) {
      const ordersWithCar = ordersResult.data.filter((o: any) => o.carUsageAmount > 0);
      console.log(`  ✅ API verification: Found ${ordersResult.data.length} orders`);
      console.log(`  ✅ Orders with car usage: ${ordersWithCar.length}`);
      if (ordersWithCar.length > 0) {
        console.log(
          `  ✅ Total car usage amount: ${ordersWithCar.reduce((sum: number, o: any) => sum + o.carUsageAmount, 0)}₽`
        );
      }
    }
  }

  // ============================================
  // STEP 5: CREATE WORK SESSIONS WITH CAR DATA
  // ============================================
  console.log('\n⏱️  STEP 5: Creating work sessions with car usage data...');
  console.log('─'.repeat(60));

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  let totalCarAmount = 0;

  for (const order of createdOrders.filter(
    o => o.status === OrderStatus.WORKING || o.status === OrderStatus.COMPLETED
  )) {
    if (!order.assignedEngineerId) continue;

    const engineer = createdEngineers.find(e => e.id === order.assignedEngineerId);
    if (!engineer) continue;

    const org = createdOrgs.find(o => o.id === order.organizationId);
    if (!org) continue;

    const workDate = new Date(currentYear, currentMonth - 1, Math.floor(Math.random() * 28) + 1);
    const regularHours = order.regularHours || 4 + Math.random() * 4;
    const overtimeHours = order.overtimeHours || Math.random() * 2;
    const carUsageAmount = order.carUsageAmount || 0;

    const session = workSessionRepo.create({
      orderId: order.id,
      engineerId: engineer.id,
      workDate: workDate,
      regularHours: regularHours,
      overtimeHours: overtimeHours,
      engineerBaseRate: engineer.baseRate,
      engineerOvertimeRate: engineer.overtimeRate,
      organizationBaseRate: org.baseRate,
      organizationOvertimeMultiplier: org.overtimeMultiplier,
      calculatedAmount:
        regularHours * engineer.baseRate +
        overtimeHours * (engineer.overtimeRate || engineer.baseRate),
      carUsageAmount: carUsageAmount, // ⭐ Важно: расходы на машину
      organizationPayment:
        regularHours * org.baseRate + overtimeHours * org.baseRate * (org.overtimeMultiplier || 1),
      regularPayment: regularHours * engineer.baseRate,
      overtimePayment: overtimeHours * (engineer.overtimeRate || engineer.baseRate),
      organizationRegularPayment: regularHours * org.baseRate,
      organizationOvertimePayment: overtimeHours * org.baseRate * (org.overtimeMultiplier || 1),
      profit: 0,
      distanceKm: order.distanceKm,
      territoryType: order.territoryType,
      status: WorkSessionStatus.COMPLETED,
      canBeInvoiced: true,
    });

    session.profit =
      session.organizationPayment - session.calculatedAmount - session.carUsageAmount;
    totalCarAmount += carUsageAmount;

    await workSessionRepo.save(session);
    console.log(
      `  ✓ Created work session for order ${order.id} (Car: ${carUsageAmount}₽, Distance: ${order.distanceKm}km)`
    );
  }

  console.log(`\n  📊 Total car usage amount in sessions: ${totalCarAmount}₽`);

  // ============================================
  // STEP 6: VERIFY CAR PAYMENT STATISTICS
  // ============================================
  console.log('\n🚗 STEP 6: Verifying car payment statistics via API...');
  console.log('─'.repeat(60));

  if (adminToken) {
    const carStatsResult = await apiCall(
      'GET',
      `/statistics/car-payment-status?year=${currentYear}&month=${currentMonth}`,
      adminToken
    );

    if (carStatsResult.status === 200) {
      const stats = carStatsResult.data;
      console.log('  ✅ Car payment statistics retrieved successfully!');
      console.log(`  📊 Total car amount: ${stats.totalCarAmount || 0}₽`);
      console.log(`  📊 Paid car amount: ${stats.paidCarAmount || 0}₽`);
      console.log(`  📊 Pending car amount: ${stats.pendingCarAmount || 0}₽`);
      console.log(`  📊 Payment status: ${stats.paymentStatus || 0}%`);

      if (stats.organizationBreakdown && stats.organizationBreakdown.length > 0) {
        console.log(`  📊 Organizations with car payments: ${stats.organizationBreakdown.length}`);
        stats.organizationBreakdown.forEach((org: any, idx: number) => {
          console.log(`    ${idx + 1}. ${org.organizationName}: ${org.totalCarAmount}₽`);
        });
      }

      if (stats.engineerBreakdown && stats.engineerBreakdown.length > 0) {
        console.log(`  📊 Engineers with car payments: ${stats.engineerBreakdown.length}`);
        stats.engineerBreakdown.forEach((eng: any, idx: number) => {
          console.log(`    ${idx + 1}. ${eng.engineerName}: ${eng.totalCarAmount}₽`);
        });
      }

      if (stats.totalCarAmount === 0) {
        console.log('  ⚠️  WARNING: No car payment data found! This might indicate a problem.');
      }
    } else {
      console.log(`  ❌ Failed to get car payment statistics: ${carStatsResult.status}`);
      console.log(`  Error: ${JSON.stringify(carStatsResult.data)}`);
    }
  } else {
    console.log('  ⚠️  Cannot verify - admin token not available');
  }

  // ============================================
  // STEP 7: VERIFY GENERAL STATISTICS
  // ============================================
  console.log('\n📊 STEP 7: Verifying general statistics via API...');
  console.log('─'.repeat(60));

  if (adminToken) {
    const statsResult = await apiCall('GET', '/statistics', adminToken);
    if (statsResult.status === 200) {
      console.log('  ✅ General statistics retrieved successfully!');
      const stats = statsResult.data;
      console.log(`  📊 Total orders: ${stats.totalOrders || 0}`);
      console.log(`  📊 Total earnings: ${stats.totalEarnings || 0}₽`);
      console.log(`  📊 Car usage amount: ${stats.carUsageAmount || 0}₽`);
      console.log(`  📊 Organization payments: ${stats.organizationPayments || 0}₽`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ Step-by-step seeding completed!');
  console.log('='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`  Users: ${createdUsers.length}`);
  console.log(`  Organizations: ${createdOrgs.length}`);
  console.log(`  Engineers: ${createdEngineers.length}`);
  console.log(`  Orders: ${createdOrders.length}`);
  console.log(`  Work Sessions: ${await workSessionRepo.count()}`);
  console.log(`  Total Car Usage Amount: ${totalCarAmount}₽`);
  console.log(`\n🔑 Test Credentials:`);
  console.log(`  Admin: admin@coffee.com / admin123`);
  console.log(`  Manager: manager@coffee.com / manager123`);
  console.log(`  Engineer 1: engineer1@coffee.com / engineer123`);
  console.log(`  Engineer 2: engineer2@coffee.com / engineer123`);
  console.log(`  Engineer 3: engineer3@coffee.com / engineer123`);

  await dataSource.destroy();
}

seedStepByStep().catch(error => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
