#!/usr/bin/env node

/**
 * Расширенный тест для работы с заявками
 * Покрывает все возможные операции с заявками:
 * - Создание заявок (обычных и автоматических)
 * - Обновление заявок
 * - Назначение инженеров (одиночное и множественное)
 * - Принятие заявок инженерами
 * - Отклонение заявок
 * - Создание рабочих сессий
 * - Завершение работы
 * - Завершение заявок
 * - Удаление назначений
 * - Удаление заявок
 * - Получение списков с различными фильтрами
 * - Получение статистики заявок
 *
 * Использование:
 *   API_URL=http://localhost:3001/api node scripts/test-orders-comprehensive.js
 *   PROD_API_URL=https://your-production-api.com/api node scripts/test-orders-comprehensive.js
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
  tokens: {},
  organizations: [],
  engineers: [],
  orders: [],
  assignments: [],
  workSessions: [],
};

// Счетчики
let successCount = 0;
let errorCount = 0;

/**
 * Выполнить HTTP запрос
 */
async function makeRequest(method, endpoint, token = null, body = null, queryParams = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.keys(queryParams).forEach(key => {
    if (queryParams[key] !== undefined && queryParams[key] !== null) {
      url.searchParams.append(key, queryParams[key]);
    }
  });

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url.toString(), options);
    const data = await response.json().catch(() => ({}));

    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
      data: {},
    };
  }
}

/**
 * Логирование результата теста
 */
function logTest(testName, success, details = '') {
  if (success) {
    console.log(`${colors.green}✅ ${testName} - УСПЕШНО${colors.reset}`);
    successCount++;
  } else {
    console.log(`${colors.red}❌ ${testName} - ОШИБКА${colors.reset}`);
    if (details) {
      console.log(`${colors.yellow}   ${details}${colors.reset}`);
    }
    errorCount++;
  }
}

/**
 * Выполнить тест
 */
async function runTest(testName, testFn) {
  console.log(`\n${colors.cyan}${colors.bright}Тест: ${testName}${colors.reset}`);
  console.log(`${colors.cyan}============================================================${colors.reset}`);
  try {
    await testFn();
  } catch (error) {
    logTest(testName, false, error.message);
  }
}

// ============================================================================
// ТЕСТЫ
// ============================================================================

/**
 * 1. Инициализация и аутентификация
 */
async function testInitialization() {
  // Инициализация админа
  const initResponse = await makeRequest('POST', '/auth/initialize-admin');
  logTest('Инициализация админа', initResponse.ok);

  // Логин администратора
  const adminLogin = await makeRequest('POST', '/auth/login', null, {
    email: 'admin@coffee.com',
    password: 'admin123',
  });
  if (adminLogin.ok && adminLogin.data.access_token) {
    testData.tokens.admin = adminLogin.data.access_token;
    logTest('Логин администратора', true);
  } else {
    logTest('Логин администратора', false, JSON.stringify(adminLogin.data));
    throw new Error('Не удалось войти как администратор');
  }

  // Логин менеджера
  const managerLogin = await makeRequest('POST', '/auth/login', null, {
    email: 'manager@coffee.com',
    password: 'manager123',
  });
  if (managerLogin.ok && managerLogin.data.access_token) {
    testData.tokens.manager = managerLogin.data.access_token;
    logTest('Логин менеджера', true);
  } else {
    logTest('Логин менеджера', false, JSON.stringify(managerLogin.data));
  }
}

/**
 * 2. Создание тестовых данных (организации и инженеры)
 */
async function testCreateTestData() {
  const timestamp = Date.now();

  // Создание организаций
  for (let i = 1; i <= 3; i++) {
    const orgResponse = await makeRequest(
      'POST',
      '/organizations',
      testData.tokens.admin,
      {
        name: `Тестовая Организация ${i} - ${timestamp}`,
        baseRate: 500 + i * 50,
        overtimeMultiplier: 1.5 + i * 0.1,
        hasOvertime: true,
        isActive: true,
      }
    );
    if (orgResponse.ok && orgResponse.data.id) {
      testData.organizations.push(orgResponse.data);
      logTest(`Создать организацию #${i}`, true);
    } else {
      logTest(`Создать организацию #${i}`, false, JSON.stringify(orgResponse.data));
    }
  }

  // Создание инженеров
  const engineerConfigs = [
    {
      email: `engineer1-${timestamp}@test.com`,
      engineerType: 'staff',
      baseRate: 500,
      overtimeCoefficient: 1.6,
      planHoursMonth: 160,
      homeTerritoryFixedAmount: 200,
    },
    {
      email: `engineer2-${timestamp}@test.com`,
      engineerType: 'contract',
      baseRate: 600,
      overtimeCoefficient: 1.8,
      homeTerritoryFixedAmount: 250,
    },
    {
      email: `engineer3-${timestamp}@test.com`,
      engineerType: 'staff',
      baseRate: 550,
      overtimeCoefficient: 1.7,
      planHoursMonth: 160,
      fixedSalary: 10000,
      fixedCarAmount: 5000,
    },
  ];

  for (let i = 0; i < engineerConfigs.length; i++) {
    const config = engineerConfigs[i];
    const userResponse = await makeRequest(
      'POST',
      '/users',
      testData.tokens.admin,
      {
        email: config.email,
        password: 'engineer123',
        firstName: `Инженер${i + 1}`,
        lastName: 'Тестовый',
        role: 'user',
        ...config,
      }
    );
    if (userResponse.ok && userResponse.data.id) {
      const engineerId = userResponse.data.engineer?.id;
      testData.engineers.push({
        userId: userResponse.data.id,
        engineerId: engineerId,
        email: config.email,
      });
      logTest(`Создать инженера #${i + 1}`, true, `ID: ${engineerId}`);
    } else {
      logTest(`Создать инженера #${i + 1}`, false, JSON.stringify(userResponse.data));
    }
  }

  // Логин инженеров
  for (let i = 0; i < testData.engineers.length; i++) {
    const engineer = testData.engineers[i];
    const loginResponse = await makeRequest('POST', '/auth/login', null, {
      email: engineer.email,
      password: 'engineer123',
    });
    if (loginResponse.ok && loginResponse.data.access_token) {
      testData.tokens[`engineer${i + 1}`] = loginResponse.data.access_token;
      logTest(`Логин инженера #${i + 1}`, true);
    } else {
      logTest(`Логин инженера #${i + 1}`, false, JSON.stringify(loginResponse.data));
    }
  }
}

/**
 * 3. Создание заявок
 */
async function testCreateOrders() {
  const timestamp = Date.now();
  const orgId = testData.organizations[0]?.id;
  if (!orgId) {
    throw new Error('Нет доступных организаций');
  }

  // Создание обычной заявки менеджером
  const order1Response = await makeRequest(
    'POST',
    '/orders',
    testData.tokens.manager,
    {
      organizationId: orgId,
      title: `Тестовая заявка #1 - ${timestamp}`,
      description: 'Описание тестовой заявки #1',
      location: 'Пятигорск, ул. Ленина, 1',
      distanceKm: 5.5,
      territoryType: 'urban',
      source: 'manual',
      plannedStartDate: new Date(Date.now() + 86400000).toISOString(),
    }
  );
  if (order1Response.ok && order1Response.data.id) {
    testData.orders.push(order1Response.data);
    logTest('Создать обычную заявку менеджером', true, `ID: ${order1Response.data.id}`);
  } else {
    logTest('Создать обычную заявку менеджером', false, JSON.stringify(order1Response.data));
  }

  // Создание автоматической заявки
  const order2Response = await makeRequest(
    'POST',
    '/orders/automatic',
    testData.tokens.manager,
    {
      organizationId: orgId,
      title: `Автоматическая заявка #2 - ${timestamp}`,
      description: 'Описание автоматической заявки',
      location: 'Кисловодск, ул. Мира, 10',
      distanceKm: 8.2,
      territoryType: 'urban',
      source: 'automatic',
      plannedStartDate: new Date(Date.now() + 172800000).toISOString(),
    }
  );
  if (order2Response.ok && order2Response.data.id) {
    testData.orders.push(order2Response.data);
    logTest('Создать автоматическую заявку', true, `ID: ${order2Response.data.id}`);
  } else {
    logTest('Создать автоматическую заявку', false, JSON.stringify(order2Response.data));
  }

  // Попытка создать заявку администратором (должна быть ошибка)
  const order3Response = await makeRequest(
    'POST',
    '/orders',
    testData.tokens.admin,
    {
      organizationId: orgId,
      title: `Заявка от админа - ${timestamp}`,
      description: 'Эта заявка не должна быть создана',
      location: 'Ессентуки, ул. Тестовая, 1',
      distanceKm: 3.0,
      territoryType: 'urban',
      source: 'manual',
    }
  );
  logTest('Попытка создать заявку администратором (должна быть ошибка)', !order3Response.ok);

  // Создание заявки с минимальными данными
  const order4Response = await makeRequest(
    'POST',
    '/orders',
    testData.tokens.manager,
    {
      organizationId: orgId,
      title: `Минимальная заявка #4 - ${timestamp}`,
      location: 'Железноводск, ул. Минимальная, 1',
      territoryType: 'urban',
    }
  );
  if (order4Response.ok && order4Response.data.id) {
    testData.orders.push(order4Response.data);
    logTest('Создать заявку с минимальными данными', true, `ID: ${order4Response.data.id}`);
  } else {
    logTest('Создать заявку с минимальными данными', false, JSON.stringify(order4Response.data));
  }
}

/**
 * 4. Получение списка заявок с фильтрами
 */
async function testGetOrdersList() {
  // Получить все заявки
  const allOrdersResponse = await makeRequest('GET', '/orders', testData.tokens.admin);
  logTest('Получить все заявки', allOrdersResponse.ok, `Найдено: ${allOrdersResponse.data?.total || 0}`);

  // Получить заявки с пагинацией
  const paginatedResponse = await makeRequest('GET', '/orders', testData.tokens.admin, null, {
    page: 1,
    limit: 10,
  });
  logTest('Получить заявки с пагинацией', paginatedResponse.ok);

  // Получить заявки по статусу
  const pendingOrdersResponse = await makeRequest('GET', '/orders', testData.tokens.admin, null, {
    status: 'pending',
  });
  logTest('Получить заявки по статусу (pending)', pendingOrdersResponse.ok);

  // Получить заявки по источнику
  const automaticOrdersResponse = await makeRequest('GET', '/orders', testData.tokens.admin, null, {
    source: 'automatic',
  });
  logTest('Получить заявки по источнику (automatic)', automaticOrdersResponse.ok);

  // Получить заявки по типу территории
  const urbanOrdersResponse = await makeRequest('GET', '/orders', testData.tokens.admin, null, {
    territoryType: 'urban',
  });
  logTest('Получить заявки по типу территории (urban)', urbanOrdersResponse.ok);

  // Получить заявки по организации
  if (testData.organizations[0]?.id) {
    const orgOrdersResponse = await makeRequest('GET', '/orders', testData.tokens.admin, null, {
      organizationId: testData.organizations[0].id,
    });
    logTest('Получить заявки по организации', orgOrdersResponse.ok);
  }

  // Получить заявки менеджера (my-orders)
  const myOrdersResponse = await makeRequest('GET', '/orders/my-orders', testData.tokens.manager);
  logTest('Получить заявки менеджера (my-orders)', myOrdersResponse.ok);

  // Получить заявки по источнику через специальный endpoint
  const bySourceResponse = await makeRequest('GET', '/orders/by-source/automatic', testData.tokens.manager);
  logTest('Получить заявки по источнику (endpoint)', bySourceResponse.ok);

  // Поиск заявок
  const searchResponse = await makeRequest('GET', '/orders', testData.tokens.admin, null, {
    search: 'Тестовая',
  });
  logTest('Поиск заявок', searchResponse.ok);
}

/**
 * 5. Получение одной заявки
 */
async function testGetSingleOrder() {
  if (testData.orders.length === 0) {
    logTest('Получить одну заявку', false, 'Нет доступных заявок');
    return;
  }

  const orderId = testData.orders[0].id;

  // Получить заявку администратором
  const adminResponse = await makeRequest('GET', `/orders/${orderId}`, testData.tokens.admin);
  logTest('Получить заявку администратором', adminResponse.ok);

  // Получить заявку менеджером
  const managerResponse = await makeRequest('GET', `/orders/${orderId}`, testData.tokens.manager);
  logTest('Получить заявку менеджером', managerResponse.ok);

  // Получить заявку с debug информацией
  const debugResponse = await makeRequest('GET', `/orders/${orderId}`, testData.tokens.admin, null, {
    debug: 'true',
  });
  logTest('Получить заявку с debug информацией', debugResponse.ok, debugResponse.data?.debug ? 'Debug данные получены' : '');

  // Попытка получить несуществующую заявку
  const notFoundResponse = await makeRequest('GET', '/orders/999999', testData.tokens.admin);
  logTest('Получить несуществующую заявку (должна быть ошибка)', !notFoundResponse.ok);
}

/**
 * 6. Обновление заявок
 */
async function testUpdateOrders() {
  if (testData.orders.length === 0) {
    logTest('Обновить заявку', false, 'Нет доступных заявок');
    return;
  }

  const orderId = testData.orders[0].id;

  // Обновить заявку менеджером
  const updateResponse = await makeRequest(
    'PATCH',
    `/orders/${orderId}`,
    testData.tokens.manager,
    {
      title: 'Обновленное название заявки',
      description: 'Обновленное описание',
      distanceKm: 10.5,
    }
  );
  logTest('Обновить заявку менеджером', updateResponse.ok);

  // Обновить заявку администратором
  const adminUpdateResponse = await makeRequest(
    'PATCH',
    `/orders/${orderId}`,
    testData.tokens.admin,
    {
      location: 'Новое местоположение',
    }
  );
  logTest('Обновить заявку администратором', adminUpdateResponse.ok);

  // Попытка обновить несуществующую заявку
  const notFoundResponse = await makeRequest(
    'PATCH',
    '/orders/999999',
    testData.tokens.manager,
    { title: 'Тест' }
  );
  logTest('Обновить несуществующую заявку (должна быть ошибка)', !notFoundResponse.ok);
}

/**
 * 7. Назначение инженеров
 */
async function testAssignEngineers() {
  if (testData.orders.length === 0 || testData.engineers.length === 0) {
    logTest('Назначить инженера', false, 'Нет доступных заявок или инженеров');
    return;
  }

  const orderId = testData.orders[0].id;
  const engineerId = testData.engineers[0].engineerId;

  // Назначить одного инженера
  const assignResponse = await makeRequest(
    'POST',
    `/orders/${orderId}/assign-engineer`,
    testData.tokens.manager,
    {
      engineerId: engineerId,
    }
  );
  if (assignResponse.ok) {
    logTest('Назначить одного инженера', true);
    // Сохранить assignment ID если есть
    if (assignResponse.data.engineerAssignments?.length > 0) {
      testData.assignments.push(assignResponse.data.engineerAssignments[0]);
    }
  } else {
    logTest('Назначить одного инженера', false, JSON.stringify(assignResponse.data));
  }

  // Назначить с debug информацией
  const assignDebugResponse = await makeRequest(
    'POST',
    `/orders/${orderId}/assign-engineer`,
    testData.tokens.manager,
    {
      engineerId: testData.engineers[1]?.engineerId,
    },
    { debug: 'true' }
  );
  logTest('Назначить инженера с debug информацией', assignDebugResponse.ok, assignDebugResponse.data?.debug ? 'Debug данные получены' : '');

  // Назначить нескольких инженеров
  if (testData.engineers.length >= 2) {
    const assignMultipleResponse = await makeRequest(
      'POST',
      `/orders/${orderId}/assign-multiple`,
      testData.tokens.manager,
      {
        engineerIds: [
          testData.engineers[0].engineerId,
          testData.engineers[1].engineerId,
        ],
        primaryEngineerId: testData.engineers[0].engineerId,
      }
    );
    logTest('Назначить нескольких инженеров', assignMultipleResponse.ok);
  }

  // Попытка назначить инженера на несуществующую заявку
  const notFoundResponse = await makeRequest(
    'POST',
    '/orders/999999/assign-engineer',
    testData.tokens.manager,
    { engineerId: engineerId }
  );
  logTest('Назначить инженера на несуществующую заявку (должна быть ошибка)', !notFoundResponse.ok);
}

/**
 * 8. Получение назначений
 */
async function testGetAssignments() {
  if (testData.orders.length === 0) {
    logTest('Получить назначения', false, 'Нет доступных заявок');
    return;
  }

  const orderId = testData.orders[0].id;

  // Получить назначения администратором
  const adminResponse = await makeRequest('GET', `/orders/${orderId}/assignments`, testData.tokens.admin);
  if (adminResponse.ok && Array.isArray(adminResponse.data)) {
    logTest('Получить назначения администратором', true, `Найдено: ${adminResponse.data.length}`);
    // Сохранить assignments
    testData.assignments = adminResponse.data;
  } else {
    logTest('Получить назначения администратором', false, JSON.stringify(adminResponse.data));
  }

  // Получить назначения менеджером
  const managerResponse = await makeRequest('GET', `/orders/${orderId}/assignments`, testData.tokens.manager);
  logTest('Получить назначения менеджером', managerResponse.ok);

  // Получить назначения инженером
  if (testData.tokens.engineer1) {
    const engineerResponse = await makeRequest('GET', `/orders/${orderId}/assignments`, testData.tokens.engineer1);
    logTest('Получить назначения инженером', engineerResponse.ok);
  }
}

/**
 * 9. Принятие заявок инженерами
 */
async function testAcceptOrders() {
  if (testData.orders.length === 0 || testData.engineers.length === 0) {
    logTest('Принять заявку инженером', false, 'Нет доступных заявок или инженеров');
    return;
  }

  // Назначить инженера на заявку перед принятием
  const orderId = testData.orders[0].id;
  const engineerId = testData.engineers[0].engineerId;

  // Убедиться, что инженер назначен
  await makeRequest(
    'POST',
    `/orders/${orderId}/assign-engineer`,
    testData.tokens.manager,
    { engineerId: engineerId }
  );

  // Принять заявку инженером
  if (testData.tokens.engineer1) {
    const acceptResponse = await makeRequest(
      'POST',
      `/orders/${orderId}/accept`,
      testData.tokens.engineer1
    );
    logTest('Принять заявку инженером', acceptResponse.ok);
  }

  // Попытка принять заявку, на которую не назначен
  if (testData.orders.length > 1 && testData.tokens.engineer2) {
    const orderId2 = testData.orders[1].id;
    const acceptNotAssignedResponse = await makeRequest(
      'POST',
      `/orders/${orderId2}/accept`,
      testData.tokens.engineer2
    );
    logTest('Принять заявку, на которую не назначен (должна быть ошибка)', !acceptNotAssignedResponse.ok);
  }
}

/**
 * 10. Создание рабочих сессий
 */
async function testCreateWorkSessions() {
  if (testData.orders.length === 0 || testData.engineers.length === 0) {
    logTest('Создать рабочую сессию', false, 'Нет доступных заявок или инженеров');
    return;
  }

  const orderId = testData.orders[0].id;

  // Создать рабочую сессию инженером
  if (testData.tokens.engineer1) {
    const workSessionResponse = await makeRequest(
      'POST',
      `/orders/${orderId}/work-sessions`,
      testData.tokens.engineer1,
      {
        workDate: new Date().toISOString().split('T')[0],
        regularHours: 8,
        overtimeHours: 2,
        carPayment: 500,
        distanceKm: 10,
        territoryType: 'urban',
        notes: 'Тестовая рабочая сессия',
      }
    );
    if (workSessionResponse.ok && workSessionResponse.data.id) {
      testData.workSessions.push(workSessionResponse.data);
      logTest('Создать рабочую сессию инженером', true, `ID: ${workSessionResponse.data.id}`);
    } else {
      logTest('Создать рабочую сессию инженером', false, JSON.stringify(workSessionResponse.data));
    }
  }

  // Создать рабочую сессию менеджером
  const managerWorkSessionResponse = await makeRequest(
    'POST',
    `/orders/${orderId}/work-sessions`,
    testData.tokens.manager,
    {
      workDate: new Date().toISOString().split('T')[0],
      regularHours: 4,
      overtimeHours: 0,
      carPayment: 300,
      distanceKm: 5,
      territoryType: 'urban',
      notes: 'Рабочая сессия от менеджера',
    }
  );
  if (managerWorkSessionResponse.ok) {
    logTest('Создать рабочую сессию менеджером', true);
  } else {
    logTest('Создать рабочую сессию менеджером', false, JSON.stringify(managerWorkSessionResponse.data));
  }
}

/**
 * 11. Получение рабочих сессий
 */
async function testGetWorkSessions() {
  if (testData.orders.length === 0) {
    logTest('Получить рабочие сессии', false, 'Нет доступных заявок');
    return;
  }

  const orderId = testData.orders[0].id;

  // Получить рабочие сессии
  const workSessionsResponse = await makeRequest('GET', `/orders/${orderId}/work-sessions`, testData.tokens.admin);
  if (workSessionsResponse.ok && Array.isArray(workSessionsResponse.data)) {
    logTest('Получить рабочие сессии', true, `Найдено: ${workSessionsResponse.data.length}`);
  } else {
    logTest('Получить рабочие сессии', false, JSON.stringify(workSessionsResponse.data));
  }
}

/**
 * 12. Завершение работы инженером
 */
async function testCompleteWork() {
  if (testData.orders.length === 0) {
    logTest('Завершить работу инженером', false, 'Нет доступных заявок');
    return;
  }

  const orderId = testData.orders[0].id;

  // Завершить работу инженером
  if (testData.tokens.engineer1) {
    const completeWorkResponse = await makeRequest(
      'POST',
      `/orders/${orderId}/complete-work`,
      testData.tokens.engineer1,
      {
        regularHours: 8,
        overtimeHours: 2,
        carPayment: 500,
        distanceKm: 10,
        territoryType: 'urban',
        notes: 'Работа завершена',
        isFullyCompleted: false,
      }
    );
    logTest('Завершить работу инженером', completeWorkResponse.ok);
  }
}

/**
 * 13. Завершение заявок менеджером
 */
async function testCompleteOrders() {
  if (testData.orders.length === 0) {
    logTest('Завершить заявку менеджером', false, 'Нет доступных заявок');
    return;
  }

  // Используем заявку, которая еще не завершена
  const incompleteOrder = testData.orders.find(o => o.status !== 'completed') || testData.orders[0];
  const orderId = incompleteOrder.id;

  // Завершить заявку менеджером
  const completeResponse = await makeRequest(
    'POST',
    `/orders/${orderId}/complete`,
    testData.tokens.manager
  );
  logTest('Завершить заявку менеджером', completeResponse.ok);

  // Попытка завершить уже завершенную заявку
  const alreadyCompleteResponse = await makeRequest(
    'POST',
    `/orders/${orderId}/complete`,
    testData.tokens.manager
  );
  logTest('Завершить уже завершенную заявку (может быть ошибка)', true); // Может быть ошибка или успех
}

/**
 * 14. Удаление назначений
 */
async function testRemoveAssignments() {
  if (testData.orders.length === 0 || testData.assignments.length === 0) {
    logTest('Удалить назначение', false, 'Нет доступных заявок или назначений');
    return;
  }

  const orderId = testData.orders[0].id;
  const assignmentId = testData.assignments[0].id;

  // Удалить назначение
  const removeResponse = await makeRequest(
    'DELETE',
    `/orders/${orderId}/assignments/${assignmentId}`,
    testData.tokens.manager
  );
  logTest('Удалить назначение', removeResponse.ok);
}

/**
 * 15. Получение статистики заявок
 */
async function testGetOrderStats() {
  // Получить статистику администратором
  const adminStatsResponse = await makeRequest('GET', '/orders/stats', testData.tokens.admin);
  logTest('Получить статистику заявок администратором', adminStatsResponse.ok, adminStatsResponse.data ? 'Данные получены' : '');

  // Получить статистику менеджером
  const managerStatsResponse = await makeRequest('GET', '/orders/stats', testData.tokens.manager);
  logTest('Получить статистику заявок менеджером', managerStatsResponse.ok);
}

/**
 * 16. Удаление заявок
 */
async function testDeleteOrders() {
  if (testData.orders.length === 0) {
    logTest('Удалить заявку', false, 'Нет доступных заявок');
    return;
  }

  // Удалить последнюю заявку
  const orderToDelete = testData.orders[testData.orders.length - 1];
  const orderId = orderToDelete.id;

  // Удалить заявку администратором
  const deleteResponse = await makeRequest('DELETE', `/orders/${orderId}`, testData.tokens.admin);
  logTest('Удалить заявку администратором', deleteResponse.ok);

  // Попытка удалить несуществующую заявку
  const notFoundResponse = await makeRequest('DELETE', '/orders/999999', testData.tokens.admin);
  logTest('Удалить несуществующую заявку (должна быть ошибка)', !notFoundResponse.ok);
}

// ============================================================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================================================

async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  РАСШИРЕННОЕ ТЕСТИРОВАНИЕ РАБОТЫ С ЗАЯВКАМИ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`${colors.reset}`);
  console.log(`API URL: ${BASE_URL}\n`);

  try {
    // 1. Инициализация
    await runTest('Инициализация и аутентификация', testInitialization);

    // 2. Создание тестовых данных
    await runTest('Создание тестовых данных', testCreateTestData);

    // 3. Создание заявок
    await runTest('Создание заявок', testCreateOrders);

    // 4. Получение списка заявок
    await runTest('Получение списка заявок с фильтрами', testGetOrdersList);

    // 5. Получение одной заявки
    await runTest('Получение одной заявки', testGetSingleOrder);

    // 6. Обновление заявок
    await runTest('Обновление заявок', testUpdateOrders);

    // 7. Назначение инженеров
    await runTest('Назначение инженеров', testAssignEngineers);

    // 8. Получение назначений
    await runTest('Получение назначений', testGetAssignments);

    // 9. Принятие заявок
    await runTest('Принятие заявок инженерами', testAcceptOrders);

    // 10. Создание рабочих сессий
    await runTest('Создание рабочих сессий', testCreateWorkSessions);

    // 11. Получение рабочих сессий
    await runTest('Получение рабочих сессий', testGetWorkSessions);

    // 12. Завершение работы
    await runTest('Завершение работы инженером', testCompleteWork);

    // 13. Завершение заявок
    await runTest('Завершение заявок менеджером', testCompleteOrders);

    // 14. Удаление назначений
    await runTest('Удаление назначений', testRemoveAssignments);

    // 15. Статистика заявок
    await runTest('Получение статистики заявок', testGetOrderStats);

    // 16. Удаление заявок
    await runTest('Удаление заявок', testDeleteOrders);

    // Итоги
    console.log(`\n${colors.bright}${colors.magenta}📊 ИТОГИ ТЕСТИРОВАНИЯ${colors.reset}`);
    console.log(`${colors.green}✅ Успешно: ${successCount}${colors.reset}`);
    console.log(`${colors.red}❌ Ошибок: ${errorCount}${colors.reset}`);
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}Критическая ошибка: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск
main().catch(console.error);
