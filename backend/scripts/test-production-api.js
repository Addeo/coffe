#!/usr/bin/env node

/**
 * Скрипт автоматического тестирования продакшн API (КМВ - Кавказские Минеральные Воды)
 * Выполняет полный цикл заполнения данных и проверки статистики для региона КМВ
 *
 * Регион: Кавказские Минеральные Воды (КМВ)
 * Города: Пятигорск, Кисловодск, Ессентуки, Железноводск, Минеральные Воды
 *
 * Использование:
 *   PROD_API_URL=https://your-production-api.com/api node scripts/test-production-api.js
 */

const BASE_URL = process.env.PROD_API_URL || process.env.API_URL || 'http://localhost:3001/api';

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Сохраненные данные между запросами
const testData = {
  // Токены
  adminToken: null,
  managerToken: null,
  engineer1Token: null,
  engineer2Token: null,
  engineer3Token: null,
  engineer4Token: null,
  engineer5Token: null,

  // Организации
  organizationId1: null,
  organizationId2: null,
  organizationId3: null,

  // Пользователи
  engineer1UserId: null,
  engineer1Email: null,
  engineer1Id: null,
  engineer2UserId: null,
  engineer2Email: null,
  engineer2Id: null,
  engineer3UserId: null,
  engineer3Email: null,
  engineer3Id: null,
  engineer4UserId: null,
  engineer4Email: null,
  engineer4Id: null,
  engineer5UserId: null,
  engineer5Email: null,
  engineer5Id: null,
  managerUserId: null,
  managerEmail: null,

  // Заявки
  orderId1: null,
  orderId2: null,
  orderId3: null,
  orderId4: null,
  orderId5: null,
  orderId6: null,
  orderId7: null,

  // Рабочие сессии
  workSessionId1: null,
  workSessionId2: null,
  workSessionId3: null,
  workSessionId4: null,
  workSessionId5: null,
  workSessionId6: null,
  workSessionId7: null,

  // Соглашения
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
    let data = {};
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    } else {
      const text = await response.text().catch(() => '');
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text || response.statusText };
      }
    }

    if (!response.ok) {
      // Формируем детальное сообщение об ошибке
      let errorMessage = `HTTP ${response.status}: ${data.message || data.error?.message || response.statusText}`;
      
      // Добавляем детали валидации, если есть
      if (data.errors && Array.isArray(data.errors)) {
        errorMessage += `\n   Validation errors:`;
        data.errors.forEach((err, idx) => {
          errorMessage += `\n   ${idx + 1}. ${err.property || 'unknown'}: ${err.constraints ? Object.values(err.constraints).join(', ') : JSON.stringify(err)}`;
        });
      }
      
      // Добавляем validationErrors, если есть
      if (data.error?.validationErrors && Array.isArray(data.error.validationErrors)) {
        errorMessage += `\n   Validation errors:`;
        data.error.validationErrors.forEach((err, idx) => {
          errorMessage += `\n   ${idx + 1}. ${err.property || 'unknown'}: ${err.constraints ? Object.values(err.constraints).join(', ') : JSON.stringify(err)}`;
        });
      }
      
      // Добавляем полный ответ для отладки
      const errorDetails = {
        statusCode: data.statusCode || response.status,
        timestamp: data.timestamp,
        path: data.path,
        method: data.method || config.method,
        message: data.message || data.error?.message,
        error: data.error,
        errors: data.errors,
      };
      
      errorMessage += `\n${JSON.stringify(errorDetails, null, 2)}`;
      
      throw new Error(errorMessage);
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
    
    // Выводим детальное сообщение об ошибке
    const errorLines = error.message.split('\n');
    errorLines.forEach((line, idx) => {
      if (idx === 0) {
        log(`   ${line}`, 'red');
      } else if (line.trim().startsWith('{') || line.trim().startsWith('[')) {
        // JSON данные - выводим с отступом
        try {
          const jsonData = JSON.parse(line.trim());
          log(`   ${JSON.stringify(jsonData, null, 2).split('\n').join('\n   ')}`, 'yellow');
        } catch {
          log(`   ${line}`, 'yellow');
        }
      } else {
        log(`   ${line}`, 'yellow');
      }
    });
    
    // Выводим stack trace только в режиме отладки
    if (process.env.DEBUG && error.stack) {
      const stackLines = error.stack.split('\n').slice(1);
      log(`   Stack trace:`, 'yellow');
      stackLines.slice(0, 3).forEach(line => {
        log(`   ${line.trim()}`, 'yellow');
      });
    }
    
    return false;
  }
}

// Функция для задержки
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// ЭТАП 1: АУТЕНТИФИКАЦИЯ
// ============================================

async function initAdmin() {
  const { data } = await request('GET', '/auth/init-admin');
  log(`   Админ: ${data.email || 'уже существует'}`, 'blue');
  return data;
}

async function loginAdmin() {
  const { data } = await request('POST', '/auth/login', {
    body: {
      email: 'admin@coffee.com',
      password: 'admin123',
    },
  });
  testData.adminToken = data.access_token;
  log(`   Токен получен: ${data.access_token.substring(0, 20)}...`, 'blue');
  return data;
}

// ============================================
// ЭТАП 2: СОЗДАНИЕ ОРГАНИЗАЦИЙ
// ============================================

async function createOrganization1() {
  const timestamp = Date.now();
  const { data } = await request('POST', '/organizations', {
    token: testData.adminToken,
    body: {
      name: `ООО ТехСервис КМВ ${timestamp}`,
      baseRate: 800.0,
      overtimeMultiplier: 1.5,
      hasOvertime: true,
      isActive: true,
    },
  });
  testData.organizationId1 = data.id;
  log(`   ID организации: ${data.id}`, 'blue');
  return data;
}

async function createOrganization2() {
  const timestamp = Date.now();
  const { data } = await request('POST', '/organizations', {
    token: testData.adminToken,
    body: {
      name: `ИП Санаторий Пятигорск ${timestamp}`,
      baseRate: 600.0,
      overtimeMultiplier: 1.3,
      hasOvertime: true,
      isActive: true,
    },
  });
  testData.organizationId2 = data.id;
  log(`   ID организации: ${data.id}`, 'blue');
  return data;
}

async function createOrganization3() {
  const timestamp = Date.now();
  const { data } = await request('POST', '/organizations', {
    token: testData.adminToken,
    body: {
      name: `ЗАО Курортное Обслуживание КМВ ${timestamp}`,
      baseRate: 1000.0,
      overtimeMultiplier: 1.6,
      hasOvertime: true,
      isActive: true,
    },
  });
  testData.organizationId3 = data.id;
  log(`   ID организации: ${data.id}`, 'blue');
  return data;
}

async function getOrganizations() {
  const { data } = await request('GET', '/organizations', {
    token: testData.adminToken,
  });
  log(`   Всего организаций: ${data.length || data.total || 0}`, 'blue');
  return data;
}

// ============================================
// ЭТАП 3: СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ
// ============================================

async function createEngineer1() {
  const timestamp = Date.now();
  const email = `engineer1-kmv-${timestamp}@test.com`;
  const { data } = await request('POST', '/users', {
    token: testData.adminToken,
    body: {
      email: email,
      password: 'engineer123',
      firstName: 'Иван',
      lastName: 'Петров',
      role: 'user',
      engineerType: 'staff',
      baseRate: 500.0,
      overtimeCoefficient: 1.6,
      planHoursMonth: 160,
      homeTerritoryFixedAmount: 200.0,
    },
  });
  testData.engineer1UserId = data.id;
  testData.engineer1Email = email;
  testData.engineer1Id = data.engineer?.id;
  log(
    `   ID пользователя: ${data.id}, ID инженера: ${data.engineer?.id} (STAFF, стандартная ставка)`,
    'blue'
  );
  return data;
}

async function createEngineer2() {
  const timestamp = Date.now();
  const email = `engineer2-kmv-${timestamp}@test.com`;
  const { data } = await request('POST', '/users', {
    token: testData.adminToken,
    body: {
      email: email,
      password: 'engineer123',
      firstName: 'Сергей',
      lastName: 'Сидоров',
      role: 'user',
      engineerType: 'contract',
      baseRate: 400.0,
      overtimeCoefficient: 1.5,
      // planHoursMonth не передаем для CONTRACT (валидатор требует минимум 1)
      homeTerritoryFixedAmount: 0,
    },
  });
  testData.engineer2UserId = data.id;
  testData.engineer2Email = email;
  testData.engineer2Id = data.engineer?.id;
  log(
    `   ID пользователя: ${data.id}, ID инженера: ${data.engineer?.id} (CONTRACT, наемный)`,
    'blue'
  );
  return data;
}

async function createEngineer3() {
  const timestamp = Date.now();
  const email = `engineer3-kmv-${timestamp}@test.com`;
  const { data } = await request('POST', '/users', {
    token: testData.adminToken,
    body: {
      email: email,
      password: 'engineer123',
      firstName: 'Алексей',
      lastName: 'Козлов',
      role: 'user',
      engineerType: 'staff',
      baseRate: 450.0,
      overtimeCoefficient: 1.6,
      planHoursMonth: 160,
      homeTerritoryFixedAmount: 180.0,
      // Примечание: fixedSalary и fixedCarAmount не сохраняются при создании через API,
      // они используются только при обновлении через updateUserDto
    },
  });
  testData.engineer3UserId = data.id;
  testData.engineer3Email = email;
  testData.engineer3Id = data.engineer?.id;
  log(
    `   ID пользователя: ${data.id}, ID инженера: ${data.engineer?.id} (STAFF, стандартная ставка)`,
    'blue'
  );
  return data;
}

async function createEngineer4() {
  const timestamp = Date.now();
  const email = `engineer4-kmv-${timestamp}@test.com`;
  const { data } = await request('POST', '/users', {
    token: testData.adminToken,
    body: {
      email: email,
      password: 'engineer123',
      firstName: 'Дмитрий',
      lastName: 'Волков',
      role: 'user',
      engineerType: 'staff',
      baseRate: 600.0,
      overtimeCoefficient: 2.0,
      planHoursMonth: 160,
      homeTerritoryFixedAmount: 250.0,
    },
  });
  testData.engineer4UserId = data.id;
  testData.engineer4Email = email;
  testData.engineer4Id = data.engineer?.id;
  log(
    `   ID пользователя: ${data.id}, ID инженера: ${data.engineer?.id} (STAFF, высокий коэффициент)`,
    'blue'
  );
  return data;
}

async function createEngineer5() {
  const timestamp = Date.now();
  const email = `engineer5-kmv-${timestamp}@test.com`;
  const { data } = await request('POST', '/users', {
    token: testData.adminToken,
    body: {
      email: email,
      password: 'engineer123',
      firstName: 'Николай',
      lastName: 'Орлов',
      role: 'user',
      engineerType: 'contract',
      baseRate: 350.0,
      overtimeCoefficient: 1.3,
      // planHoursMonth не передаем для CONTRACT (валидатор требует минимум 1)
      homeTerritoryFixedAmount: 0,
    },
  });
  testData.engineer5UserId = data.id;
  testData.engineer5Email = email;
  testData.engineer5Id = data.engineer?.id;
  log(
    `   ID пользователя: ${data.id}, ID инженера: ${data.engineer?.id} (CONTRACT, минимальные параметры)`,
    'blue'
  );
  return data;
}

async function createManager() {
  const timestamp = Date.now();
  const email = `manager-kmv-${timestamp}@test.com`;
  const { data } = await request('POST', '/users', {
    token: testData.adminToken,
    body: {
      email: email,
      password: 'manager123',
      firstName: 'Мария',
      lastName: 'Смирнова',
      role: 'manager',
    },
  });
  testData.managerUserId = data.id;
  testData.managerEmail = email;
  log(`   ID пользователя: ${data.id}`, 'blue');
  return data;
}

async function loginManager() {
  if (!testData.managerEmail) {
    throw new Error('Manager email not found');
  }
  const { data } = await request('POST', '/auth/login', {
    body: {
      email: testData.managerEmail,
      password: 'manager123',
    },
  });
  testData.managerToken = data.access_token;
  log(`   Токен получен`, 'blue');
  return data;
}

async function loginEngineer1() {
  if (!testData.engineer1Email) {
    throw new Error('Engineer 1 email not found');
  }
  const { data } = await request('POST', '/auth/login', {
    body: {
      email: testData.engineer1Email,
      password: 'engineer123',
    },
  });
  testData.engineer1Token = data.access_token;
  log(`   Токен получен`, 'blue');
  return data;
}

async function loginEngineer2() {
  if (!testData.engineer2Email) {
    throw new Error('Engineer 2 email not found');
  }
  const { data } = await request('POST', '/auth/login', {
    body: {
      email: testData.engineer2Email,
      password: 'engineer123',
    },
  });
  testData.engineer2Token = data.access_token;
  log(`   Токен получен`, 'blue');
  return data;
}

async function loginEngineer3() {
  if (!testData.engineer3Email) {
    throw new Error('Engineer 3 email not found');
  }
  const { data } = await request('POST', '/auth/login', {
    body: {
      email: testData.engineer3Email,
      password: 'engineer123',
    },
  });
  testData.engineer3Token = data.access_token;
  log(`   Токен получен`, 'blue');
  return data;
}

async function loginEngineer4() {
  if (!testData.engineer4Email) {
    throw new Error('Engineer 4 email not found');
  }
  const { data } = await request('POST', '/auth/login', {
    body: {
      email: testData.engineer4Email,
      password: 'engineer123',
    },
  });
  testData.engineer4Token = data.access_token;
  log(`   Токен получен`, 'blue');
  return data;
}

async function loginEngineer5() {
  if (!testData.engineer5Email) {
    throw new Error('Engineer 5 email not found');
  }
  const { data } = await request('POST', '/auth/login', {
    body: {
      email: testData.engineer5Email,
      password: 'engineer123',
    },
  });
  testData.engineer5Token = data.access_token;
  log(`   Токен получен`, 'blue');
  return data;
}

// ============================================
// ЭТАП 4: РАБОТА С СОГЛАШЕНИЯМИ
// ============================================

async function getAgreements(token, engineerName) {
  const { data } = await request('GET', '/agreements', {
    token,
  });
  const agreements = Array.isArray(data) ? data : data.agreements || [];
  testData.agreementIds = agreements.filter(ag => ag.isRequired && ag.isActive).map(ag => ag.id);
  log(`   Найдено обязательных соглашений: ${testData.agreementIds.length}`, 'blue');
  return data;
}

async function acceptAgreements(token, engineerName) {
  if (testData.agreementIds.length === 0) {
    log(`   Нет соглашений для принятия`, 'yellow');
    return { success: true };
  }
  const { data } = await request('POST', '/agreements/accept', {
    token,
    body: {
      agreementIds: testData.agreementIds,
    },
  });
  log(`   Принято соглашений: ${testData.agreementIds.length}`, 'blue');
  return data;
}

// ============================================
// ЭТАП 5: СОЗДАНИЕ ЗАЯВОК
// ============================================

async function createOrder1() {
  const { data } = await request('POST', '/orders', {
    token: testData.managerToken,
    body: {
      organizationId: testData.organizationId1,
      title: 'Ремонт оборудования в санатории Пятигорск',
      description:
        'Требуется диагностика и ремонт серверного оборудования в административном корпусе',
      location: 'Пятигорск, пр. Кирова, 28',
      distanceKm: 5.0,
      territoryType: 'urban',
      source: 'manual',
      plannedStartDate: new Date('2025-01-15T09:00:00Z').toISOString(),
    },
  });
  testData.orderId1 = data.id;
  log(`   ID заявки: ${data.id}`, 'blue');
  return data;
}

async function createOrder2() {
  const { data } = await request('POST', '/orders', {
    token: testData.managerToken,
    body: {
      organizationId: testData.organizationId2,
      title: 'Установка системы видеонаблюдения в санатории',
      description: 'Монтаж и настройка системы видеонаблюдения на территории санатория',
      location: 'Кисловодск, ул. Мира, 15',
      distanceKm: 22.0,
      territoryType: 'urban',
      source: 'manual',
      plannedStartDate: new Date('2025-01-16T10:00:00Z').toISOString(),
    },
  });
  testData.orderId2 = data.id;
  log(`   ID заявки: ${data.id}`, 'blue');
  return data;
}

async function createOrder3() {
  const { data } = await request('POST', '/orders', {
    token: testData.managerToken,
    body: {
      organizationId: testData.organizationId3,
      title: 'Обслуживание сетевого оборудования в курортной зоне',
      description: 'Плановое обслуживание и замена компонентов сетевого оборудования',
      location: 'Ессентуки, ул. Интернациональная, 10',
      distanceKm: 12.0,
      territoryType: 'urban',
      source: 'automatic',
      plannedStartDate: new Date('2025-01-17T08:00:00Z').toISOString(),
    },
  });
  testData.orderId3 = data.id;
  log(`   ID заявки: ${data.id}`, 'blue');
  return data;
}

async function createOrder4() {
  const { data } = await request('POST', '/orders', {
    token: testData.managerToken,
    body: {
      organizationId: testData.organizationId1,
      title: 'Ремонт принтера в администрации',
      description: 'Замена картриджей и настройка принтера в административном отделе',
      location: 'Железноводск, ул. Ленина, 8',
      distanceKm: 8.0,
      territoryType: 'urban',
      source: 'manual',
      plannedStartDate: new Date('2025-01-18T11:00:00Z').toISOString(),
    },
  });
  testData.orderId4 = data.id;
  log(`   ID заявки: ${data.id}`, 'blue');
  return data;
}

async function createOrder5() {
  const { data } = await request('POST', '/orders', {
    token: testData.managerToken,
    body: {
      organizationId: testData.organizationId2,
      title: 'Настройка Wi-Fi сети в гостинице',
      description: 'Установка и настройка точек доступа Wi-Fi в гостиничном комплексе',
      location: 'Минеральные Воды, пр. Карла Маркса, 45',
      distanceKm: 18.0,
      territoryType: 'urban',
      source: 'manual',
      plannedStartDate: new Date('2025-01-19T14:00:00Z').toISOString(),
    },
  });
  testData.orderId5 = data.id;
  log(`   ID заявки: ${data.id}`, 'blue');
  return data;
}

async function createOrder6() {
  const { data } = await request('POST', '/orders', {
    token: testData.managerToken,
    body: {
      organizationId: testData.organizationId3,
      title: 'Ремонт системы кондиционирования',
      description: 'Диагностика и ремонт системы кондиционирования в административном здании',
      location: 'Пятигорск, ул. Красноармейская, 12',
      distanceKm: 6.0,
      territoryType: 'urban',
      source: 'manual',
      plannedStartDate: new Date('2025-01-20T10:00:00Z').toISOString(),
    },
  });
  testData.orderId6 = data.id;
  log(`   ID заявки: ${data.id}`, 'blue');
  return data;
}

async function createOrder7() {
  const { data } = await request('POST', '/orders', {
    token: testData.managerToken,
    body: {
      organizationId: testData.organizationId1,
      title: 'Настройка системы безопасности',
      description: 'Установка и настройка системы контроля доступа',
      location: 'Кисловодск, ул. Курортный бульвар, 5',
      distanceKm: 20.0,
      territoryType: 'urban',
      source: 'manual',
      plannedStartDate: new Date('2025-01-21T11:00:00Z').toISOString(),
    },
  });
  testData.orderId7 = data.id;
  log(`   ID заявки: ${data.id}`, 'blue');
  return data;
}

// ============================================
// ЭТАП 6: НАЗНАЧЕНИЕ ИНЖЕНЕРОВ
// ============================================

async function assignEngineer1ToOrder1() {
  const { data } = await request('POST', `/orders/${testData.orderId1}/assign-engineer`, {
    token: testData.managerToken,
    body: {
      engineerId: testData.engineer1Id,
      isPrimary: true,
    },
  });
  log(`   Инженер #1 назначен на заявку #1`, 'blue');
  return data;
}

async function assignEngineer1ToOrder2() {
  const { data } = await request('POST', `/orders/${testData.orderId2}/assign-engineer`, {
    token: testData.managerToken,
    body: {
      engineerId: testData.engineer1Id,
      isPrimary: true,
    },
  });
  log(`   Инженер #1 назначен на заявку #2`, 'blue');
  return data;
}

async function assignEngineer2ToOrder3() {
  const { data } = await request('POST', `/orders/${testData.orderId3}/assign-engineer`, {
    token: testData.managerToken,
    body: {
      engineerId: testData.engineer2Id,
      isPrimary: true,
    },
  });
  log(`   Инженер #2 назначен на заявку #3`, 'blue');
  return data;
}

async function assignEngineer2ToOrder4() {
  const { data } = await request('POST', `/orders/${testData.orderId4}/assign-engineer`, {
    token: testData.managerToken,
    body: {
      engineerId: testData.engineer2Id,
      isPrimary: true,
    },
  });
  log(`   Инженер #2 назначен на заявку #4`, 'blue');
  return data;
}

async function assignEngineer3ToOrder5() {
  const { data } = await request('POST', `/orders/${testData.orderId5}/assign-engineer`, {
    token: testData.managerToken,
    body: {
      engineerId: testData.engineer3Id,
      isPrimary: true,
    },
  });
  log(`   Инженер #3 назначен на заявку #5`, 'blue');
  return data;
}

async function assignEngineer4ToOrder6() {
  const { data } = await request('POST', `/orders/${testData.orderId6}/assign-engineer`, {
    token: testData.managerToken,
    body: {
      engineerId: testData.engineer4Id,
      isPrimary: true,
    },
  });
  log(`   Инженер #4 назначен на заявку #6`, 'blue');
  return data;
}

async function assignEngineer5ToOrder7() {
  const { data } = await request('POST', `/orders/${testData.orderId7}/assign-engineer`, {
    token: testData.managerToken,
    body: {
      engineerId: testData.engineer5Id,
      isPrimary: true,
    },
  });
  log(`   Инженер #5 назначен на заявку #7`, 'blue');
  return data;
}

// ============================================
// ЭТАП 7: ПРИНЯТИЕ ЗАЯВОК
// ============================================

async function acceptOrder1() {
  const { data } = await request('POST', `/orders/${testData.orderId1}/accept`, {
    token: testData.engineer1Token,
  });
  log(`   Заявка #1 принята инженером #1`, 'blue');
  return data;
}

async function acceptOrder2() {
  const { data } = await request('POST', `/orders/${testData.orderId2}/accept`, {
    token: testData.engineer1Token,
  });
  log(`   Заявка #2 принята инженером #1`, 'blue');
  return data;
}

async function acceptOrder3() {
  const { data } = await request('POST', `/orders/${testData.orderId3}/accept`, {
    token: testData.engineer2Token,
  });
  log(`   Заявка #3 принята инженером #2`, 'blue');
  return data;
}

async function acceptOrder4() {
  const { data } = await request('POST', `/orders/${testData.orderId4}/accept`, {
    token: testData.engineer2Token,
  });
  log(`   Заявка #4 принята инженером #2`, 'blue');
  return data;
}

async function acceptOrder5() {
  const { data } = await request('POST', `/orders/${testData.orderId5}/accept`, {
    token: testData.engineer3Token,
  });
  log(`   Заявка #5 принята инженером #3`, 'blue');
  return data;
}

async function acceptOrder6() {
  const { data } = await request('POST', `/orders/${testData.orderId6}/accept`, {
    token: testData.engineer4Token,
  });
  log(`   Заявка #6 принята инженером #4`, 'blue');
  return data;
}

async function acceptOrder7() {
  const { data } = await request('POST', `/orders/${testData.orderId7}/accept`, {
    token: testData.engineer5Token,
  });
  log(`   Заявка #7 принята инженером #5`, 'blue');
  return data;
}

// ============================================
// ЭТАП 8: СОЗДАНИЕ РАБОЧИХ СЕССИЙ
// ============================================

async function createWorkSession1() {
  const { data } = await request('POST', `/orders/${testData.orderId1}/work-sessions`, {
    token: testData.engineer1Token,
    body: {
      workDate: '2025-01-15',
      regularHours: 8,
      overtimeHours: 0,
      carPayment: 500,
      distanceKm: 5.0,
      territoryType: 'urban',
      notes: 'Выполнена диагностика и ремонт серверного оборудования в санатории Пятигорск',
      canBeInvoiced: true,
    },
  });
  testData.workSessionId1 = data.id;
  log(`   ID рабочей сессии: ${data.id}, Сумма: ${data.calculatedAmount}`, 'blue');
  return data;
}

async function createWorkSession2() {
  const { data } = await request('POST', `/orders/${testData.orderId2}/work-sessions`, {
    token: testData.engineer1Token,
    body: {
      workDate: '2025-01-16',
      regularHours: 6,
      overtimeHours: 2,
      carPayment: 800,
      distanceKm: 22.0,
      territoryType: 'urban',
      notes: 'Установка и настройка системы видеонаблюдения в санатории Кисловодск',
      canBeInvoiced: true,
    },
  });
  testData.workSessionId2 = data.id;
  log(`   ID рабочей сессии: ${data.id}, Сумма: ${data.calculatedAmount}`, 'blue');
  return data;
}

async function createWorkSession3() {
  const { data } = await request('POST', `/orders/${testData.orderId3}/work-sessions`, {
    token: testData.engineer2Token,
    body: {
      workDate: '2025-01-17',
      regularHours: 4,
      overtimeHours: 0,
      carPayment: 300,
      distanceKm: 12.0,
      territoryType: 'urban',
      notes: 'Плановое обслуживание сетевого оборудования в курортной зоне Ессентуки',
      canBeInvoiced: true,
    },
  });
  testData.workSessionId3 = data.id;
  log(`   ID рабочей сессии: ${data.id}, Сумма: ${data.calculatedAmount}`, 'blue');
  return data;
}

async function createWorkSession4() {
  const { data } = await request('POST', `/orders/${testData.orderId4}/work-sessions`, {
    token: testData.engineer2Token,
    body: {
      workDate: '2025-01-18',
      regularHours: 3,
      overtimeHours: 0,
      carPayment: 400,
      distanceKm: 8.0,
      territoryType: 'urban',
      notes: 'Замена картриджей и настройка принтера в администрации Железноводск',
      canBeInvoiced: true,
    },
  });
  testData.workSessionId4 = data.id;
  log(`   ID рабочей сессии: ${data.id}, Сумма: ${data.calculatedAmount}`, 'blue');
  return data;
}

async function createWorkSession5() {
  const { data } = await request('POST', `/orders/${testData.orderId5}/work-sessions`, {
    token: testData.engineer3Token,
    body: {
      workDate: '2025-01-19',
      regularHours: 5,
      overtimeHours: 1,
      carPayment: 600,
      distanceKm: 18.0,
      territoryType: 'urban',
      notes: 'Установка и настройка точек доступа Wi-Fi в гостинице Минеральные Воды',
      canBeInvoiced: true,
    },
  });
  testData.workSessionId5 = data.id;
  log(`   ID рабочей сессии: ${data.id}, Сумма: ${data.calculatedAmount}`, 'blue');
  return data;
}

async function createWorkSession6() {
  const { data } = await request('POST', `/orders/${testData.orderId6}/work-sessions`, {
    token: testData.engineer4Token,
    body: {
      workDate: '2025-01-20',
      regularHours: 7,
      overtimeHours: 1,
      carPayment: 550,
      distanceKm: 6.0,
      territoryType: 'urban',
      notes: 'Диагностика и ремонт системы кондиционирования в административном здании Пятигорск',
      canBeInvoiced: true,
    },
  });
  testData.workSessionId6 = data.id;
  log(`   ID рабочей сессии: ${data.id}, Сумма: ${data.calculatedAmount}`, 'blue');
  return data;
}

async function createWorkSession7() {
  const { data } = await request('POST', `/orders/${testData.orderId7}/work-sessions`, {
    token: testData.engineer5Token,
    body: {
      workDate: '2025-01-21',
      regularHours: 4,
      overtimeHours: 0,
      carPayment: 450,
      distanceKm: 20.0,
      territoryType: 'urban',
      notes: 'Установка и настройка системы контроля доступа в Кисловодске',
      canBeInvoiced: true,
    },
  });
  testData.workSessionId7 = data.id;
  log(`   ID рабочей сессии: ${data.id}, Сумма: ${data.calculatedAmount}`, 'blue');
  return data;
}

// ============================================
// ЭТАП 9: ЗАВЕРШЕНИЕ РАБОТЫ
// ============================================

async function completeWork1() {
  const { data } = await request('POST', `/orders/${testData.orderId1}/complete-work`, {
    token: testData.engineer1Token,
    body: {
      regularHours: 8,
      overtimeHours: 0,
      carPayment: 500,
      distanceKm: 5.0,
      territoryType: 'urban',
      notes: 'Работа завершена успешно. Ремонт оборудования в санатории Пятигорск выполнен',
      isFullyCompleted: true,
    },
  });
  log(`   Работа над заявкой #1 завершена`, 'blue');
  return data;
}

async function completeWork2() {
  const { data } = await request('POST', `/orders/${testData.orderId2}/complete-work`, {
    token: testData.engineer1Token,
    body: {
      regularHours: 6,
      overtimeHours: 2,
      carPayment: 800,
      distanceKm: 22.0,
      territoryType: 'urban',
      notes: 'Работа завершена. Система видеонаблюдения установлена в санатории Кисловодск',
      isFullyCompleted: true,
    },
  });
  log(`   Работа над заявкой #2 завершена`, 'blue');
  return data;
}

async function completeWork3() {
  const { data } = await request('POST', `/orders/${testData.orderId3}/complete-work`, {
    token: testData.engineer2Token,
    body: {
      regularHours: 4,
      overtimeHours: 0,
      carPayment: 300,
      distanceKm: 12.0,
      territoryType: 'urban',
      notes: 'Обслуживание завершено. Сетевое оборудование в курортной зоне Ессентуки обслужено',
      isFullyCompleted: true,
    },
  });
  log(`   Работа над заявкой #3 завершена`, 'blue');
  return data;
}

async function completeWork4() {
  const { data } = await request('POST', `/orders/${testData.orderId4}/complete-work`, {
    token: testData.engineer2Token,
    body: {
      regularHours: 3,
      overtimeHours: 0,
      carPayment: 400,
      distanceKm: 8.0,
      territoryType: 'urban',
      notes: 'Ремонт завершен. Принтер в администрации Железноводск отремонтирован',
      isFullyCompleted: true,
    },
  });
  log(`   Работа над заявкой #4 завершена`, 'blue');
  return data;
}

async function completeWork5() {
  const { data } = await request('POST', `/orders/${testData.orderId5}/complete-work`, {
    token: testData.engineer3Token,
    body: {
      regularHours: 5,
      overtimeHours: 1,
      carPayment: 600,
      distanceKm: 18.0,
      territoryType: 'urban',
      notes: 'Настройка завершена. Wi-Fi сеть в гостинице Минеральные Воды настроена',
      isFullyCompleted: true,
    },
  });
  log(`   Работа над заявкой #5 завершена`, 'blue');
  return data;
}

async function completeWork6() {
  const { data } = await request('POST', `/orders/${testData.orderId6}/complete-work`, {
    token: testData.engineer4Token,
    body: {
      regularHours: 7,
      overtimeHours: 1,
      carPayment: 550,
      distanceKm: 6.0,
      territoryType: 'urban',
      notes:
        'Работа завершена. Система кондиционирования в административном здании Пятигорск отремонтирована',
      isFullyCompleted: true,
    },
  });
  log(`   Работа над заявкой #6 завершена`, 'blue');
  return data;
}

async function completeWork7() {
  const { data } = await request('POST', `/orders/${testData.orderId7}/complete-work`, {
    token: testData.engineer5Token,
    body: {
      regularHours: 4,
      overtimeHours: 0,
      carPayment: 450,
      distanceKm: 20.0,
      territoryType: 'urban',
      notes: 'Работа завершена. Система контроля доступа в Кисловодске установлена и настроена',
      isFullyCompleted: true,
    },
  });
  log(`   Работа над заявкой #7 завершена`, 'blue');
  return data;
}

async function completeOrder1() {
  const { data } = await request('POST', `/orders/${testData.orderId1}/complete`, {
    token: testData.managerToken,
  });
  log(`   Заявка #1 завершена менеджером`, 'blue');
  return data;
}

async function completeOrder2() {
  const { data } = await request('POST', `/orders/${testData.orderId2}/complete`, {
    token: testData.managerToken,
  });
  log(`   Заявка #2 завершена менеджером`, 'blue');
  return data;
}

async function completeOrder3() {
  const { data } = await request('POST', `/orders/${testData.orderId3}/complete`, {
    token: testData.managerToken,
  });
  log(`   Заявка #3 завершена менеджером`, 'blue');
  return data;
}

async function completeOrder4() {
  const { data } = await request('POST', `/orders/${testData.orderId4}/complete`, {
    token: testData.managerToken,
  });
  log(`   Заявка #4 завершена менеджером`, 'blue');
  return data;
}

async function completeOrder5() {
  const { data } = await request('POST', `/orders/${testData.orderId5}/complete`, {
    token: testData.managerToken,
  });
  log(`   Заявка #5 завершена менеджером`, 'blue');
  return data;
}

async function completeOrder6() {
  const { data } = await request('POST', `/orders/${testData.orderId6}/complete`, {
    token: testData.managerToken,
  });
  log(`   Заявка #6 завершена менеджером`, 'blue');
  return data;
}

async function completeOrder7() {
  const { data } = await request('POST', `/orders/${testData.orderId7}/complete`, {
    token: testData.managerToken,
  });
  log(`   Заявка #7 завершена менеджером`, 'blue');
  return data;
}

// ============================================
// ЭТАП 10: ПРОВЕРКА СТАТИСТИКИ
// ============================================

async function getOrderStats() {
  const { data } = await request('GET', '/orders/stats', {
    token: testData.adminToken,
  });
  log(`   Всего заявок: ${data.total}`, 'blue');
  log(`   Завершено: ${data.completed}`, 'blue');
  log(
    `   По источникам: Manual=${data.bySource?.manual}, Automatic=${data.bySource?.automatic}`,
    'blue'
  );
  return data;
}

async function getEngineer1DetailedStats() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const { data } = await request(
    'GET',
    `/statistics/engineer/detailed?year=${year}&month=${month}`,
    {
      token: testData.engineer1Token,
    }
  );
  log(`   Заявок: ${data.ordersCount || 0}`, 'blue');
  log(`   Часов: ${data.totalHours || 0}`, 'blue');
  log(`   Заработок: ${data.totalEarnings || 0}`, 'blue');
  return data;
}

async function getEngineer2DetailedStats() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const { data } = await request(
    'GET',
    `/statistics/engineer/detailed?year=${year}&month=${month}`,
    {
      token: testData.engineer2Token,
    }
  );
  log(`   Заявок: ${data.ordersCount || 0}`, 'blue');
  log(`   Часов: ${data.totalHours || 0}`, 'blue');
  log(`   Заработок: ${data.totalEarnings || 0}`, 'blue');
  return data;
}

async function getEngineer3DetailedStats() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const { data } = await request(
    'GET',
    `/statistics/engineer/detailed?year=${year}&month=${month}`,
    {
      token: testData.engineer3Token,
    }
  );
  log(`   Заявок: ${data.ordersCount || 0}`, 'blue');
  log(`   Часов: ${data.totalHours || 0}`, 'blue');
  log(`   Заработок: ${data.totalEarnings || 0}`, 'blue');
  return data;
}

async function getMonthlyStats() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const { data } = await request('GET', `/statistics/monthly?year=${year}&month=${month}`, {
    token: testData.adminToken,
  });
  log(`   Всего заявок: ${data.totalOrders || 0}`, 'blue');
  log(`   Всего часов: ${data.totalHours || 0}`, 'blue');
  log(`   Заработок инженеров: ${data.totalEngineerEarnings || 0}`, 'blue');
  log(`   Оплаты от организаций: ${data.totalOrganizationPayments || 0}`, 'blue');
  return data;
}

async function getComprehensiveStats() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const { data } = await request(
    'GET',
    `/statistics/comprehensive?year=${year}&month=${month}&includeTimeBased=true&includeFinancial=true&includeRankings=true&includeForecast=true`,
    {
      token: testData.adminToken,
    }
  );
  log(`   Комплексная статистика получена`, 'blue');
  log(`   Инженеров: ${data.engineers?.length || 0}`, 'blue');
  return data;
}

async function getAdminEngineerStats() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const { data } = await request('GET', `/statistics/admin/engineers?year=${year}&month=${month}`, {
    token: testData.adminToken,
  });
  log(`   Статистика по инженерам получена`, 'blue');
  log(`   Инженеров: ${data.length || 0}`, 'blue');
  return data;
}

async function getPaymentDebtsStats() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const { data } = await request('GET', `/statistics/payment-debts?year=${year}&month=${month}`, {
    token: testData.adminToken,
  });
  log(`   Статистика задолженностей получена`, 'blue');
  return data;
}

async function getCarPaymentStatus() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const { data } = await request(
    'GET',
    `/statistics/car-payment-status?year=${year}&month=${month}`,
    {
      token: testData.adminToken,
    }
  );
  log(`   Статус оплаты автомобильных отчислений получен`, 'blue');
  return data;
}

// ============================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================

async function runTests() {
  log('\n' + '='.repeat(60), 'magenta');
  log('🚀 НАЧАЛО ТЕСТИРОВАНИЯ ПРОДАКШН API', 'magenta');
  log('='.repeat(60), 'magenta');
  log(`URL: ${BASE_URL}`, 'cyan');

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // ЭТАП 1: АУТЕНТИФИКАЦИЯ
  log('\n' + '='.repeat(60), 'yellow');
  log('ЭТАП 1: АУТЕНТИФИКАЦИЯ', 'yellow');
  log('='.repeat(60), 'yellow');

  results.tests.push(
    await test('Инициализация админа', initAdmin),
    await test('Логин администратора', loginAdmin)
  );

  // ЭТАП 2: СОЗДАНИЕ ОРГАНИЗАЦИЙ
  log('\n' + '='.repeat(60), 'yellow');
  log('ЭТАП 2: СОЗДАНИЕ ОРГАНИЗАЦИЙ', 'yellow');
  log('='.repeat(60), 'yellow');

  results.tests.push(
    await test('Создать организацию #1', createOrganization1),
    await test('Создать организацию #2', createOrganization2),
    await test('Создать организацию #3', createOrganization3),
    await test('Получить список организаций', getOrganizations)
  );

  // ЭТАП 3: СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ
  log('\n' + '='.repeat(60), 'yellow');
  log('ЭТАП 3: СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ', 'yellow');
  log('='.repeat(60), 'yellow');

  results.tests.push(
    await test('Создать инженера #1 (STAFF, стандартная ставка)', createEngineer1),
    await test('Создать инженера #2 (CONTRACT, наемный)', createEngineer2),
    await test('Создать инженера #3 (STAFF, с фиксированной зарплатой)', createEngineer3),
    await test('Создать инженера #4 (STAFF, высокий коэффициент)', createEngineer4),
    await test('Создать инженера #5 (CONTRACT, минимальные параметры)', createEngineer5),
    await test('Создать менеджера', createManager),
    await test('Логин менеджера', loginManager),
    await test('Логин инженера #1', loginEngineer1),
    await test('Логин инженера #2', loginEngineer2),
    await test('Логин инженера #3', loginEngineer3),
    await test('Логин инженера #4', loginEngineer4),
    await test('Логин инженера #5', loginEngineer5)
  );

  // ЭТАП 4: РАБОТА С СОГЛАШЕНИЯМИ
  log('\n' + '='.repeat(60), 'yellow');
  log('ЭТАП 4: РАБОТА С СОГЛАШЕНИЯМИ', 'yellow');
  log('='.repeat(60), 'yellow');

  results.tests.push(
    await test('Получить соглашения (инженер #1)', () =>
      getAgreements(testData.engineer1Token, 'Инженер #1')),
    await test('Принять соглашения (инженер #1)', () =>
      acceptAgreements(testData.engineer1Token, 'Инженер #1')),
    await test('Получить соглашения (инженер #2)', () =>
      getAgreements(testData.engineer2Token, 'Инженер #2')),
    await test('Принять соглашения (инженер #2)', () =>
      acceptAgreements(testData.engineer2Token, 'Инженер #2')),
    await test('Получить соглашения (инженер #3)', () =>
      getAgreements(testData.engineer3Token, 'Инженер #3')),
    await test('Принять соглашения (инженер #3)', () =>
      acceptAgreements(testData.engineer3Token, 'Инженер #3')),
    await test('Получить соглашения (инженер #4)', () =>
      getAgreements(testData.engineer4Token, 'Инженер #4')),
    await test('Принять соглашения (инженер #4)', () =>
      acceptAgreements(testData.engineer4Token, 'Инженер #4')),
    await test('Получить соглашения (инженер #5)', () =>
      getAgreements(testData.engineer5Token, 'Инженер #5')),
    await test('Принять соглашения (инженер #5)', () =>
      acceptAgreements(testData.engineer5Token, 'Инженер #5'))
  );

  // ЭТАП 5: СОЗДАНИЕ ЗАЯВОК
  log('\n' + '='.repeat(60), 'yellow');
  log('ЭТАП 5: СОЗДАНИЕ ЗАЯВОК', 'yellow');
  log('='.repeat(60), 'yellow');

  results.tests.push(
    await test('Создать заявку #1', createOrder1),
    await test('Создать заявку #2', createOrder2),
    await test('Создать заявку #3', createOrder3),
    await test('Создать заявку #4', createOrder4),
    await test('Создать заявку #5', createOrder5),
    await test('Создать заявку #6', createOrder6),
    await test('Создать заявку #7', createOrder7)
  );

  // ЭТАП 6: НАЗНАЧЕНИЕ ИНЖЕНЕРОВ
  log('\n' + '='.repeat(60), 'yellow');
  log('ЭТАП 6: НАЗНАЧЕНИЕ ИНЖЕНЕРОВ', 'yellow');
  log('='.repeat(60), 'yellow');

  results.tests.push(
    await test('Назначить инженера #1 на заявку #1', assignEngineer1ToOrder1),
    await test('Назначить инженера #1 на заявку #2', assignEngineer1ToOrder2),
    await test('Назначить инженера #2 на заявку #3', assignEngineer2ToOrder3),
    await test('Назначить инженера #2 на заявку #4', assignEngineer2ToOrder4),
    await test('Назначить инженера #3 на заявку #5', assignEngineer3ToOrder5),
    await test('Назначить инженера #4 на заявку #6', assignEngineer4ToOrder6),
    await test('Назначить инженера #5 на заявку #7', assignEngineer5ToOrder7)
  );

  // ЭТАП 7: ПРИНЯТИЕ ЗАЯВОК
  log('\n' + '='.repeat(60), 'yellow');
  log('ЭТАП 7: ПРИНЯТИЕ ЗАЯВОК', 'yellow');
  log('='.repeat(60), 'yellow');

  results.tests.push(
    await test('Инженер #1 принимает заявку #1', acceptOrder1),
    await test('Инженер #1 принимает заявку #2', acceptOrder2),
    await test('Инженер #2 принимает заявку #3', acceptOrder3),
    await test('Инженер #2 принимает заявку #4', acceptOrder4),
    await test('Инженер #3 принимает заявку #5', acceptOrder5),
    await test('Инженер #4 принимает заявку #6', acceptOrder6),
    await test('Инженер #5 принимает заявку #7', acceptOrder7)
  );

  // ЭТАП 8: СОЗДАНИЕ РАБОЧИХ СЕССИЙ
  log('\n' + '='.repeat(60), 'yellow');
  log('ЭТАП 8: СОЗДАНИЕ РАБОЧИХ СЕССИЙ', 'yellow');
  log('='.repeat(60), 'yellow');

  results.tests.push(
    await test('Создать рабочую сессию для заявки #1', createWorkSession1),
    await test('Создать рабочую сессию для заявки #2', createWorkSession2),
    await test('Создать рабочую сессию для заявки #3', createWorkSession3),
    await test('Создать рабочую сессию для заявки #4', createWorkSession4),
    await test('Создать рабочую сессию для заявки #5', createWorkSession5),
    await test('Создать рабочую сессию для заявки #6', createWorkSession6),
    await test('Создать рабочую сессию для заявки #7', createWorkSession7)
  );

  // ЭТАП 9: ЗАВЕРШЕНИЕ РАБОТЫ
  log('\n' + '='.repeat(60), 'yellow');
  log('ЭТАП 9: ЗАВЕРШЕНИЕ РАБОТЫ', 'yellow');
  log('='.repeat(60), 'yellow');

  results.tests.push(
    await test('Завершить работу над заявкой #1', completeWork1),
    await test('Завершить работу над заявкой #2', completeWork2),
    await test('Завершить работу над заявкой #3', completeWork3),
    await test('Завершить работу над заявкой #4', completeWork4),
    await test('Завершить работу над заявкой #5', completeWork5),
    await test('Завершить работу над заявкой #6', completeWork6),
    await test('Завершить работу над заявкой #7', completeWork7),
    await test('Завершить заявку #1 (менеджер)', completeOrder1),
    await test('Завершить заявку #2 (менеджер)', completeOrder2),
    await test('Завершить заявку #3 (менеджер)', completeOrder3),
    await test('Завершить заявку #4 (менеджер)', completeOrder4),
    await test('Завершить заявку #5 (менеджер)', completeOrder5),
    await test('Завершить заявку #6 (менеджер)', completeOrder6),
    await test('Завершить заявку #7 (менеджер)', completeOrder7)
  );

  // ЭТАП 10: ПРОВЕРКА СТАТИСТИКИ
  log('\n' + '='.repeat(60), 'yellow');
  log('ЭТАП 10: ПРОВЕРКА СТАТИСТИКИ', 'yellow');
  log('='.repeat(60), 'yellow');

  results.tests.push(
    await test('Статистика заявок (общая)', getOrderStats),
    await test('Статистика инженера #1 (детальная)', getEngineer1DetailedStats),
    await test('Статистика инженера #2 (детальная)', getEngineer2DetailedStats),
    await test('Статистика инженера #3 (детальная)', getEngineer3DetailedStats),
    await test('Месячная статистика (админ)', getMonthlyStats),
    await test('Комплексная статистика (админ)', getComprehensiveStats),
    await test('Статистика инженеров для админа', getAdminEngineerStats),
    await test('Статистика задолженностей по оплатам', getPaymentDebtsStats),
    await test('Статус оплаты автомобильных отчислений', getCarPaymentStatus)
  );

  // ИТОГИ
  results.passed = results.tests.filter(r => r).length;
  results.failed = results.tests.filter(r => !r).length;

  log('\n' + '='.repeat(60), 'magenta');
  log('📊 ИТОГИ ТЕСТИРОВАНИЯ', 'magenta');
  log('='.repeat(60), 'magenta');
  log(`✅ Успешно: ${results.passed}`, 'green');
  log(`❌ Ошибок: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`📈 Всего тестов: ${results.tests.length}`, 'cyan');
  log('='.repeat(60), 'magenta');

  if (results.failed > 0) {
    process.exit(1);
  }
}

// Запуск
runTests().catch(error => {
  log(`\n❌ Критическая ошибка: ${error.message}`, 'red');
  if (error.stack) {
    log(`\nStack trace:`, 'yellow');
    log(error.stack, 'yellow');
  }
  if (error.response) {
    log(`\nResponse data:`, 'yellow');
    log(JSON.stringify(error.response, null, 2), 'yellow');
  }
  console.error(error);
  process.exit(1);
});
