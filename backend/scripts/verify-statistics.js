#!/usr/bin/env node

/**
 * Скрипт для проверки корректности статистики после завершения заказов
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

function printData(label, data, indent = 0) {
  const indentStr = '  '.repeat(indent);
  if (data === null || data === undefined) {
    log(`${indentStr}${label}: null`, 'yellow');
    return;
  }
  if (typeof data === 'object' && !Array.isArray(data)) {
    log(`${indentStr}${label}:`, 'blue');
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        printData(key, value, indent + 1);
      } else if (Array.isArray(value)) {
        log(`${indentStr}  ${key}: [${value.length} элементов]`, 'cyan');
        if (value.length > 0 && typeof value[0] === 'object') {
          value.slice(0, 3).forEach((item, idx) => {
            printData(`[${idx}]`, item, indent + 2);
          });
          if (value.length > 3) {
            log(`${indentStr}    ... и еще ${value.length - 3} элементов`, 'yellow');
          }
        }
      } else {
        const displayValue = typeof value === 'number' ? value.toLocaleString('ru-RU') : String(value);
        log(`${indentStr}  ${key}: ${displayValue}`, 'green');
      }
    });
  } else if (Array.isArray(data)) {
    log(`${indentStr}${label}: [${data.length} элементов]`, 'cyan');
  } else {
    const displayValue = typeof data === 'number' ? data.toLocaleString('ru-RU') : String(data);
    log(`${indentStr}${label}: ${displayValue}`, 'green');
  }
}

async function main() {
  log('\n' + '═'.repeat(70), 'cyan');
  log('  ПРОВЕРКА КОРРЕКТНОСТИ СТАТИСТИКИ', 'cyan');
  log('═'.repeat(70), 'cyan');
  log(`API URL: ${BASE_URL}\n`, 'reset');

  try {
    // Аутентификация
    const login = await makeRequest('POST', '/auth/login', null, {
      email: 'admin@coffee.com',
      password: 'admin123',
    });

    if (!login.ok || !login.data.access_token) {
      throw new Error('Не удалось войти');
    }

    const token = login.data.access_token;
    log('✅ Аутентификация успешна', 'green');

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    // 1. Статистика заявок
    log('\n' + '═'.repeat(70), 'magenta');
    log('1. СТАТИСТИКА ЗАЯВОК', 'magenta');
    log('═'.repeat(70), 'magenta');
    const orderStats = await makeRequest('GET', '/orders/stats', token);
    if (orderStats.ok) {
      log('✅ Статистика заявок получена', 'green');
      printData('Данные', orderStats.data);
    } else {
      log('❌ Ошибка получения статистики заявок', 'red');
    }

    // 2. Месячная статистика
    log('\n' + '═'.repeat(70), 'magenta');
    log('2. МЕСЯЧНАЯ СТАТИСТИКА', 'magenta');
    log('═'.repeat(70), 'magenta');
    const monthlyStats = await makeRequest('GET', '/statistics/monthly', token, null, {
      year,
      month,
    });
    if (monthlyStats.ok) {
      log('✅ Месячная статистика получена', 'green');
      printData('Данные', monthlyStats.data);
    } else {
      log('❌ Ошибка получения месячной статистики', 'red');
    }

    // 3. Комплексная статистика
    log('\n' + '═'.repeat(70), 'magenta');
    log('3. КОМПЛЕКСНАЯ СТАТИСТИКА', 'magenta');
    log('═'.repeat(70), 'magenta');
    const comprehensiveStats = await makeRequest('GET', '/statistics/comprehensive', token, null, {
      year,
      month,
      includeTimeBased: true,
      includeFinancial: true,
      includeRankings: true,
      includeForecast: true,
    });
    if (comprehensiveStats.ok) {
      log('✅ Комплексная статистика получена', 'green');
      printData('Данные', comprehensiveStats.data);
    } else {
      log('❌ Ошибка получения комплексной статистики', 'red');
    }

    // 4. Статистика инженеров для админа
    log('\n' + '═'.repeat(70), 'magenta');
    log('4. СТАТИСТИКА ИНЖЕНЕРОВ (ADMIN)', 'magenta');
    log('═'.repeat(70), 'magenta');
    const adminEngineersStats = await makeRequest('GET', '/statistics/admin/engineers', token, null, {
      year,
      month,
    });
    if (adminEngineersStats.ok) {
      log('✅ Статистика инженеров получена', 'green');
      printData('Данные', adminEngineersStats.data);
    } else {
      log('❌ Ошибка получения статистики инженеров', 'red');
    }

    // 5. Задолженности
    log('\n' + '═'.repeat(70), 'magenta');
    log('5. ЗАДОЛЖЕННОСТИ ПО ОПЛАТАМ', 'magenta');
    log('═'.repeat(70), 'magenta');
    const debtsStats = await makeRequest('GET', '/statistics/payment-debts', token, null, {
      year,
      month,
    });
    if (debtsStats.ok) {
      log('✅ Статистика задолженностей получена', 'green');
      printData('Данные', debtsStats.data);
    } else {
      log('❌ Ошибка получения статистики задолженностей', 'red');
    }

    // 6. Проверка данных заказов
    log('\n' + '═'.repeat(70), 'magenta');
    log('6. ПРОВЕРКА ЗАКАЗОВ', 'magenta');
    log('═'.repeat(70), 'magenta');
    const ordersResponse = await makeRequest('GET', '/orders', token, null, {
      limit: 10,
      page: 1,
    });
    if (ordersResponse.ok) {
      const orders = ordersResponse.data.data || [];
      const completed = orders.filter(o => o.status === 'completed');
      const inProgress = orders.filter(o => ['pending', 'assigned', 'processing', 'working'].includes(o.status));
      log(`Всего заказов на странице: ${orders.length}`, 'blue');
      log(`Завершенных: ${completed.length}`, 'green');
      log(`В процессе: ${inProgress.length}`, 'yellow');
    }

    log('\n' + '═'.repeat(70), 'green');
    log('✅ ПРОВЕРКА ЗАВЕРШЕНА', 'green');
    log('═'.repeat(70) + '\n', 'green');

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

