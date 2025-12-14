#!/usr/bin/env node

/**
 * Скрипт для назначения заказов на инженеров и их завершения
 * Работает с заказами со статусом "waiting" (pending)
 */

const BASE_URL = process.env.PROD_API_URL || process.env.API_URL || 'http://localhost:3001/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

let successCount = 0;
let errorCount = 0;
let skippedCount = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(method, endpoint, token = null, body = null, queryParams = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.keys(queryParams).forEach(key => {
    if (queryParams[key] !== undefined && queryParams[key] !== null) {
      url.searchParams.append(key, queryParams[key]);
    }
  });

  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(url.toString(), options);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error: error.message, data: {} };
  }
}

async function main() {
  log('\n' + '═'.repeat(70), 'cyan');
  log('  НАЗНАЧЕНИЕ И ЗАВЕРШЕНИЕ ЗАКАЗОВ', 'cyan');
  log('═'.repeat(70), 'cyan');
  log(`API URL: ${BASE_URL}\n`, 'reset');

  try {
    // Аутентификация
    log('🔐 Аутентификация...', 'cyan');
    const adminLogin = await makeRequest('POST', '/auth/login', null, {
      email: 'admin@coffee.com',
      password: 'admin123',
    });

    if (!adminLogin.ok || !adminLogin.data.access_token) {
      throw new Error('Не удалось войти как администратор');
    }

    const adminToken = adminLogin.data.access_token;

    const managerLogin = await makeRequest('POST', '/auth/login', null, {
      email: 'manager@coffee.com',
      password: 'manager123',
    });

    const managerToken = managerLogin.ok ? managerLogin.data.access_token : adminToken;

    log('✅ Аутентификация успешна', 'green');

    // Получаем инженеров
    log('\n👷 Получение инженеров...', 'cyan');
    const usersResponse = await makeRequest('GET', '/users', adminToken, null, {
      role: 'user',
      limit: 50,
    });

    if (!usersResponse.ok || !usersResponse.data?.data) {
      throw new Error('Не удалось получить инженеров');
    }

    const engineers = usersResponse.data.data
      .filter(user => user.engineer?.id)
      .map(user => ({
        userId: user.id,
        engineerId: user.engineer.id,
        email: user.email,
      }));

    if (engineers.length === 0) {
      throw new Error('Нет доступных инженеров');
    }

    // Логиним инженеров
    const engineersWithTokens = [];
    for (const eng of engineers) {
      const passwords = ['engineer123', '123456', 'password'];
      for (const password of passwords) {
        const loginResponse = await makeRequest('POST', '/auth/login', null, {
          email: eng.email,
          password: password,
        });
        if (loginResponse.ok && loginResponse.data.access_token) {
          engineersWithTokens.push({
            ...eng,
            token: loginResponse.data.access_token,
          });
          break;
        }
      }
    }

    log(`✅ Получено инженеров с токенами: ${engineersWithTokens.length}`, 'green');

    // Получаем все заказы и фильтруем незавершенные
    log('\n📋 Получение заказов...', 'cyan');
    let allOrders = [];
    let page = 1;
    const limit = 200;

    while (true) {
      const ordersResponse = await makeRequest('GET', '/orders', adminToken, null, {
        limit: limit,
        page: page,
      });

      if (ordersResponse.ok && ordersResponse.data?.data) {
        const orders = ordersResponse.data.data;
        // Фильтруем только незавершенные
        const incompleteOrders = orders.filter(order => 
          !['completed', 'cancelled'].includes(order.status)
        );
        allOrders.push(...incompleteOrders);
        
        const total = ordersResponse.data.total || 0;
        if (orders.length < limit || allOrders.length >= total) {
          break;
        }
        page++;
      } else {
        break;
      }
    }

    // Убираем дубликаты
    allOrders = Array.from(new Map(allOrders.map(order => [order.id, order])).values());

    log(`✅ Найдено незавершенных заказов: ${allOrders.length}`, 'green');

    if (allOrders.length === 0) {
      log('\n✅ Нет заказов для обработки', 'green');
      return;
    }

    log(`\n🚀 Начинаем обработку ${allOrders.length} заказов...\n`, 'cyan');

    // Обрабатываем заказы
    for (let i = 0; i < allOrders.length; i++) {
      const order = allOrders[i];
      log(`[${i + 1}/${allOrders.length}] Заказ #${order.id}: ${order.title || 'без названия'}`, 'bright');

      try {
        // Выбираем случайного инженера
        const engineer = engineersWithTokens[Math.floor(Math.random() * engineersWithTokens.length)];

        // 1. Назначаем инженера
        log(`   👤 Назначаем инженера: ${engineer.email}`, 'blue');
        const assignResponse = await makeRequest(
          'POST',
          `/orders/${order.id}/assign-engineer`,
          managerToken,
          { engineerId: engineer.engineerId }
        );

        if (!assignResponse.ok) {
          log(`   ❌ Ошибка назначения: ${JSON.stringify(assignResponse.data)}`, 'red');
          errorCount++;
          continue;
        }

        // 2. Инженер принимает заявку
        log(`   ✅ Инженер принимает заявку...`, 'blue');
        const acceptResponse = await makeRequest(
          'POST',
          `/orders/${order.id}/accept`,
          engineer.token
        );

        if (!acceptResponse.ok) {
          log(`   ⚠️  Не удалось принять (возможно уже принята)`, 'yellow');
        }

        // 3. Создаем рабочую сессию
        log(`   📝 Создаем рабочую сессию...`, 'blue');
        const workSessionResponse = await makeRequest(
          'POST',
          `/orders/${order.id}/work-sessions`,
          engineer.token,
          {
            workDate: new Date().toISOString().split('T')[0],
            regularHours: Math.floor(Math.random() * 4) + 4,
            overtimeHours: Math.floor(Math.random() * 2),
            carPayment: Math.floor(Math.random() * 300) + 200,
            distanceKm: order.distanceKm || Math.floor(Math.random() * 10) + 5,
            territoryType: order.territoryType || 'urban',
            notes: 'Работа завершена автоматически',
          }
        );

        if (!workSessionResponse.ok) {
          log(`   ⚠️  Не удалось создать рабочую сессию: ${JSON.stringify(workSessionResponse.data)}`, 'yellow');
        }

        // 4. Завершаем работу
        log(`   🔧 Завершаем работу...`, 'blue');
        const completeWorkResponse = await makeRequest(
          'POST',
          `/orders/${order.id}/complete-work`,
          engineer.token,
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
        }

        // 5. Завершаем заявку менеджером
        log(`   ✅ Завершаем заявку менеджером...`, 'blue');
        const completeResponse = await makeRequest(
          'POST',
          `/orders/${order.id}/complete`,
          managerToken
        );

        if (completeResponse.ok) {
          log(`   ✅ Заявка завершена`, 'green');
          successCount++;
        } else {
          log(`   ❌ Ошибка завершения: ${JSON.stringify(completeResponse.data)}`, 'red');
          errorCount++;
        }

        // Задержка между запросами
        if (i < allOrders.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }

      } catch (error) {
        log(`   ❌ Критическая ошибка: ${error.message}`, 'red');
        errorCount++;
      }
    }

    // Итоги
    log('\n' + '═'.repeat(70), 'magenta');
    log('📊 ИТОГИ ОБРАБОТКИ', 'magenta');
    log('═'.repeat(70), 'magenta');
    log(`✅ Успешно завершено: ${successCount}`, 'green');
    log(`⚠️  Пропущено: ${skippedCount}`, 'yellow');
    log(`❌ Ошибок: ${errorCount}`, errorCount > 0 ? 'red' : 'green');
    log(`📈 Всего обработано: ${allOrders.length}`, 'cyan');
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

main().catch(console.error);

