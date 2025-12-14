#!/usr/bin/env node

/**
 * Детальный анализ статистики
 * Проверяет все endpoints статистики и выводит подробную информацию
 *
 * Использование:
 *   API_URL=http://localhost:3001/api node scripts/analyze-statistics.js
 *   PROD_API_URL=https://your-production-api.com/api node scripts/analyze-statistics.js
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
};

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
 * Вывести разделитель
 */
function printSeparator(title) {
  console.log(`\n${colors.cyan}${colors.bright}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}${'═'.repeat(70)}${colors.reset}\n`);
}

/**
 * Вывести данные в структурированном виде
 */
function printData(label, data, indent = 0) {
  const indentStr = '  '.repeat(indent);
  
  if (data === null || data === undefined) {
    console.log(`${indentStr}${colors.yellow}${label}: ${colors.reset}null`);
    return;
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    console.log(`${indentStr}${colors.blue}${label}:${colors.reset}`);
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        printData(key, value, indent + 1);
      } else if (Array.isArray(value)) {
        console.log(`${indentStr}  ${colors.cyan}${key}:${colors.reset} [${value.length} элементов]`);
        if (value.length > 0 && typeof value[0] === 'object') {
          value.slice(0, 3).forEach((item, idx) => {
            console.log(`${indentStr}    ${colors.yellow}[${idx}]:${colors.reset}`);
            printData('', item, indent + 2);
          });
          if (value.length > 3) {
            console.log(`${indentStr}    ${colors.yellow}... и еще ${value.length - 3} элементов${colors.reset}`);
          }
        } else {
          console.log(`${indentStr}    ${value.slice(0, 5).join(', ')}${value.length > 5 ? '...' : ''}`);
        }
      } else {
        const displayValue = typeof value === 'number' ? value.toLocaleString('ru-RU') : String(value);
        console.log(`${indentStr}  ${colors.green}${key}:${colors.reset} ${displayValue}`);
      }
    });
  } else if (Array.isArray(data)) {
    console.log(`${indentStr}${colors.cyan}${label}:${colors.reset} [${data.length} элементов]`);
    data.slice(0, 5).forEach((item, idx) => {
      if (typeof item === 'object') {
        printData(`[${idx}]`, item, indent + 1);
      } else {
        console.log(`${indentStr}  [${idx}]: ${item}`);
      }
    });
    if (data.length > 5) {
      console.log(`${indentStr}  ... и еще ${data.length - 5} элементов`);
    }
  } else {
    const displayValue = typeof data === 'number' ? data.toLocaleString('ru-RU') : String(data);
    console.log(`${indentStr}${colors.green}${label}:${colors.reset} ${displayValue}`);
  }
}

/**
 * Анализ статистики заработка пользователя
 */
async function analyzeUserEarnings() {
  printSeparator('СТАТИСТИКА ЗАРАБОТКА ПОЛЬЗОВАТЕЛЯ');

  // Статистика за 12 месяцев
  const earnings12Response = await makeRequest(
    'GET',
    '/statistics/earnings',
    testData.tokens.engineer1,
    null,
    { months: 12 }
  );

  if (earnings12Response.ok) {
    console.log(`${colors.green}✅ Статистика за 12 месяцев${colors.reset}`);
    printData('Данные', earnings12Response.data);
  } else {
    console.log(`${colors.red}❌ Ошибка получения статистики за 12 месяцев${colors.reset}`);
    console.log(`   Статус: ${earnings12Response.status}`);
    console.log(`   Ответ: ${JSON.stringify(earnings12Response.data)}`);
  }

  // Статистика за 6 месяцев
  const earnings6Response = await makeRequest(
    'GET',
    '/statistics/earnings',
    testData.tokens.engineer1,
    null,
    { months: 6 }
  );

  if (earnings6Response.ok) {
    console.log(`\n${colors.green}✅ Статистика за 6 месяцев${colors.reset}`);
    printData('Данные', earnings6Response.data);
  }

  // Сравнение заработка
  const comparisonResponse = await makeRequest(
    'GET',
    '/statistics/earnings/comparison',
    testData.tokens.engineer1
  );

  if (comparisonResponse.ok) {
    console.log(`\n${colors.green}✅ Сравнение заработка${colors.reset}`);
    printData('Данные', comparisonResponse.data);
  }

  // Рейтинг пользователя
  const currentDate = new Date();
  const rankResponse = await makeRequest(
    'GET',
    '/statistics/earnings/rank',
    testData.tokens.engineer1,
    null,
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    }
  );

  if (rankResponse.ok) {
    console.log(`\n${colors.green}✅ Рейтинг пользователя${colors.reset}`);
    printData('Данные', rankResponse.data);
  }
}

/**
 * Анализ детальной статистики инженера
 */
async function analyzeEngineerDetailed() {
  printSeparator('ДЕТАЛЬНАЯ СТАТИСТИКА ИНЖЕНЕРА');

  const currentDate = new Date();
  const detailedResponse = await makeRequest(
    'GET',
    '/statistics/engineer/detailed',
    testData.tokens.engineer1,
    null,
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    }
  );

  if (detailedResponse.ok) {
    console.log(`${colors.green}✅ Детальная статистика инженера${colors.reset}`);
    printData('Данные', detailedResponse.data);
  } else {
    console.log(`${colors.red}❌ Ошибка получения детальной статистики${colors.reset}`);
    console.log(`   Статус: ${detailedResponse.status}`);
    console.log(`   Ответ: ${JSON.stringify(detailedResponse.data)}`);
  }
}

/**
 * Анализ месячной статистики
 */
async function analyzeMonthlyStatistics() {
  printSeparator('МЕСЯЧНАЯ СТАТИСТИКА (ADMIN/MANAGER)');

  const currentDate = new Date();
  
  // Текущий месяц
  const currentMonthResponse = await makeRequest(
    'GET',
    '/statistics/monthly',
    testData.tokens.admin,
    null,
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    }
  );

  if (currentMonthResponse.ok) {
    console.log(`${colors.green}✅ Статистика за текущий месяц${colors.reset}`);
    printData('Данные', currentMonthResponse.data);
  } else {
    console.log(`${colors.red}❌ Ошибка получения месячной статистики${colors.reset}`);
    console.log(`   Статус: ${currentMonthResponse.status}`);
    console.log(`   Ответ: ${JSON.stringify(currentMonthResponse.data)}`);
  }

  // Предыдущий месяц
  const prevMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
  const prevYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
  
  const prevMonthResponse = await makeRequest(
    'GET',
    '/statistics/monthly',
    testData.tokens.admin,
    null,
    {
      year: prevYear,
      month: prevMonth,
    }
  );

  if (prevMonthResponse.ok) {
    console.log(`\n${colors.green}✅ Статистика за предыдущий месяц${colors.reset}`);
    printData('Данные', prevMonthResponse.data);
  }
}

/**
 * Анализ комплексной статистики
 */
async function analyzeComprehensiveStatistics() {
  printSeparator('КОМПЛЕКСНАЯ СТАТИСТИКА');

  const currentDate = new Date();

  // Полная статистика
  const fullResponse = await makeRequest(
    'GET',
    '/statistics/comprehensive',
    testData.tokens.admin,
    null,
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      includeTimeBased: true,
      includeFinancial: true,
      includeRankings: true,
      includeForecast: true,
    }
  );

  if (fullResponse.ok) {
    console.log(`${colors.green}✅ Полная комплексная статистика${colors.reset}`);
    printData('Данные', fullResponse.data);
  } else {
    console.log(`${colors.red}❌ Ошибка получения комплексной статистики${colors.reset}`);
    console.log(`   Статус: ${fullResponse.status}`);
    console.log(`   Ответ: ${JSON.stringify(fullResponse.data)}`);
  }

  // Только временная аналитика
  const timeBasedResponse = await makeRequest(
    'GET',
    '/statistics/comprehensive',
    testData.tokens.admin,
    null,
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      includeTimeBased: true,
      includeFinancial: false,
      includeRankings: false,
      includeForecast: false,
    }
  );

  if (timeBasedResponse.ok) {
    console.log(`\n${colors.green}✅ Только временная аналитика${colors.reset}`);
    printData('Данные', timeBasedResponse.data);
  }

  // Только финансовая аналитика
  const financialResponse = await makeRequest(
    'GET',
    '/statistics/comprehensive',
    testData.tokens.admin,
    null,
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      includeTimeBased: false,
      includeFinancial: true,
      includeRankings: false,
      includeForecast: false,
    }
  );

  if (financialResponse.ok) {
    console.log(`\n${colors.green}✅ Только финансовая аналитика${colors.reset}`);
    printData('Данные', financialResponse.data);
  }

  // Только рейтинги
  const rankingsResponse = await makeRequest(
    'GET',
    '/statistics/comprehensive',
    testData.tokens.admin,
    null,
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      includeTimeBased: false,
      includeFinancial: false,
      includeRankings: true,
      includeForecast: false,
    }
  );

  if (rankingsResponse.ok) {
    console.log(`\n${colors.green}✅ Только рейтинги${colors.reset}`);
    printData('Данные', rankingsResponse.data);
  }
}

/**
 * Анализ статистики инженеров для админа
 */
async function analyzeAdminEngineerStatistics() {
  printSeparator('СТАТИСТИКА ИНЖЕНЕРОВ (ADMIN)');

  const currentDate = new Date();
  const adminEngineersResponse = await makeRequest(
    'GET',
    '/statistics/admin/engineers',
    testData.tokens.admin,
    null,
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    }
  );

  if (adminEngineersResponse.ok) {
    console.log(`${colors.green}✅ Статистика инженеров для админа${colors.reset}`);
    printData('Данные', adminEngineersResponse.data);
  } else {
    console.log(`${colors.red}❌ Ошибка получения статистики инженеров${colors.reset}`);
    console.log(`   Статус: ${adminEngineersResponse.status}`);
    console.log(`   Ответ: ${JSON.stringify(adminEngineersResponse.data)}`);
  }
}

/**
 * Анализ задолженностей по оплатам
 */
async function analyzePaymentDebts() {
  printSeparator('ЗАДОЛЖЕННОСТИ ПО ОПЛАТАМ');

  const currentDate = new Date();
  const debtsResponse = await makeRequest(
    'GET',
    '/statistics/payment-debts',
    testData.tokens.admin,
    null,
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    }
  );

  if (debtsResponse.ok) {
    console.log(`${colors.green}✅ Статистика задолженностей${colors.reset}`);
    printData('Данные', debtsResponse.data);
  } else {
    console.log(`${colors.red}❌ Ошибка получения статистики задолженностей${colors.reset}`);
    console.log(`   Статус: ${debtsResponse.status}`);
    console.log(`   Ответ: ${JSON.stringify(debtsResponse.data)}`);
  }
}

/**
 * Анализ статуса оплаты автомобильных отчислений
 */
async function analyzeCarPaymentStatus() {
  printSeparator('СТАТУС ОПЛАТЫ АВТОМОБИЛЬНЫХ ОТЧИСЛЕНИЙ');

  const currentDate = new Date();
  const carPaymentResponse = await makeRequest(
    'GET',
    '/statistics/car-payment-status',
    testData.tokens.admin,
    null,
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    }
  );

  if (carPaymentResponse.ok) {
    console.log(`${colors.green}✅ Статус оплаты автомобильных отчислений${colors.reset}`);
    printData('Данные', carPaymentResponse.data);
  } else {
    console.log(`${colors.red}❌ Ошибка получения статуса оплаты${colors.reset}`);
    console.log(`   Статус: ${carPaymentResponse.status}`);
    console.log(`   Ответ: ${JSON.stringify(carPaymentResponse.data)}`);
  }
}

/**
 * Анализ статистики заявок
 */
async function analyzeOrderStats() {
  printSeparator('СТАТИСТИКА ЗАЯВОК');

  // Статистика администратора
  const adminStatsResponse = await makeRequest('GET', '/orders/stats', testData.tokens.admin);
  if (adminStatsResponse.ok) {
    console.log(`${colors.green}✅ Статистика заявок (администратор)${colors.reset}`);
    printData('Данные', adminStatsResponse.data);
  }

  // Статистика менеджера
  const managerStatsResponse = await makeRequest('GET', '/orders/stats', testData.tokens.manager);
  if (managerStatsResponse.ok) {
    console.log(`\n${colors.green}✅ Статистика заявок (менеджер)${colors.reset}`);
    printData('Данные', managerStatsResponse.data);
  }
}

/**
 * Инициализация и аутентификация
 */
async function initialize() {
  // Инициализация админа
  await makeRequest('POST', '/auth/initialize-admin');

  // Логин администратора
  const adminLogin = await makeRequest('POST', '/auth/login', null, {
    email: 'admin@coffee.com',
    password: 'admin123',
  });
  if (adminLogin.ok && adminLogin.data.access_token) {
    testData.tokens.admin = adminLogin.data.access_token;
    console.log(`${colors.green}✅ Аутентификация администратора${colors.reset}`);
  }

  // Логин менеджера
  const managerLogin = await makeRequest('POST', '/auth/login', null, {
    email: 'manager@coffee.com',
    password: 'manager123',
  });
  if (managerLogin.ok && managerLogin.data.access_token) {
    testData.tokens.manager = managerLogin.data.access_token;
    console.log(`${colors.green}✅ Аутентификация менеджера${colors.reset}`);
  }

  // Логин инженера (используем первого доступного)
  const engineerLogin = await makeRequest('POST', '/auth/login', null, {
    email: 'engineer@coffee.com',
    password: 'engineer123',
  });
  if (engineerLogin.ok && engineerLogin.data.access_token) {
    testData.tokens.engineer1 = engineerLogin.data.access_token;
    console.log(`${colors.green}✅ Аутентификация инженера${colors.reset}`);
  } else {
    // Попробуем найти любого инженера через API
    const usersResponse = await makeRequest('GET', '/users', testData.tokens.admin, null, {
      role: 'user',
      limit: 1,
    });
    if (usersResponse.ok && usersResponse.data?.data?.length > 0) {
      const engineer = usersResponse.data.data[0];
      const engineerLogin2 = await makeRequest('POST', '/auth/login', null, {
        email: engineer.email,
        password: 'engineer123', // Попробуем стандартный пароль
      });
      if (engineerLogin2.ok && engineerLogin2.data.access_token) {
        testData.tokens.engineer1 = engineerLogin2.data.access_token;
        console.log(`${colors.green}✅ Аутентификация инженера (найден через API)${colors.reset}`);
      }
    }
  }
}

// ============================================================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================================================

async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ДЕТАЛЬНЫЙ АНАЛИЗ СТАТИСТИКИ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`${colors.reset}`);
  console.log(`API URL: ${BASE_URL}\n`);

  try {
    // Инициализация
    await initialize();

    // Анализ всех видов статистики
    await analyzeUserEarnings();
    await analyzeEngineerDetailed();
    await analyzeMonthlyStatistics();
    await analyzeComprehensiveStatistics();
    await analyzeAdminEngineerStatistics();
    await analyzePaymentDebts();
    await analyzeCarPaymentStatus();
    await analyzeOrderStats();

    console.log(`\n${colors.green}${colors.bright}✅ Анализ завершен${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}Критическая ошибка: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск
main().catch(console.error);

