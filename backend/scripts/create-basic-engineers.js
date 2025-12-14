#!/usr/bin/env node

/**
 * Скрипт для создания базовых инженеров для работы
 * Создает 12 инженеров с разными типами
 */

const BASE_URL = process.env.PROD_API_URL || process.env.API_URL || 'http://localhost:3001/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(method, endpoint, token = null, body = null) {
  const url = new URL(`${BASE_URL}${endpoint}`);
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
  log('\n🔐 Аутентификация...', 'cyan');
  const login = await makeRequest('POST', '/auth/login', null, {
    email: 'admin@coffee.com',
    password: 'admin123',
  });

  if (!login.ok || !login.data.access_token) {
    throw new Error('Не удалось войти');
  }

  const token = login.data.access_token;
  log('✅ Аутентификация успешна', 'green');

  const engineers = [
    { email: 'engineer1@coffee.com', firstName: 'Иван', lastName: 'Петров', type: 'staff', baseRate: 500, overtimeCoefficient: 1.6, planHoursMonth: 160 },
    { email: 'engineer2@coffee.com', firstName: 'Сергей', lastName: 'Сидоров', type: 'contract', baseRate: 400, overtimeCoefficient: 1.5 },
    { email: 'engineer3@coffee.com', firstName: 'Алексей', lastName: 'Козлов', type: 'staff', baseRate: 450, overtimeCoefficient: 1.6, planHoursMonth: 160 },
    { email: 'engineer4@coffee.com', firstName: 'Дмитрий', lastName: 'Волков', type: 'staff', baseRate: 600, overtimeCoefficient: 2.0, planHoursMonth: 160 },
    { email: 'engineer5@coffee.com', firstName: 'Николай', lastName: 'Орлов', type: 'contract', baseRate: 350, overtimeCoefficient: 1.3 },
    { email: 'engineer6@coffee.com', firstName: 'Михаил', lastName: 'Соколов', type: 'staff', baseRate: 550, overtimeCoefficient: 1.7, planHoursMonth: 160 },
    { email: 'engineer7@coffee.com', firstName: 'Андрей', lastName: 'Лебедев', type: 'contract', baseRate: 420, overtimeCoefficient: 1.4 },
    { email: 'engineer8@coffee.com', firstName: 'Владимир', lastName: 'Новиков', type: 'staff', baseRate: 480, overtimeCoefficient: 1.6, planHoursMonth: 160 },
    { email: 'engineer9@coffee.com', firstName: 'Павел', lastName: 'Морозов', type: 'staff', baseRate: 520, overtimeCoefficient: 1.8, planHoursMonth: 160 },
    { email: 'engineer10@coffee.com', firstName: 'Роман', lastName: 'Павлов', type: 'contract', baseRate: 380, overtimeCoefficient: 1.3 },
    { email: 'engineer11@coffee.com', firstName: 'Игорь', lastName: 'Смирнов', type: 'staff', baseRate: 490, overtimeCoefficient: 1.6, planHoursMonth: 160 },
    { email: 'engineer12@coffee.com', firstName: 'Олег', lastName: 'Кузнецов', type: 'staff', baseRate: 510, overtimeCoefficient: 1.7, planHoursMonth: 160 },
  ];

  log(`\n👷 Создание ${engineers.length} инженеров...\n`, 'cyan');
  let created = 0;

  for (const eng of engineers) {
    const body = {
      email: eng.email,
      password: 'engineer123',
      firstName: eng.firstName,
      lastName: eng.lastName,
      role: 'user',
      engineerType: eng.type,
      baseRate: eng.baseRate,
      overtimeCoefficient: eng.overtimeCoefficient,
      ...(eng.planHoursMonth && { planHoursMonth: eng.planHoursMonth }),
    };

    const response = await makeRequest('POST', '/users', token, body);
    if (response.ok) {
      log(`✅ ${eng.email} - создан (Engineer ID: ${response.data.engineer?.id})`, 'green');
      created++;
    } else {
      log(`❌ ${eng.email} - ошибка: ${JSON.stringify(response.data)}`, 'red');
    }
  }

  log(`\n📊 Создано инженеров: ${created}/${engineers.length}\n`, 'cyan');
}

main().catch(console.error);

