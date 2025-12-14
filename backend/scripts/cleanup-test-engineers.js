#!/usr/bin/env node

/**
 * Скрипт для удаления тестовых инженеров
 * Удаляет последних 140 инженеров (тестовые данные)
 * 
 * Использование:
 *   PROD_API_URL=https://your-production-api.com/api node scripts/cleanup-test-engineers.js
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

let deletedCount = 0;
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
 * Логирование
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Главная функция
 */
async function main() {
  log('\n' + '═'.repeat(70), 'cyan');
  log('  УДАЛЕНИЕ ТЕСТОВЫХ ИНЖЕНЕРОВ', 'cyan');
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
    log('✅ Аутентификация успешна', 'green');

    // Получаем всех инженеров
    log('\n📋 Получение списка инженеров...', 'cyan');
    const usersResponse = await makeRequest('GET', '/users', adminToken, null, {
      role: 'user',
      limit: 200,
      page: 1,
    });

    if (!usersResponse.ok || !usersResponse.data?.data) {
      throw new Error('Не удалось получить список инженеров');
    }

    const allUsers = usersResponse.data.data;
    const engineers = allUsers.filter(user => user.engineer?.id);

    log(`   Найдено инженеров: ${engineers.length}`, 'blue');

    // Сортируем по ID (по убыванию) и берем последних 140
    const sortedEngineers = engineers.sort((a, b) => b.id - a.id);
    const engineersToDelete = sortedEngineers.slice(0, 140);

    log(`\n🗑️  Будет удалено инженеров: ${engineersToDelete.length}`, 'yellow');
    log(`   Останется инженеров: ${sortedEngineers.length - engineersToDelete.length}`, 'green');

    // Подтверждение
    log('\n⚠️  ВНИМАНИЕ: Это удалит последних 140 инженеров!', 'red');
    log('   Продолжаем удаление...\n', 'yellow');

    // Удаляем инженеров
    for (let i = 0; i < engineersToDelete.length; i++) {
      const engineer = engineersToDelete[i];
      log(`[${i + 1}/${engineersToDelete.length}] Удаление: ${engineer.email} (ID: ${engineer.id})`, 'blue');

      const deleteResponse = await makeRequest('DELETE', `/users/${engineer.id}`, adminToken);

      if (deleteResponse.ok) {
        deletedCount++;
        log(`   ✅ Удален`, 'green');
      } else {
        errorCount++;
        log(`   ❌ Ошибка: ${JSON.stringify(deleteResponse.data)}`, 'red');
      }

      // Небольшая задержка между запросами
      if (i < engineersToDelete.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Итоги
    log('\n' + '═'.repeat(70), 'magenta');
    log('📊 ИТОГИ УДАЛЕНИЯ', 'magenta');
    log('═'.repeat(70), 'magenta');
    log(`✅ Успешно удалено: ${deletedCount}`, 'green');
    log(`❌ Ошибок: ${errorCount}`, errorCount > 0 ? 'red' : 'green');
    log(`📈 Всего обработано: ${engineersToDelete.length}`, 'cyan');
    log('═'.repeat(70) + '\n', 'magenta');

    // Проверяем оставшихся инженеров
    log('🔍 Проверка оставшихся инженеров...', 'cyan');
    const checkResponse = await makeRequest('GET', '/users', adminToken, null, {
      role: 'user',
      limit: 200,
      page: 1,
    });

    if (checkResponse.ok && checkResponse.data?.data) {
      const remainingEngineers = checkResponse.data.data.filter(user => user.engineer?.id);
      log(`✅ Осталось инженеров: ${remainingEngineers.length}`, 'green');
      log('\nОставшиеся инженеры:');
      remainingEngineers.forEach(eng => {
        log(`   - ${eng.email} (ID: ${eng.id}, Engineer ID: ${eng.engineer.id})`, 'blue');
      });
    }

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

