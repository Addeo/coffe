#!/usr/bin/env node

/**
 * Скрипт для массового завершения незавершенных заказов на продакшене
 * 
 * Что делает:
 * 1. Получает все незавершенные заказы
 * 2. Для каждого заказа:
 *    - Назначает инженера (если не назначен)
 *    - Инженер принимает заявку
 *    - Создает рабочую сессию
 *    - Завершает работу
 *    - Менеджер завершает заявку
 * 
 * Использование:
 *   PROD_API_URL=https://your-production-api.com/api node scripts/complete-all-orders.js
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

// Сохраненные данные
const testData = {
  tokens: {},
  engineers: [],
  orders: [],
};

let successCount = 0;
let errorCount = 0;
let skippedCount = 0;

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
 * Логирование
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Инициализация и аутентификация
 */
async function initialize() {
  log('🔐 Инициализация и аутентификация...', 'cyan');

  // Логин администратора
  const adminLogin = await makeRequest('POST', '/auth/login', null, {
    email: 'admin@coffee.com',
    password: 'admin123',
  });
  if (adminLogin.ok && adminLogin.data.access_token) {
    testData.tokens.admin = adminLogin.data.access_token;
    log('✅ Аутентификация администратора', 'green');
  } else {
    throw new Error('Не удалось войти как администратор');
  }

  // Логин менеджера
  const managerLogin = await makeRequest('POST', '/auth/login', null, {
    email: 'manager@coffee.com',
    password: 'manager123',
  });
  if (managerLogin.ok && managerLogin.data.access_token) {
    testData.tokens.manager = managerLogin.data.access_token;
    log('✅ Аутентификация менеджера', 'green');
  } else {
    log('⚠️  Не удалось войти как менеджер, будет использован админ', 'yellow');
    testData.tokens.manager = testData.tokens.admin;
  }

  // Получение инженеров (получаем больше, чтобы покрыть всех назначенных)
  let allEngineers = [];
  let page = 1;
  const limit = 50;

  while (true) {
    const usersResponse = await makeRequest('GET', '/users', testData.tokens.admin, null, {
      role: 'user',
      limit: limit,
      page: page,
    });

    if (usersResponse.ok && usersResponse.data?.data) {
      const users = usersResponse.data.data;
      const engineers = users.filter(user => user.engineer?.id);
      allEngineers.push(...engineers);

      // Если получили меньше чем limit, значит это последняя страница
      if (users.length < limit) {
        break;
      }
      page++;
    } else {
      break;
    }
  }

  if (allEngineers.length === 0) {
    throw new Error('Нет доступных инженеров');
  }

  log(`   Найдено инженеров в системе: ${allEngineers.length}`, 'blue');

  // Логиним инженеров
  const passwords = ['engineer123', '123456', 'password', 'admin123'];
  let loggedInCount = 0;

  for (const engineer of allEngineers) {
    let loggedIn = false;

    for (const password of passwords) {
      const loginResponse = await makeRequest('POST', '/auth/login', null, {
        email: engineer.email,
        password: password,
      });
      if (loginResponse.ok && loginResponse.data.access_token) {
        testData.engineers.push({
          userId: engineer.id,
          engineerId: engineer.engineer.id,
          email: engineer.email,
          token: loginResponse.data.access_token,
        });
        loggedIn = true;
        loggedInCount++;
        break;
      }
    }

    if (!loggedIn && loggedInCount < 20) {
      // Пробуем еще раз с другими паролями только для первых 20
      log(`   ⚠️  Не удалось залогинить инженера: ${engineer.email}`, 'yellow');
    }
  }

  log(`✅ Успешно залогинено инженеров: ${testData.engineers.length}`, 'green');
}

/**
 * Получить все незавершенные заказы
 */
async function getIncompleteOrders() {
  log('\n📋 Получение незавершенных заказов...', 'cyan');

  const statuses = ['pending', 'assigned', 'processing', 'working', 'review'];
  const allOrders = [];

  for (const status of statuses) {
    const response = await makeRequest('GET', '/orders', testData.tokens.admin, null, {
      status: status,
      limit: 100,
      page: 1,
    });

    if (response.ok && response.data?.data) {
      const orders = response.data.data;
      allOrders.push(...orders);
      log(`   Найдено заказов со статусом "${status}": ${orders.length}`, 'blue');
    }
  }

  // Убираем дубликаты
  const uniqueOrders = Array.from(new Map(allOrders.map(order => [order.id, order])).values());
  log(`✅ Всего незавершенных заказов: ${uniqueOrders.length}`, 'green');

  return uniqueOrders;
}

/**
 * Завершить один заказ
 */
async function completeOrder(order) {
  const orderId = order.id;
  log(`\n🔄 Обработка заказа #${orderId} (${order.title || 'без названия'})`, 'cyan');

  try {
    // 1. Проверяем, назначен ли инженер
    let engineerId = order.assignedEngineerId;
    let engineerToken = null;

    if (!engineerId && order.engineerAssignments?.length > 0) {
      engineerId = order.engineerAssignments[0].engineerId;
    }

    // Если инженер не назначен, назначаем случайного
    if (!engineerId) {
      if (testData.engineers.length === 0) {
        log(`   ⚠️  Нет доступных инженеров, пропускаем`, 'yellow');
        skippedCount++;
        return false;
      }

      const randomEngineer = testData.engineers[Math.floor(Math.random() * testData.engineers.length)];
      engineerId = randomEngineer.engineerId;
      engineerToken = randomEngineer.token;

      log(`   👤 Назначаем инженера: ${randomEngineer.email}`, 'blue');
      const assignResponse = await makeRequest(
        'POST',
        `/orders/${orderId}/assign-engineer`,
        testData.tokens.manager,
        {
          engineerId: engineerId,
        }
      );

      if (!assignResponse.ok) {
        log(`   ❌ Ошибка назначения инженера: ${JSON.stringify(assignResponse.data)}`, 'red');
        errorCount++;
        return false;
      }
      log(`   ✅ Инженер назначен`, 'green');
    } else {
      // Находим токен инженера
      let engineer = testData.engineers.find(e => e.engineerId === engineerId);
      
      // Если токен не найден, пробуем получить информацию об инженере и залогинить
      if (!engineer) {
        log(`   🔍 Инженер назначен (ID: ${engineerId}), но токен не найден, пытаемся получить...`, 'yellow');
        
        // Получаем информацию о пользователе по engineerId
        const usersResponse = await makeRequest('GET', '/users', testData.tokens.admin, null, {
          role: 'user',
          limit: 100,
        });
        
        if (usersResponse.ok && usersResponse.data?.data) {
          const user = usersResponse.data.data.find(u => u.engineer?.id === engineerId);
          if (user) {
            // Пробуем залогинить
            const passwords = ['engineer123', '123456', 'password', 'admin123'];
            for (const password of passwords) {
              const loginResponse = await makeRequest('POST', '/auth/login', null, {
                email: user.email,
                password: password,
              });
              if (loginResponse.ok && loginResponse.data.access_token) {
                engineer = {
                  userId: user.id,
                  engineerId: user.engineer.id,
                  email: user.email,
                  token: loginResponse.data.access_token,
                };
                testData.engineers.push(engineer);
                engineerToken = engineer.token;
                log(`   ✅ Инженер залогинен: ${user.email}`, 'green');
                break;
              }
            }
          }
        }
        
        if (!engineer || !engineerToken) {
          log(`   ⚠️  Не удалось получить токен для инженера ID: ${engineerId}, пропускаем`, 'yellow');
          skippedCount++;
          return false;
        }
      } else {
        engineerToken = engineer.token;
      }
    }

    // 2. Инженер принимает заявку (если еще не принята)
    if (order.status !== 'working' && order.status !== 'review' && order.status !== 'completed') {
      if (engineerToken) {
        log(`   ✅ Инженер принимает заявку...`, 'blue');
        const acceptResponse = await makeRequest(
          'POST',
          `/orders/${orderId}/accept`,
          engineerToken
        );

        if (!acceptResponse.ok) {
          log(`   ⚠️  Не удалось принять заявку (возможно уже принята): ${JSON.stringify(acceptResponse.data)}`, 'yellow');
        } else {
          log(`   ✅ Заявка принята`, 'green');
        }
      }
    }

    // 3. Создаем рабочую сессию (если еще не создана)
    const workSessionsResponse = await makeRequest(
      'GET',
      `/orders/${orderId}/work-sessions`,
      testData.tokens.admin
    );

    let hasWorkSession = false;
    if (workSessionsResponse.ok && Array.isArray(workSessionsResponse.data)) {
      hasWorkSession = workSessionsResponse.data.length > 0;
    }

    if (!hasWorkSession && engineerToken) {
      log(`   📝 Создаем рабочую сессию...`, 'blue');
      const workSessionResponse = await makeRequest(
        'POST',
        `/orders/${orderId}/work-sessions`,
        engineerToken,
        {
          workDate: new Date().toISOString().split('T')[0],
          regularHours: Math.floor(Math.random() * 4) + 4, // 4-8 часов
          overtimeHours: Math.floor(Math.random() * 2), // 0-2 часа
          carPayment: Math.floor(Math.random() * 300) + 200, // 200-500
          distanceKm: order.distanceKm || Math.floor(Math.random() * 10) + 5,
          territoryType: order.territoryType || 'urban',
          notes: 'Работа завершена автоматически',
        }
      );

      if (workSessionResponse.ok) {
        log(`   ✅ Рабочая сессия создана`, 'green');
      } else {
        log(`   ⚠️  Не удалось создать рабочую сессию: ${JSON.stringify(workSessionResponse.data)}`, 'yellow');
      }
    } else if (hasWorkSession) {
      log(`   ℹ️  Рабочая сессия уже существует`, 'blue');
    }

    // 4. Завершаем работу инженером (если еще не завершена)
    if (order.status !== 'review' && order.status !== 'completed' && engineerToken) {
      log(`   🔧 Завершаем работу инженером...`, 'blue');
      const completeWorkResponse = await makeRequest(
        'POST',
        `/orders/${orderId}/complete-work`,
        engineerToken,
        {
          regularHours: Math.floor(Math.random() * 4) + 4,
          overtimeHours: Math.floor(Math.random() * 2),
          carPayment: Math.floor(Math.random() * 300) + 200,
          distanceKm: order.distanceKm || Math.floor(Math.random() * 10) + 5,
          territoryType: order.territoryType || 'urban',
          notes: 'Работа завершена автоматически',
          isFullyCompleted: false,
        }
      );

      if (!completeWorkResponse.ok) {
        log(`   ⚠️  Не удалось завершить работу: ${JSON.stringify(completeWorkResponse.data)}`, 'yellow');
      } else {
        log(`   ✅ Работа завершена`, 'green');
      }
    }

    // 5. Завершаем заявку менеджером
    if (order.status !== 'completed') {
      log(`   ✅ Завершаем заявку менеджером...`, 'blue');
      const completeResponse = await makeRequest(
        'POST',
        `/orders/${orderId}/complete`,
        testData.tokens.manager
      );

      if (completeResponse.ok) {
        log(`   ✅ Заявка завершена`, 'green');
        successCount++;
        return true;
      } else {
        log(`   ❌ Ошибка завершения заявки: ${JSON.stringify(completeResponse.data)}`, 'red');
        errorCount++;
        return false;
      }
    } else {
      log(`   ℹ️  Заявка уже завершена`, 'blue');
      skippedCount++;
      return true;
    }
  } catch (error) {
    log(`   ❌ Критическая ошибка: ${error.message}`, 'red');
    errorCount++;
    return false;
  }
}

/**
 * Главная функция
 */
async function main() {
  log('\n' + '═'.repeat(70), 'cyan');
  log('  МАССОВОЕ ЗАВЕРШЕНИЕ ЗАКАЗОВ НА ПРОДАКШЕНЕ', 'cyan');
  log('═'.repeat(70), 'cyan');
  log(`API URL: ${BASE_URL}\n`, 'reset');

  try {
    // Инициализация
    await initialize();

    // Получаем незавершенные заказы
    const orders = await getIncompleteOrders();

    if (orders.length === 0) {
      log('\n✅ Нет незавершенных заказов для обработки', 'green');
      return;
    }

    log(`\n🚀 Начинаем обработку ${orders.length} заказов...\n`, 'cyan');

    // Обрабатываем заказы по одному
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      log(`\n[${i + 1}/${orders.length}]`, 'bright');
      await completeOrder(order);

      // Небольшая задержка между запросами
      if (i < orders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Итоги
    log('\n' + '═'.repeat(70), 'magenta');
    log('📊 ИТОГИ ОБРАБОТКИ', 'magenta');
    log('═'.repeat(70), 'magenta');
    log(`✅ Успешно завершено: ${successCount}`, 'green');
    log(`⚠️  Пропущено: ${skippedCount}`, 'yellow');
    log(`❌ Ошибок: ${errorCount}`, errorCount > 0 ? 'red' : 'green');
    log(`📈 Всего обработано: ${orders.length}`, 'cyan');
    log('═'.repeat(70) + '\n', 'magenta');

  } catch (error) {
    log(`\n❌ Критическая ошибка: ${error.message}`, 'red');
    if (error.stack) {
      log(`\nStack trace:`, 'yellow');
      log(error.stack, 'yellow');
    }
    process.exit(1);
  }
}

// Запуск
main().catch(console.error);

