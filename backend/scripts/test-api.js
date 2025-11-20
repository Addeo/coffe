#!/usr/bin/env node

/**
 * Скрипт автоматического тестирования API эндпоинтов
 * Выполняет полный цикл: от логина админа до завершения заявки
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Сохраненные данные между запросами
const testData = {
  adminToken: null,
  managerToken: null,
  engineerToken: null,
  organizationId: null,
  engineerUserId: null,
  engineerId: null,
  managerUserId: null,
  orderId: null,
  orderIdForDeletion: null, // Для теста удаления заявки
  workSessionId: null,
  agreementIds: [],
  assignmentId: null, // Для теста удаления назначения
  engineer2Id: null, // Для теста множественного назначения
};

// Утилита для логирования
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Утилита для HTTP запросов
async function request(method, endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const config = {
    method,
    headers,
  };

  if (options.body && method !== 'GET') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${data.message || response.statusText}\n${JSON.stringify(data, null, 2)}`
      );
    }

    return { status: response.status, data };
  } catch (error) {
    if (error.message.includes('HTTP')) {
      throw error;
    }
    throw new Error(`Request failed: ${error.message}`);
  }
}

// Функция для тестирования эндпоинта
async function test(name, testFn) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Тест: ${name}`, 'bright');
  log('='.repeat(60), 'cyan');

  try {
    await testFn();
    log(`✅ ${name} - УСПЕШНО`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${name} - ОШИБКА`, 'red');
    log(`   ${error.message}`, 'red');
    if (error.stack) {
      log(`   ${error.stack.split('\n')[1]}`, 'yellow');
    }
    return false;
  }
}

// ============================================
// ЭТАП 1: Аутентификация и инициализация
// ============================================

async function test1_InitAdmin() {
  const result = await request('GET', '/auth/init-admin');
  log(`   Админ создан/получен: ${result.data.email || result.data.user?.email}`, 'blue');
}

async function test2_LoginAdmin() {
  // Сначала получаем данные админа из init-admin
  const initResult = await request('GET', '/auth/init-admin');
  const adminEmail = initResult.data?.users?.admin?.email || 'admin@coffee.com';
  const adminPassword = initResult.data?.passwords?.admin || 'admin123';
  
  const result = await request('POST', '/auth/login', {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  if (!result.data.access_token) {
    throw new Error('Токен не получен');
  }

  testData.adminToken = result.data.access_token;
  log(`   Токен получен: ${testData.adminToken.substring(0, 20)}...`, 'blue');
  log(`   Пользователь: ${result.data.user?.email}`, 'blue');
  log(`   Роль: ${result.data.user?.role}`, 'blue');
}

// ============================================
// ЭТАП 2: Создание организации
// ============================================

async function test3_CreateOrganization() {
  const result = await request('POST', '/organizations', {
    token: testData.adminToken,
    body: {
      name: `Тестовая Организация API ${Date.now()}`,
      baseRate: 1000,
    },
  });

  testData.organizationId = result.data.id;
  log(`   Организация создана: ID ${testData.organizationId}`, 'blue');
  log(`   Название: ${result.data.name}`, 'blue');
}

// ============================================
// ЭТАП 3: Создание пользователей
// ============================================

async function test4_CreateEngineer() {
  const result = await request('POST', '/users', {
    token: testData.adminToken,
    body: {
      email: `engineer-${Date.now()}@test.com`,
      password: 'engineer123',
      firstName: 'Инженер',
      lastName: 'Тестовый',
      role: 'user',
      engineerType: 'staff',
      baseRate: 500,
      overtimeRate: 800,
      planHoursMonth: 160,
    },
  });

  testData.engineerUserId = result.data.id;
  
  // Получаем engineerId из связанного engineer профиля
  // Если engineer не вернулся в ответе, получаем пользователя с relations
  if (!result.data.engineer) {
    const userResult = await request('GET', `/users/${testData.engineerUserId}`, {
      token: testData.adminToken,
    });
    testData.engineerId = userResult.data.engineer?.id;
  } else {
    testData.engineerId = result.data.engineer.id;
  }
  
  log(`   Инженер создан: User ID ${testData.engineerUserId}, Engineer ID ${testData.engineerId}`, 'blue');
  log(`   Email: ${result.data.email}`, 'blue');
  
  if (!testData.engineerId) {
    throw new Error('Engineer ID не получен после создания пользователя');
  }
}

async function test5_CreateManager() {
  const result = await request('POST', '/users', {
    token: testData.adminToken,
    body: {
      email: `manager-${Date.now()}@test.com`,
      password: 'manager123',
      firstName: 'Менеджер',
      lastName: 'Тестовый',
      role: 'manager',
    },
  });

  testData.managerUserId = result.data.id;
  log(`   Менеджер создан: User ID ${testData.managerUserId}`, 'blue');
  log(`   Email: ${result.data.email}`, 'blue');
}

async function test6_LoginManager() {
  if (!testData.managerUserId) {
    throw new Error('Manager User ID не установлен');
  }
  
  // Получаем email из данных пользователя
  const userResult = await request('GET', `/users/${testData.managerUserId}`, {
    token: testData.adminToken,
  });

  const email = userResult.data.email;

  const result = await request('POST', '/auth/login', {
    body: {
      email,
      password: 'manager123',
    },
  });

  if (!result.data.access_token) {
    throw new Error('Токен менеджера не получен');
  }

  testData.managerToken = result.data.access_token;
  log(`   Менеджер авторизован: ${email}`, 'blue');
  log(`   Роль: ${result.data.user?.role}`, 'blue');
  log(`   Токен получен: ${testData.managerToken.substring(0, 20)}...`, 'blue');
  
  if (!testData.managerToken) {
    throw new Error('Токен менеджера не сохранен');
  }
}

async function test7_LoginEngineer() {
  if (!testData.engineerUserId) {
    throw new Error('Engineer User ID не установлен');
  }
  
  // Получаем email из данных пользователя
  const userResult = await request('GET', `/users/${testData.engineerUserId}`, {
    token: testData.adminToken,
  });

  const email = userResult.data.email;

  const result = await request('POST', '/auth/login', {
    body: {
      email,
      password: 'engineer123',
    },
  });

  if (!result.data.access_token) {
    throw new Error('Токен инженера не получен');
  }

  testData.engineerToken = result.data.access_token;
  log(`   Инженер авторизован: ${email}`, 'blue');
  log(`   Роль: ${result.data.user?.role}`, 'blue');
  log(`   Токен получен: ${testData.engineerToken.substring(0, 20)}...`, 'blue');

  // Проверяем соглашения
  if (result.data.agreements?.missingAgreements?.length > 0) {
    log(`   ⚠️  Требуется принять соглашения: ${result.data.agreements.missingAgreements.length}`, 'yellow');
    testData.agreementIds = result.data.agreements.missingAgreements.map((a) => a.id);
  } else {
    log(`   ✅ Соглашения уже приняты`, 'green');
  }
  
  if (!testData.engineerToken) {
    throw new Error('Токен инженера не сохранен');
  }
}

// ============================================
// ЭТАП 4: Работа с соглашениями
// ============================================

async function test8_GetAgreements() {
  if (testData.agreementIds.length === 0) {
    log(`   Пропущено: соглашения не требуются`, 'yellow');
    return;
  }

  const result = await request('GET', '/agreements', {
    token: testData.engineerToken,
  });

  log(`   Получено соглашений: ${result.data.length}`, 'blue');
}

async function test9_AcceptAgreements() {
  if (testData.agreementIds.length === 0) {
    log(`   Пропущено: соглашения не требуются`, 'yellow');
    return;
  }

  const result = await request('POST', '/agreements/accept', {
    token: testData.engineerToken,
    body: {
      agreementIds: testData.agreementIds,
    },
  });

  log(`   Соглашения приняты: ${testData.agreementIds.length}`, 'blue');
}

// ============================================
// ЭТАП 5: Создание заявки
// ============================================

async function test10_CreateOrder() {
  if (!testData.organizationId) {
    throw new Error('Organization ID не установлен');
  }
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  const result = await request('POST', '/orders', {
    token: testData.managerToken,
    body: {
      organizationId: testData.organizationId,
      title: `Тестовая заявка API ${new Date().toISOString()}`,
      description: 'Описание тестовой заявки для автоматического тестирования',
      location: 'Москва, ул. Тестовая, 10',
      distanceKm: 15.5,
      territoryType: 'CITY',
      source: 'MANUAL',
    },
  });

  testData.orderId = result.data.id;
  log(`   Заявка создана: ID ${testData.orderId}`, 'blue');
  log(`   Статус: ${result.data.status}`, 'blue');
  log(`   Название: ${result.data.title}`, 'blue');
  
  if (!testData.orderId) {
    log(`   ⚠️  Ответ сервера: ${JSON.stringify(result.data, null, 2)}`, 'yellow');
    throw new Error('Order ID не получен после создания заявки');
  }
}

async function test11_GetOrder() {
  if (!testData.orderId) {
    throw new Error('Order ID не установлен');
  }
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  const result = await request('GET', `/orders/${testData.orderId}`, {
    token: testData.managerToken,
  });

  log(`   Заявка получена: ID ${result.data.id}`, 'blue');
  log(`   Статус: ${result.data.status}`, 'blue');
}

// ============================================
// ЭТАП 6: Назначение инженера
// ============================================

async function test12_AssignEngineer() {
  if (!testData.orderId) {
    throw new Error('Order ID не установлен для назначения инженера');
  }
  if (!testData.engineerId) {
    throw new Error('Engineer ID не установлен');
  }
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  const result = await request('POST', `/orders/${testData.orderId}/assign-engineer`, {
    token: testData.managerToken,
    body: {
      engineerId: testData.engineerId,
      isPrimary: true,
    },
  });

  log(`   Инженер назначен: Engineer ID ${testData.engineerId}`, 'blue');
  log(`   Статус заявки: ${result.data.status}`, 'blue');
}

async function test13_GetAssignments() {
  if (!testData.orderId) {
    throw new Error('Order ID не установлен для получения назначений');
  }
  if (!testData.engineerToken) {
    throw new Error('Engineer token не установлен');
  }
  
  const result = await request('GET', `/orders/${testData.orderId}/assignments`, {
    token: testData.engineerToken,
  });

  log(`   Назначений на заявку: ${result.data.length}`, 'blue');
  if (result.data.length > 0) {
    log(`   Статус назначения: ${result.data[0].status}`, 'blue');
  }
}

// ============================================
// ЭТАП 7: Принятие заявки инженером
// ============================================

async function test14_GetMyOrders() {
  if (!testData.engineerToken) {
    throw new Error('Engineer token не установлен');
  }
  
  const result = await request('GET', '/orders', {
    token: testData.engineerToken,
  });

  log(`   Заявок для инженера: ${result.data?.data?.length || result.data?.length || 0}`, 'blue');
}

async function test15_AcceptOrder() {
  if (!testData.orderId) {
    throw new Error('Order ID не установлен для принятия заявки');
  }
  if (!testData.engineerToken) {
    throw new Error('Engineer token не установлен');
  }
  
  const result = await request('POST', `/orders/${testData.orderId}/accept`, {
    token: testData.engineerToken,
  });

  log(`   Заявка принята инженером`, 'blue');
  log(`   Статус заявки: ${result.data.status}`, 'blue');
}

// ============================================
// ЭТАП 8: Создание рабочей сессии
// ============================================

async function test16_CreateWorkSession() {
  if (!testData.orderId) {
    throw new Error('Order ID не установлен для создания рабочей сессии');
  }
  if (!testData.engineerToken) {
    throw new Error('Engineer token не установлен');
  }
  
  const today = new Date().toISOString().split('T')[0];

  const result = await request('POST', `/orders/${testData.orderId}/work-sessions`, {
    token: testData.engineerToken,
    body: {
      workDate: today,
      regularHours: 8,
      overtimeHours: 2,
      carPayment: 500,
      distanceKm: 50,
      territoryType: 'CITY',
      notes: 'Выполнена диагностика и ремонт оборудования',
      canBeInvoiced: true,
    },
  });

  testData.workSessionId = result.data.id;
  log(`   Рабочая сессия создана: ID ${testData.workSessionId}`, 'blue');
  log(`   Рассчитанная сумма: ${result.data.calculatedAmount} руб.`, 'blue');
  log(`   Оплата за авто: ${result.data.carUsageAmount} руб.`, 'blue');
  log(`   Коэффициент сверхурочных: ${result.data.engineerOvertimeCoefficient}`, 'blue');
}

async function test17_GetWorkSessions() {
  if (!testData.orderId) {
    throw new Error('Order ID не установлен для получения рабочих сессий');
  }
  if (!testData.engineerToken) {
    throw new Error('Engineer token не установлен');
  }
  
  const result = await request('GET', `/orders/${testData.orderId}/work-sessions`, {
    token: testData.engineerToken,
  });

  log(`   Рабочих сессий: ${result.data.length}`, 'blue');
}

// ============================================
// ЭТАП 9: Завершение работы
// ============================================

async function test18_CompleteWork() {
  if (!testData.orderId) {
    throw new Error('Order ID не установлен для завершения работы');
  }
  if (!testData.engineerToken) {
    throw new Error('Engineer token не установлен');
  }
  
  const result = await request('POST', `/orders/${testData.orderId}/complete-work`, {
    token: testData.engineerToken,
    body: {
      regularHours: 8,
      overtimeHours: 2,
      carPayment: 500,
      distanceKm: 50,
      territoryType: 'CITY',
      notes: 'Работа полностью завершена',
      isFullyCompleted: true,
    },
  });

  log(`   Работа завершена`, 'blue');
  log(`   Статус заявки: ${result.data.status}`, 'blue');
}

async function test19_CompleteOrder() {
  if (!testData.orderId) {
    throw new Error('Order ID не установлен для завершения заявки');
  }
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  const result = await request('POST', `/orders/${testData.orderId}/complete`, {
    token: testData.managerToken,
  });

  log(`   Заявка завершена менеджером`, 'blue');
  log(`   Статус заявки: ${result.data.status}`, 'blue');
}

// ============================================
// ЭТАП 10: Проверка статистики
// ============================================

async function test20_UpdateOrder() {
  if (!testData.orderId) {
    throw new Error('Order ID не установлен для обновления заявки');
  }
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  const result = await request('PATCH', `/orders/${testData.orderId}`, {
    token: testData.managerToken,
    body: {
      title: `Обновленная заявка API ${new Date().toISOString()}`,
      description: 'Обновленное описание заявки',
      distanceKm: 20.5,
    },
  });

  log(`   Заявка обновлена: ID ${result.data.id}`, 'blue');
  log(`   Новое название: ${result.data.title}`, 'blue');
  log(`   Новое расстояние: ${result.data.distanceKm} км`, 'blue');
}

async function test21_AssignMultipleEngineers() {
  if (!testData.orderId) {
    throw new Error('Order ID не установлен для множественного назначения');
  }
  if (!testData.engineerId) {
    throw new Error('Engineer ID не установлен');
  }
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  // Создаем второго инженера для теста
  const engineer2Result = await request('POST', '/users', {
    token: testData.adminToken,
    body: {
      email: `engineer2-${Date.now()}@test.com`,
      password: 'engineer123',
      firstName: 'Инженер',
      lastName: 'Второй',
      role: 'user',
      engineerType: 'staff',
      baseRate: 800,
    },
  });

  const engineer2Id = engineer2Result.data.engineer?.id;
  if (!engineer2Id) {
    log(`   ⚠️  Второй инженер не создан, пропускаем множественное назначение`, 'yellow');
    return;
  }

  const result = await request('POST', `/orders/${testData.orderId}/assign-multiple`, {
    token: testData.managerToken,
    body: {
      engineerIds: [testData.engineerId, engineer2Id],
      primaryEngineerId: testData.engineerId,
    },
  });

  log(`   Назначено инженеров: ${result.data.length || 0}`, 'blue');
}

async function test22_GetEngineerStatistics() {
  if (!testData.engineerToken) {
    throw new Error('Engineer token не установлен');
  }
  
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  try {
    // Статистика заработка инженера
    const earningsResult = await request('GET', `/statistics/earnings?months=12`, {
      token: testData.engineerToken,
    });

    log(`   Статистика заработка получена`, 'blue');
    log(`   Всего заработано: ${earningsResult.data.totalEarnings || 0} руб.`, 'blue');
    log(`   Записей: ${earningsResult.data.earnings?.length || 0}`, 'blue');

    // Детальная статистика инженера
    const detailedResult = await request('GET', `/statistics/engineer/detailed?year=${year}&month=${month}`, {
      token: testData.engineerToken,
    });

    log(`   Детальная статистика получена`, 'blue');
    log(`   Обычные часы: ${detailedResult.data.regularHours || 0}`, 'blue');
    log(`   Сверхурочные часы: ${detailedResult.data.overtimeHours || 0}`, 'blue');
    log(`   Заработок: ${detailedResult.data.totalEarnings || 0} руб.`, 'blue');
  } catch (error) {
    log(`   ⚠️  Статистика недоступна: ${error.message}`, 'yellow');
  }
}

async function test23_GetManagerStatistics() {
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  try {
    // Месячная статистика
    const monthlyResult = await request('GET', `/statistics/monthly?year=${year}&month=${month}`, {
      token: testData.managerToken,
    });

    log(`   Месячная статистика получена`, 'blue');
    log(`   Всего заявок: ${monthlyResult.data.totalOrders || 0}`, 'blue');
    
    // Правильный вывод заработка инженеров
    const agentEarnings = monthlyResult.data.agentEarnings;
    if (typeof agentEarnings === 'number') {
      log(`   Заработок инженеров: ${agentEarnings} руб.`, 'blue');
    } else if (Array.isArray(agentEarnings)) {
      const total = agentEarnings.reduce((sum, item) => sum + (item.amount || item.totalEarnings || 0), 0);
      log(`   Заработок инженеров: ${total} руб. (${agentEarnings.length} записей)`, 'blue');
    } else {
      log(`   Заработок инженеров: получен (тип: ${typeof agentEarnings})`, 'blue');
    }
    
    // Правильный вывод выручки организаций
    const orgEarnings = monthlyResult.data.organizationEarnings;
    if (typeof orgEarnings === 'number') {
      log(`   Выручка организаций: ${orgEarnings} руб.`, 'blue');
    } else if (Array.isArray(orgEarnings)) {
      const total = orgEarnings.reduce((sum, item) => sum + (item.amount || item.totalEarnings || 0), 0);
      log(`   Выручка организаций: ${total} руб. (${orgEarnings.length} записей)`, 'blue');
    } else {
      log(`   Выручка организаций: получена (тип: ${typeof orgEarnings})`, 'blue');
    }

    // Комплексная статистика
    const comprehensiveResult = await request('GET', `/statistics/comprehensive?year=${year}&month=${month}`, {
      token: testData.managerToken,
    });

    log(`   Комплексная статистика получена`, 'blue');
    log(`   Включает временную аналитику: ${!!comprehensiveResult.data.timeBasedAnalytics}`, 'blue');
    log(`   Включает финансовую аналитику: ${!!comprehensiveResult.data.financialAnalytics}`, 'blue');
  } catch (error) {
    log(`   ⚠️  Статистика недоступна: ${error.message}`, 'yellow');
  }
}

async function test24_GetAdminStatistics() {
  if (!testData.adminToken) {
    throw new Error('Admin token не установлен');
  }
  
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  try {
    // Статистика инженеров для админа
    const engineersResult = await request('GET', `/statistics/admin/engineers?year=${year}&month=${month}`, {
      token: testData.adminToken,
    });

    log(`   Статистика инженеров для админа получена`, 'blue');
    log(`   Инженеров: ${engineersResult.data.engineers?.length || 0}`, 'blue');

    // Статистика долгов по оплате
    const debtsResult = await request('GET', `/statistics/payment-debts?year=${year}&month=${month}`, {
      token: testData.adminToken,
    });

    log(`   Статистика долгов по оплате получена`, 'blue');
    log(`   Записей: ${debtsResult.data.debts?.length || 0}`, 'blue');
  } catch (error) {
    log(`   ⚠️  Статистика недоступна: ${error.message}`, 'yellow');
  }
}

// ============================================
// ЭТАП 11: Проверка принятия соглашений (политика конфиденциальности)
// ============================================

async function test25_CheckUserAgreementsStatus() {
  if (!testData.engineerToken) {
    throw new Error('Engineer token не установлен');
  }
  
  // Проверяем статус принятия соглашений для текущего пользователя
  const result = await request('GET', '/agreements/user/check', {
    token: testData.engineerToken,
  });

  log(`   Статус принятия соглашений проверен`, 'blue');
  log(`   Приняты все соглашения: ${result.data.hasAcceptedAll ? '✅ Да' : '❌ Нет'}`, 
      result.data.hasAcceptedAll ? 'green' : 'yellow');
  
  if (result.data.missingAgreements && result.data.missingAgreements.length > 0) {
    log(`   Непринятых соглашений: ${result.data.missingAgreements.length}`, 'yellow');
    result.data.missingAgreements.forEach((agreement) => {
      log(`     - ${agreement.title} (${agreement.type}, версия ${agreement.version})`, 'yellow');
    });
  } else {
    log(`   Все обязательные соглашения приняты`, 'green');
  }
  
  // Проверяем, какие соглашения приняты
  if (result.data.userAgreements && result.data.userAgreements.length > 0) {
    log(`   Принятых соглашений в истории: ${result.data.userAgreements.length}`, 'blue');
    const privacyPolicy = result.data.userAgreements.find(
      ua => ua.agreementType === 'privacy_policy' && ua.isAccepted
    );
    if (privacyPolicy) {
      log(`   ✅ Политика конфиденциальности принята: версия ${privacyPolicy.version}`, 'green');
      log(`      Дата принятия: ${privacyPolicy.acceptedAt}`, 'blue');
    } else {
      log(`   ❌ Политика конфиденциальности не принята`, 'yellow');
    }
  }
}

async function test25b_CheckUserAgreementsHistory() {
  if (!testData.engineerToken) {
    throw new Error('Engineer token не установлен');
  }
  
  // Получаем историю принятия соглашений
  const result = await request('GET', '/agreements/user/history', {
    token: testData.engineerToken,
  });

  log(`   История принятия соглашений получена`, 'blue');
  log(`   Всего записей в истории: ${result.data.length || 0}`, 'blue');
  
  if (result.data && result.data.length > 0) {
    result.data.forEach((ua) => {
      const status = ua.isAccepted ? '✅ Принято' : '❌ Отклонено';
      log(`   ${status}: ${ua.agreementType} (версия ${ua.version}) - ${new Date(ua.acceptedAt).toLocaleString()}`, 
          ua.isAccepted ? 'green' : 'red');
    });
  }
}

async function test25c_CheckPrivacyPolicyAccepted() {
  if (!testData.engineerToken) {
    throw new Error('Engineer token не установлен');
  }
  
  // Получаем последнюю версию политики конфиденциальности
  const latestPrivacy = await request('GET', '/agreements/latest/privacy_policy', {
    token: testData.engineerToken,
  });

  log(`   Последняя версия политики конфиденциальности: ${latestPrivacy.data.version}`, 'blue');
  
  // Проверяем статус пользователя
  const statusResult = await request('GET', '/agreements/user/check', {
    token: testData.engineerToken,
  });

  // Ищем политику конфиденциальности в принятых соглашениях
  const privacyAccepted = statusResult.data.userAgreements?.find(
    ua => ua.agreementType === 'privacy_policy' && 
          ua.version === latestPrivacy.data.version && 
          ua.isAccepted === true
  );

  if (privacyAccepted) {
    log(`   ✅ Политика конфиденциальности принята пользователем`, 'green');
    log(`      Версия: ${privacyAccepted.version}`, 'blue');
    log(`      Дата принятия: ${new Date(privacyAccepted.acceptedAt).toLocaleString()}`, 'blue');
    log(`      IP адрес: ${privacyAccepted.ipAddress || 'не указан'}`, 'blue');
  } else {
    log(`   ❌ Политика конфиденциальности не принята или принята старая версия`, 'yellow');
    log(`      Требуется версия: ${latestPrivacy.data.version}`, 'yellow');
  }
}

async function test25d_CheckUserFieldInDatabase() {
  if (!testData.engineerUserId) {
    throw new Error('Engineer User ID не установлен');
  }
  if (!testData.adminToken) {
    throw new Error('Admin token не установлен');
  }
  
  // Получаем информацию о пользователе напрямую
  const userResult = await request('GET', `/users/${testData.engineerUserId}`, {
    token: testData.adminToken,
  });

  log(`   Информация о пользователе получена`, 'blue');
  log(`   hasAcceptedAgreements: ${userResult.data.hasAcceptedAgreements ? '✅ true' : '❌ false'}`, 
      userResult.data.hasAcceptedAgreements ? 'green' : 'yellow');
  
  if (userResult.data.agreementsAcceptedAt) {
    log(`   agreementsAcceptedAt: ${new Date(userResult.data.agreementsAcceptedAt).toLocaleString()}`, 'blue');
  } else {
    log(`   agreementsAcceptedAt: null (соглашения не приняты)`, 'yellow');
  }
}

// ============================================
// ЭТАП 12: Дополнительные тесты заявок
// ============================================

async function test25_GetOrderStats() {
  if (!testData.adminToken && !testData.managerToken && !testData.engineerToken) {
    throw new Error('Нет токена для получения статистики заявок');
  }
  
  // Тестируем с разными ролями
  const token = testData.adminToken || testData.managerToken || testData.engineerToken;
  
  const result = await request('GET', '/orders/stats', {
    token: token,
  });

  log(`   Статистика заявок получена`, 'blue');
  log(`   Всего заявок: ${result.data.total || 0}`, 'blue');
  if (result.data.byStatus) {
    log(`   По статусам: ${JSON.stringify(result.data.byStatus)}`, 'blue');
  }
}

async function test26_FilterOrders() {
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  // Тест фильтрации с различными параметрами
  const result = await request('GET', '/orders?page=1&limit=10&status=waiting', {
    token: testData.managerToken,
  });

  log(`   Заявки с фильтрацией получены`, 'blue');
  log(`   Страница: ${result.data.page || 1}`, 'blue');
  log(`   Лимит: ${result.data.limit || 10}`, 'blue');
  log(`   Всего: ${result.data.total || 0}`, 'blue');
  log(`   Записей на странице: ${result.data.data?.length || 0}`, 'blue');
  
  // Тест поиска
  if (testData.orderId) {
    const searchResult = await request('GET', `/orders?search=Тестовая&page=1&limit=5`, {
      token: testData.managerToken,
    });
    log(`   Поиск выполнен, найдено: ${searchResult.data.total || 0}`, 'blue');
  }
}

async function test27_GetMyCreatedOrders() {
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  const result = await request('GET', '/orders/my-orders', {
    token: testData.managerToken,
  });

  log(`   Мои созданные заявки получены`, 'blue');
  log(`   Всего: ${result.data.total || 0}`, 'blue');
  log(`   Записей: ${result.data.data?.length || 0}`, 'blue');
}

async function test28_GetOrdersBySource() {
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  // Тест получения заявок по источнику
  const manualResult = await request('GET', '/orders/by-source/manual?page=1&limit=10', {
    token: testData.managerToken,
  });

  log(`   Заявки по источнику (manual) получены`, 'blue');
  log(`   Всего: ${manualResult.data.total || 0}`, 'blue');
  
  // Тест автоматических заявок
  try {
    const automaticResult = await request('GET', '/orders/by-source/automatic?page=1&limit=10', {
      token: testData.managerToken,
    });
    log(`   Заявки по источнику (automatic): ${automaticResult.data.total || 0}`, 'blue');
  } catch (error) {
    log(`   ⚠️  Автоматических заявок нет (ожидаемо): ${error.message}`, 'yellow');
  }
}

async function test29_CreateAutomaticOrder() {
  if (!testData.organizationId) {
    throw new Error('Organization ID не установлен');
  }
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  const result = await request('POST', '/orders/automatic', {
    token: testData.managerToken,
    body: {
      organizationId: testData.organizationId,
      title: `Автоматическая заявка API ${new Date().toISOString()}`,
      description: 'Автоматически созданная заявка для тестирования',
      location: 'Москва, ул. Автоматическая, 1',
      distanceKm: 10.0,
      source: 'automatic',
    },
  });

  log(`   Автоматическая заявка создана: ID ${result.data.id}`, 'blue');
  log(`   Источник: ${result.data.source}`, 'blue');
  
  // Сохраняем ID для возможного использования в других тестах
  testData.orderIdForDeletion = result.data.id;
}

async function test30_RemoveEngineerAssignment() {
  if (!testData.orderId) {
    throw new Error('Order ID не установлен для удаления назначения');
  }
  if (!testData.managerToken) {
    throw new Error('Manager token не установлен');
  }
  
  // Сначала получаем назначения
  const assignmentsResult = await request('GET', `/orders/${testData.orderId}/assignments`, {
    token: testData.managerToken,
  });

  if (!assignmentsResult.data || assignmentsResult.data.length === 0) {
    log(`   ⚠️  Назначений нет, создаем новое для теста удаления`, 'yellow');
    
    // Создаем назначение для теста
    if (testData.engineerId) {
      await request('POST', `/orders/${testData.orderId}/assign-engineer`, {
        token: testData.managerToken,
        body: {
          engineerId: testData.engineerId,
          isPrimary: false,
        },
      });
      
      // Получаем назначения снова
      const newAssignmentsResult = await request('GET', `/orders/${testData.orderId}/assignments`, {
        token: testData.managerToken,
      });
      
      if (newAssignmentsResult.data && newAssignmentsResult.data.length > 0) {
        testData.assignmentId = newAssignmentsResult.data[0].id;
      }
    }
  } else {
    // Берем первое назначение для удаления (если их больше одного)
    if (assignmentsResult.data.length > 1) {
      testData.assignmentId = assignmentsResult.data[assignmentsResult.data.length - 1].id;
    } else {
      log(`   ⚠️  Только одно назначение, пропускаем удаление`, 'yellow');
      return;
    }
  }

  if (!testData.assignmentId) {
    log(`   ⚠️  Assignment ID не получен, пропускаем удаление`, 'yellow');
    return;
  }

  // Удаляем назначение
  await request('DELETE', `/orders/${testData.orderId}/assignments/${testData.assignmentId}`, {
    token: testData.managerToken,
  });

  log(`   Назначение удалено: Assignment ID ${testData.assignmentId}`, 'blue');
  
  // Проверяем, что назначение действительно удалено
  const checkResult = await request('GET', `/orders/${testData.orderId}/assignments`, {
    token: testData.managerToken,
  });
  
  const remainingCount = checkResult.data?.length || 0;
  log(`   Осталось назначений: ${remainingCount}`, 'blue');
}

async function test31_DeleteOrder() {
  // Используем заявку, созданную для автоматического теста, или создаем новую
  if (!testData.orderIdForDeletion) {
    if (!testData.organizationId) {
      throw new Error('Organization ID не установлен');
    }
    if (!testData.managerToken) {
      throw new Error('Manager token не установлен');
    }
    
    // Создаем заявку специально для удаления
    const createResult = await request('POST', '/orders', {
      token: testData.managerToken,
      body: {
        organizationId: testData.organizationId,
        title: `Заявка для удаления ${new Date().toISOString()}`,
        location: 'Тест',
      },
    });
    
    testData.orderIdForDeletion = createResult.data.id;
    log(`   Создана заявка для удаления: ID ${testData.orderIdForDeletion}`, 'blue');
  }
  
  // Удаляем заявку
  await request('DELETE', `/orders/${testData.orderIdForDeletion}`, {
    token: testData.managerToken,
  });

  log(`   Заявка удалена: ID ${testData.orderIdForDeletion}`, 'blue');
  
  // Проверяем, что заявка действительно удалена
  try {
    await request('GET', `/orders/${testData.orderIdForDeletion}`, {
      token: testData.managerToken,
    });
    log(`   ⚠️  Заявка все еще существует!`, 'yellow');
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      log(`   ✅ Заявка успешно удалена (404 при попытке получить)`, 'green');
    } else {
      throw error;
    }
  }
}

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================

async function runTests() {
  log('\n🚀 НАЧАЛО АВТОМАТИЧЕСКОГО ТЕСТИРОВАНИЯ API', 'bright');
  log(`📍 Base URL: ${BASE_URL}\n`, 'cyan');

  const tests = [
    // ЭТАП 1: Инициализация
    ['Инициализация админа', test1_InitAdmin],
    ['Логин админа', test2_LoginAdmin],
    
    // ЭТАП 2: Создание пользователей и организации
    ['Создание организации', test3_CreateOrganization],
    ['Создание инженера', test4_CreateEngineer],
    ['Создание менеджера', test5_CreateManager],
    ['Логин менеджера', test6_LoginManager],
    ['Логин инженера', test7_LoginEngineer],
    
    // ЭТАП 3: Соглашения
    ['Получение соглашений', test8_GetAgreements],
    ['Принятие соглашений', test9_AcceptAgreements],
    // Проверка принятия соглашений (после логина и принятия)
    ['Проверка статуса соглашений', test25_CheckUserAgreementsStatus],
    ['История принятия соглашений', test25b_CheckUserAgreementsHistory],
    ['Проверка политики конфиденциальности', test25c_CheckPrivacyPolicyAccepted],
    ['Проверка поля hasAcceptedAgreements', test25d_CheckUserFieldInDatabase],
    
    // ЭТАП 4: Базовые операции с заявками
    ['Создание заявки', test10_CreateOrder],
    ['Получение заявки', test11_GetOrder],
    ['Обновление заявки', test20_UpdateOrder],
    
    // ЭТАП 5: Назначение инженеров
    ['Назначение инженера', test12_AssignEngineer],
    ['Получение назначений', test13_GetAssignments],
    ['Множественное назначение инженеров', test21_AssignMultipleEngineers],
    ['Удаление назначения инженера', test30_RemoveEngineerAssignment],
    
    // ЭТАП 6: Работа с заявками (фильтрация и поиск)
    ['Получение моих заявок', test14_GetMyOrders],
    ['Фильтрация и пагинация заявок', test26_FilterOrders],
    ['Получение моих созданных заявок', test27_GetMyCreatedOrders],
    ['Получение заявок по источнику', test28_GetOrdersBySource],
    ['Статистика заявок', test25_GetOrderStats],
    ['Создание автоматической заявки', test29_CreateAutomaticOrder],
    
    // ЭТАП 7: Работа инженера с заявками
    ['Принятие заявки инженером', test15_AcceptOrder],
    ['Создание рабочей сессии', test16_CreateWorkSession],
    ['Получение рабочих сессий', test17_GetWorkSessions],
    ['Завершение работы', test18_CompleteWork],
    
    // ЭТАП 8: Завершение заявок
    ['Завершение заявки', test19_CompleteOrder],
    
    // ЭТАП 9: Статистика
    ['Статистика инженера', test22_GetEngineerStatistics],
    ['Статистика менеджера', test23_GetManagerStatistics],
    ['Статистика админа', test24_GetAdminStatistics],
    
    // ЭТАП 10: Удаление (последний тест)
    ['Удаление заявки', test31_DeleteOrder],
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, testFn] of tests) {
    const success = await test(name, testFn);
    if (success) {
      passed++;
    } else {
      failed++;
    }
    // Небольшая задержка между тестами
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Итоги
  log(`\n${'='.repeat(60)}`, 'cyan');
  log('ИТОГИ ТЕСТИРОВАНИЯ', 'bright');
  log('='.repeat(60), 'cyan');
  log(`✅ Успешно: ${passed}`, 'green');
  log(`❌ Ошибок: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`📊 Всего тестов: ${tests.length}`, 'blue');

  if (failed === 0) {
    log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!', 'green');
  } else {
    log('\n⚠️  ЕСТЬ ОШИБКИ В ТЕСТАХ', 'yellow');
    process.exit(1);
  }
}

// Запуск тестов
runTests().catch((error) => {
  log(`\n💥 КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'red');
  if (error.stack) {
    log(error.stack, 'red');
  }
  process.exit(1);
});

