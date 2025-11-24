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

async function seedComprehensive() {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: './database.sqlite',
    entities: [__dirname + '/entities/*.entity{.ts,.js}'],
    synchronize: false, // Don't auto-sync, we'll use migrations
  });

  await dataSource.initialize();
  console.log('✓ Database connected');

  const userRepo = dataSource.getRepository(User);
  const orgRepo = dataSource.getRepository(Organization);
  const settingsRepo = dataSource.getRepository(Setting);
  const engineerRepo = dataSource.getRepository(Engineer);
  const orderRepo = dataSource.getRepository(Order);
  const workSessionRepo = dataSource.getRepository(WorkSession);
  const rateRepo = dataSource.getRepository(EngineerOrganizationRate);
  const paymentRepo = dataSource.getRepository(SalaryPayment);
  const productRepo = dataSource.getRepository(Product);

  // ============================================
  // 1. CREATE USERS
  // ============================================
  console.log('\n📝 Creating users...');

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
    {
      email: 'manager2@coffee.com',
      password: 'manager123',
      firstName: 'Мария',
      lastName: 'Козлова',
      role: UserRole.MANAGER,
    },
  ];

  const createdUsers: User[] = [];

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
      console.log(`  ✓ Created user: ${userData.email}`);
    } else {
      console.log(`  ⊙ User already exists: ${userData.email}`);
    }
    createdUsers.push(user);
  }

  const adminUser = createdUsers.find(u => u.email === 'admin@coffee.com')!;
  const managerUser = createdUsers.find(u => u.email === 'manager@coffee.com')!;
  const engineer1User = createdUsers.find(u => u.email === 'engineer1@coffee.com')!;
  const engineer2User = createdUsers.find(u => u.email === 'engineer2@coffee.com')!;
  const engineer3User = createdUsers.find(u => u.email === 'engineer3@coffee.com')!;

  // ============================================
  // 2. CREATE ORGANIZATIONS
  // ============================================
  console.log('\n🏢 Creating organizations...');

  const organizations = [
    { name: 'Вистекс', baseRate: 900, overtimeMultiplier: 1.5, hasOvertime: true },
    { name: 'РусХолтс', baseRate: 1100, overtimeMultiplier: null, hasOvertime: false },
    { name: 'ТО Франко', baseRate: 1100, overtimeMultiplier: null, hasOvertime: false },
    { name: 'Холод Вистекс', baseRate: 1200, overtimeMultiplier: 1.5, hasOvertime: true },
    { name: 'Франко', baseRate: 1210, overtimeMultiplier: 1.5, hasOvertime: true },
    { name: 'Локальный Сервис', baseRate: 1200, overtimeMultiplier: 1.5, hasOvertime: true },
  ];

  const createdOrgs: Organization[] = [];

  for (const orgData of organizations) {
    let org = await orgRepo.findOne({ where: { name: orgData.name } });
    if (!org) {
      org = orgRepo.create(orgData);
      org = await orgRepo.save(org);
      console.log(`  ✓ Created organization: ${orgData.name}`);
    } else {
      console.log(`  ⊙ Organization already exists: ${orgData.name}`);
    }
    createdOrgs.push(org);
  }

  // ============================================
  // 3. CREATE ENGINEERS
  // ============================================
  console.log('\n👨‍💼 Creating engineers...');

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

  const createdEngineers: Engineer[] = [];

  for (const engData of engineers) {
    let engineer = await engineerRepo.findOne({ where: { userId: engData.userId } });
    if (!engineer) {
      engineer = engineerRepo.create(engData);
      engineer = await engineerRepo.save(engineer);
      console.log(`  ✓ Created engineer for user ID: ${engData.userId}`);
    } else {
      console.log(`  ⊙ Engineer already exists for user ID: ${engData.userId}`);
    }
    createdEngineers.push(engineer);
  }

  // ============================================
  // 4. CREATE ENGINEER-ORGANIZATION RATES
  // ============================================
  console.log('\n💰 Creating engineer-organization rates...');

  for (const engineer of createdEngineers) {
    for (const org of createdOrgs.slice(0, 3)) {
      // Create custom rates for first 3 organizations
      let rate = await rateRepo.findOne({
        where: { engineerId: engineer.id, organizationId: org.id },
      });

      if (!rate) {
        rate = rateRepo.create({
          engineerId: engineer.id,
          organizationId: org.id,
          customBaseRate: org.baseRate + 50, // Slightly higher than org base
          customOvertimeRate: org.hasOvertime
            ? (org.baseRate + 50) * (org.overtimeMultiplier || 1.5)
            : null,
          isActive: true,
        });
        rate = await rateRepo.save(rate);
        console.log(`  ✓ Created rate for engineer ${engineer.id} and org ${org.name}`);
      }
    }
  }

  // ============================================
  // 5. CREATE ORDERS
  // ============================================
  console.log('\n📦 Creating orders...');

  const orderTemplates = [
    {
      title: 'Ремонт холодильника в офисе',
      description: 'Требуется ремонт холодильного оборудования',
      location: 'Москва, ул. Ленина, д. 10',
      distanceKm: 25,
      territoryType: TerritoryType.HOME,
      status: OrderStatus.WAITING,
      source: OrderSource.MANUAL,
    },
    {
      title: 'Обслуживание кондиционеров',
      description: 'Плановое обслуживание системы кондиционирования',
      location: 'Санкт-Петербург, пр. Невский, д. 50',
      distanceKm: 150,
      territoryType: TerritoryType.ZONE_2,
      status: OrderStatus.ASSIGNED,
      source: OrderSource.MANUAL,
    },
    {
      title: 'Установка нового оборудования',
      description: 'Установка холодильной камеры',
      location: 'Казань, ул. Баумана, д. 30',
      distanceKm: 80,
      territoryType: TerritoryType.ZONE_1,
      status: OrderStatus.WORKING,
      source: OrderSource.AUTOMATIC,
    },
    {
      title: 'Диагностика системы охлаждения',
      description: 'Проверка работоспособности системы',
      location: 'Екатеринбург, ул. Мира, д. 15',
      distanceKm: 220,
      territoryType: TerritoryType.ZONE_2,
      status: OrderStatus.REVIEW,
      source: OrderSource.EMAIL,
    },
    {
      title: 'Замена компрессора',
      description: 'Срочная замена вышедшего из строя компрессора',
      location: 'Новосибирск, ул. Красный проспект, д. 20',
      distanceKm: 300,
      territoryType: TerritoryType.ZONE_3,
      status: OrderStatus.COMPLETED,
      source: OrderSource.MANUAL,
    },
    {
      title: 'Профилактический осмотр',
      description: 'Регулярный осмотр оборудования',
      location: 'Краснодар, ул. Красная, д. 5',
      distanceKm: 45,
      territoryType: TerritoryType.HOME,
      status: OrderStatus.PROCESSING,
      source: OrderSource.AUTOMATIC,
    },
  ];

  const createdOrders: Order[] = [];

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
      assignedById: engineer ? adminUser.id : null,
      title: template.title,
      description: template.description,
      location: template.location,
      distanceKm: template.distanceKm,
      territoryType: template.territoryType,
      status: template.status,
      source: template.source,
      plannedStartDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000), // Spread over days
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
      carUsageAmount: template.status === OrderStatus.COMPLETED ? template.distanceKm * 14 : 0,
    });

    const savedOrder = await orderRepo.save(order);
    createdOrders.push(savedOrder);
    console.log(`  ✓ Created order: ${template.title} (${template.status})`);
  }

  // ============================================
  // 6. CREATE WORK SESSIONS
  // ============================================
  console.log('\n⏱️  Creating work sessions...');

  for (const order of createdOrders.filter(
    o => o.status === OrderStatus.WORKING || o.status === OrderStatus.COMPLETED
  )) {
    if (!order.assignedEngineerId) continue;

    const engineer = createdEngineers.find(e => e.id === order.assignedEngineerId);
    if (!engineer) continue;

    const org = createdOrgs.find(o => o.id === order.organizationId);
    if (!org) continue;

    const workDate = order.actualStartDate || new Date();
    const regularHours = order.regularHours || 4 + Math.random() * 4;
    const overtimeHours = order.overtimeHours || Math.random() * 2;

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
      carUsageAmount: order.distanceKm ? order.distanceKm * 14 : 0,
      organizationPayment:
        regularHours * org.baseRate + overtimeHours * org.baseRate * (org.overtimeMultiplier || 1),
      regularPayment: regularHours * engineer.baseRate,
      overtimePayment: overtimeHours * (engineer.overtimeRate || engineer.baseRate),
      organizationRegularPayment: regularHours * org.baseRate,
      organizationOvertimePayment: overtimeHours * org.baseRate * (org.overtimeMultiplier || 1),
      profit: 0, // Will be calculated
      distanceKm: order.distanceKm,
      territoryType: order.territoryType,
      status: WorkSessionStatus.COMPLETED,
      canBeInvoiced: true,
    });

    // Calculate profit
    session.profit =
      session.organizationPayment - session.calculatedAmount - session.carUsageAmount;

    await workSessionRepo.save(session);
    console.log(`  ✓ Created work session for order ${order.id}`);
  }

  // ============================================
  // 7. CREATE SALARY PAYMENTS
  // ============================================
  console.log('\n💵 Creating salary payments...');

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  for (const engineer of createdEngineers) {
    // Create advance payment
    const advance = paymentRepo.create({
      engineerId: engineer.id,
      salaryCalculationId: null,
      month: currentMonth,
      year: currentYear,
      amount: 20000,
      type: PaymentType.ADVANCE,
      method: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.COMPLETED,
      paymentDate: new Date(currentYear, currentMonth - 1, 15),
      notes: 'Аванс за текущий месяц',
      paidById: adminUser.id,
    });
    await paymentRepo.save(advance);
    console.log(`  ✓ Created advance payment for engineer ${engineer.id}`);

    // Create regular payment for previous month
    const regular = paymentRepo.create({
      engineerId: engineer.id,
      salaryCalculationId: null,
      month: currentMonth === 1 ? 12 : currentMonth - 1,
      year: currentMonth === 1 ? currentYear - 1 : currentYear,
      amount: 50000 + Math.random() * 20000,
      type: PaymentType.REGULAR,
      method: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.COMPLETED,
      paymentDate: new Date(currentYear, currentMonth - 1, 5),
      notes: 'Зарплата за предыдущий месяц',
      paidById: adminUser.id,
    });
    await paymentRepo.save(regular);
    console.log(`  ✓ Created regular payment for engineer ${engineer.id}`);
  }

  // ============================================
  // 8. CREATE PRODUCTS
  // ============================================
  console.log('\n📦 Creating products...');

  const products = [
    {
      name: 'Компрессор холодильный',
      description: 'Компрессор для холодильного оборудования',
      category: 'Комплектующие',
      price: 15000,
      stock: 10,
      isActive: true,
    },
    {
      name: 'Фреон R134a',
      description: 'Хладагент для кондиционеров',
      category: 'Расходные материалы',
      price: 2500,
      stock: 50,
      isActive: true,
    },
    {
      name: 'Фильтр-осушитель',
      description: 'Фильтр для системы охлаждения',
      category: 'Комплектующие',
      price: 3500,
      stock: 20,
      isActive: true,
    },
    {
      name: 'Термостат',
      description: 'Регулятор температуры',
      category: 'Комплектующие',
      price: 4500,
      stock: 15,
      isActive: true,
    },
  ];

  for (const productData of products) {
    let product = await productRepo.findOne({ where: { name: productData.name } });
    if (!product) {
      product = productRepo.create(productData);
      product = await productRepo.save(product);
      console.log(`  ✓ Created product: ${productData.name}`);
    } else {
      console.log(`  ⊙ Product already exists: ${productData.name}`);
    }
  }

  // ============================================
  // 9. CREATE SETTINGS
  // ============================================
  console.log('\n⚙️  Creating settings...');

  const settings = [
    {
      key: SettingKey.AUTO_DISTRIBUTION_ENABLED,
      value: 'false',
      description: 'Enable automatic order distribution',
    },
    {
      key: SettingKey.MAX_ORDERS_PER_ENGINEER,
      value: '10',
      description: 'Maximum orders per engineer',
    },
  ];

  for (const settingData of settings) {
    let setting = await settingsRepo.findOne({ where: { key: settingData.key } });
    if (!setting) {
      setting = settingsRepo.create(settingData);
      setting = await settingsRepo.save(setting);
      console.log(`  ✓ Created setting: ${settingData.key}`);
    } else {
      console.log(`  ⊙ Setting already exists: ${settingData.key}`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ Comprehensive seed completed!');
  console.log('='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`  Users: ${createdUsers.length}`);
  console.log(`  Organizations: ${createdOrgs.length}`);
  console.log(`  Engineers: ${createdEngineers.length}`);
  console.log(`  Orders: ${createdOrders.length}`);
  console.log(`  Work Sessions: ${await workSessionRepo.count()}`);
  console.log(`  Engineer-Organization Rates: ${await rateRepo.count()}`);
  console.log(`  Salary Payments: ${await paymentRepo.count()}`);
  console.log(`  Products: ${await productRepo.count()}`);
  console.log(`  Settings: ${await settingsRepo.count()}`);

  console.log(`\n🔑 Test Credentials:`);
  console.log(`  Admin: admin@coffee.com / admin123`);
  console.log(`  Manager: manager@coffee.com / manager123`);
  console.log(`  Engineer 1: engineer1@coffee.com / engineer123`);
  console.log(`  Engineer 2: engineer2@coffee.com / engineer123`);
  console.log(`  Engineer 3: engineer3@coffee.com / engineer123`);

  await dataSource.destroy();
}

seedComprehensive().catch(error => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
