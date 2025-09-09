const mysql = require('mysql2/promise');

async function testDatabaseConnection() {
  const config = {
    host: 'localhost',
    port: 3307,
    user: 'coffee_user',
    password: 'coffee_password',
    database: 'coffee_admin'
  };

  console.log('🔍 Тестирование подключения к базе данных...');
  console.log(`📍 Хост: ${config.host}:${config.port}`);
  console.log(`👤 Пользователь: ${config.user}`);
  console.log(`📊 База данных: ${config.database}`);

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Подключение успешно установлено!');

    // Проверяем таблицы
    console.log('\n📋 Проверка таблиц:');
    const [tables] = await connection.execute('SHOW TABLES');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${Object.values(table)[0]}`);
    });

    // Проверяем админа
    console.log('\n👑 Проверка админа:');
    const [admin] = await connection.execute(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE email = ?',
      ['admin@coffee.com']
    );

    if (admin.length > 0) {
      console.log('✅ Админ найден:', admin[0]);
    } else {
      console.log('❌ Админ не найден');
    }

    await connection.end();
    console.log('\n🎉 Тест завершен успешно!');

  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    console.log('\n🔧 Возможные решения:');
    console.log('1. Проверьте, что Docker контейнер запущен: docker ps');
    console.log('2. Проверьте правильность учетных данных');
    console.log('3. Проверьте, что порт 3307 не занят другим процессом');
  }
}

testDatabaseConnection();
