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
  workSessionId: null,
  agreementIds: [],
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

  testData.managerToken = result.data.access_token;
  log(`   Менеджер авторизован: ${email}`, 'blue');
  log(`   Токен получен: ${testData.managerToken.substring(0, 20)}...`, 'blue');
}

async function test7_LoginEngineer() {
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

  testData.engineerToken = result.data.access_token;
  log(`   Инженер авторизован: ${email}`, 'blue');
  log(`   Токен получен: ${testData.engineerToken.substring(0, 20)}...`, 'blue');

  // Проверяем соглашения
  if (result.data.agreements?.missingAgreements?.length > 0) {
    log(`   ⚠️  Требуется принять соглашения: ${result.data.agreements.missingAgreements.length}`, 'yellow');
    testData.agreementIds = result.data.agreements.missingAgreements.map((a) => a.id);
  } else {
    log(`   ✅ Соглашения уже приняты`, 'green');
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
  const result = await request('GET', '/orders', {
    token: testData.engineerToken,
  });

  log(`   Заявок для инженера: ${result.data?.data?.length || result.data?.length || 0}`, 'blue');
}

async function test15_AcceptOrder() {
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
  const result = await request('GET', `/orders/${testData.orderId}/work-sessions`, {
    token: testData.engineerToken,
  });

  log(`   Рабочих сессий: ${result.data.length}`, 'blue');
}

// ============================================
// ЭТАП 9: Завершение работы
// ============================================

async function test18_CompleteWork() {
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
  const result = await request('POST', `/orders/${testData.orderId}/complete`, {
    token: testData.managerToken,
  });

  log(`   Заявка завершена менеджером`, 'blue');
  log(`   Статус заявки: ${result.data.status}`, 'blue');
}

// ============================================
// ЭТАП 10: Проверка статистики
// ============================================

async function test20_GetStatistics() {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  try {
    const result = await request('GET', `/statistics/engineer/${testData.engineerId}?year=${year}&month=${month}`, {
      token: testData.adminToken,
    });

    log(`   Статистика получена для инженера`, 'blue');
    log(`   Заработано: ${result.data.totalEarnings || 0} руб.`, 'blue');
  } catch (error) {
    log(`   ⚠️  Статистика недоступна: ${error.message}`, 'yellow');
  }
}

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================

async function runTests() {
  log('\n🚀 НАЧАЛО АВТОМАТИЧЕСКОГО ТЕСТИРОВАНИЯ API', 'bright');
  log(`📍 Base URL: ${BASE_URL}\n`, 'cyan');

  const tests = [
    ['Инициализация админа', test1_InitAdmin],
    ['Логин админа', test2_LoginAdmin],
    ['Создание организации', test3_CreateOrganization],
    ['Создание инженера', test4_CreateEngineer],
    ['Создание менеджера', test5_CreateManager],
    ['Логин менеджера', test6_LoginManager],
    ['Логин инженера', test7_LoginEngineer],
    ['Получение соглашений', test8_GetAgreements],
    ['Принятие соглашений', test9_AcceptAgreements],
    ['Создание заявки', test10_CreateOrder],
    ['Получение заявки', test11_GetOrder],
    ['Назначение инженера', test12_AssignEngineer],
    ['Получение назначений', test13_GetAssignments],
    ['Получение моих заявок', test14_GetMyOrders],
    ['Принятие заявки инженером', test15_AcceptOrder],
    ['Создание рабочей сессии', test16_CreateWorkSession],
    ['Получение рабочих сессий', test17_GetWorkSessions],
    ['Завершение работы', test18_CompleteWork],
    ['Завершение заявки', test19_CompleteOrder],
    ['Проверка статистики', test20_GetStatistics],
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

