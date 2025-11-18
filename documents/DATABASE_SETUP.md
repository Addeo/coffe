# Database Setup Guide

## Почему разные БД для dev и prod?

### Текущая ситуация:

- **Development:** SQLite (простая, файловая БД)
- **Production:** MySQL (мощная, клиент-серверная БД)

### Проблемы такого подхода:

1. **Различия в SQL диалектах**
   - SQLite и MySQL имеют разный синтаксис для некоторых операций
   - То что работает в dev, может сломаться в prod

2. **Разное поведение транзакций**
   - SQLite: файловая БД, проще
   - MySQL: клиент-серверная, сложнее

3. **Функции и типы данных**
   - Различия в типах данных (DATETIME vs TIMESTAMP)
   - Разные встроенные функции

## ✅ РЕКОМЕНДУЕМОЕ РЕШЕНИЕ

### Вариант 1: MySQL везде (Docker для dev) - РЕКОМЕНДУЕТСЯ

**Преимущества:**

- ✅ Полная идентичность dev и prod
- ✅ Раннее обнаружение проблем
- ✅ Тестирование в реальных условиях

#### Установка для dev:

1. **Создайте docker-compose.dev.yml:**

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: coffee_admin_mysql_dev
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: coffee_admin
      MYSQL_USER: coffee_user
      MYSQL_PASSWORD: coffee_password
    ports:
      - '3306:3306'
    volumes:
      - mysql_dev_data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    command: --default-authentication-plugin=mysql_native_password

volumes:
  mysql_dev_data:
```

2. **Обновите .env для development:**

```env
# Development with MySQL
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=coffee_user
DB_PASSWORD=coffee_password
DB_DATABASE=coffee_admin

JWT_SECRET=your_dev_secret_here_min_32_chars
PORT=3001
```

3. **Запуск:**

```bash
# Запустить MySQL в Docker
docker-compose -f docker-compose.dev.yml up -d

# Проверить, что MySQL работает
docker ps

# Запустить backend
cd backend
npm run start:dev
```

4. **Обновите app.module.ts:**

```typescript
TypeOrmModule.forRootAsync({
  useFactory: () => {
    const isProduction = process.env.NODE_ENV === 'production';

    // Всегда используем MySQL
    return {
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'coffee_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE || 'coffee_admin',
      entities: [/* ... */],
      synchronize: !isProduction, // true для dev, false для prod
      logging: !isProduction,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      charset: 'utf8mb4',
      extra: {
        connectionLimit: 10,
      },
    };
  },
}),
```

### Вариант 2: PostgreSQL везде - АЛЬТЕРНАТИВА (лучше для production)

PostgreSQL часто считается лучшим выбором для production чем MySQL:

**Преимущества PostgreSQL:**

- ✅ Более строгая типизация
- ✅ Лучше для сложных запросов
- ✅ JSONB поддержка (мощнее чем MySQL JSON)
- ✅ Полная поддержка транзакций
- ✅ Бесплатный и открытый (как MySQL, но без Oracle)

```yaml
# docker-compose.dev.yml для PostgreSQL
services:
  postgres:
    image: postgres:15
    container_name: coffee_admin_postgres_dev
    restart: always
    environment:
      POSTGRES_DB: coffee_admin
      POSTGRES_USER: coffee_user
      POSTGRES_PASSWORD: coffee_password
    ports:
      - '5432:5432'
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

volumes:
  postgres_dev_data:
```

```typescript
// app.module.ts
type: 'postgres',
port: parseInt(process.env.DB_PORT || '5432'),
```

### Вариант 3: Оставить SQLite только для тестов

Если хотите оставить SQLite, используйте его ТОЛЬКО для:

- Unit тестов
- Быстрого прототипирования
- CI/CD тестов

Но для локальной разработки используйте MySQL/PostgreSQL.

## Миграции базы данных

После выбора одной БД, настройте миграции:

```bash
# Установка TypeORM CLI
npm install -g typeorm

# Создание миграции
npm run typeorm migration:create -- src/migrations/InitialSchema

# Запуск миграций
npm run typeorm migration:run

# Откат миграции
npm run typeorm migration:revert
```

Добавьте в `package.json`:

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:create": "typeorm migration:create",
    "migration:generate": "typeorm migration:generate -d src/config/database.config.ts",
    "migration:run": "typeorm migration:run -d src/config/database.config.ts",
    "migration:revert": "typeorm migration:revert -d src/config/database.config.ts"
  }
}
```

## Что нужно сделать СЕЙЧАС

### Шаг 1: Выберите БД

Рекомендую: **MySQL везде через Docker**

### Шаг 2: Установите Docker Desktop

- Скачайте: https://www.docker.com/products/docker-desktop/
- Установите и запустите

### Шаг 3: Создайте docker-compose.dev.yml

(Используйте пример выше)

### Шаг 4: Обновите app.module.ts

Удалите проверку `if (isProduction)` и используйте одну БД везде

### Шаг 5: Настройте миграции

Создайте первую миграцию с текущей схемой

### Шаг 6: Обновите документацию

В README.md добавьте инструкции по запуску MySQL через Docker

## Полезные команды

```bash
# MySQL через Docker
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml logs -f mysql

# Подключиться к MySQL
docker exec -it coffee_admin_mysql_dev mysql -u coffee_user -p
# Пароль: coffee_password

# Создать бэкап
docker exec coffee_admin_mysql_dev mysqldump -u coffee_user -p coffee_admin > backup.sql

# Восстановить из бэкапа
docker exec -i coffee_admin_mysql_dev mysql -u coffee_user -p coffee_admin < backup.sql
```

## FAQ

**Q: Нужно ли удалять SQLite полностью?**
A: Нет, можете оставить для быстрых тестов. Но основная разработка должна быть на MySQL/PostgreSQL.

**Q: Что делать с существующими данными в SQLite?**
A: Экспортируйте их и импортируйте в MySQL:

1. Используйте скрипт конвертации
2. Или пересоздайте данные вручную (если их немного)

**Q: Docker слишком тяжелый?**
A: Docker контейнер с MySQL занимает ~500MB. Это стандарт для современной разработки.

**Q: Можно ли без Docker?**
A: Да, можете установить MySQL напрямую на систему. Но Docker удобнее:

- Изолированная среда
- Легко сбросить и пересоздать
- Одинаковые версии в команде

## Итог

**Рекомендация:** Переходите на MySQL везде через Docker. Это:

- ✅ Устраняет проблему разных БД
- ✅ Делает dev-prod parity
- ✅ Упрощает тестирование
- ✅ Соответствует best practices

**Время на переход:** 1-2 часа

**Сложность:** Низкая (если есть Docker Desktop)
