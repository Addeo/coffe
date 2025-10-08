# Исправление критических проблем безопасности

## ✅ Что было исправлено (2025-10-08)

### 1. ✅ JWT Secret - обязательная проверка

**Проблема:**

```typescript
secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key'; // ⚠️ ОПАСНО!
```

**Исправлено:**

```typescript
const secret = configService.get<string>('JWT_SECRET');

if (!secret) {
  throw new Error(
    'JWT_SECRET is not defined in environment variables! ' +
      'Please set JWT_SECRET in your .env file before starting the application.'
  );
}
```

**Файл:** `backend/src/modules/аутентификация/jwt.strategy.ts`

**Результат:** Приложение не запустится без JWT_SECRET в .env

---

### 2. ✅ База данных убрана из Git

**Проблема:**

- `database.sqlite` - база с реальными данными в репозитории
- `backend/database.sqlite` - дубликат
- Любой с доступом к Git может скачать все данные

**Исправлено:**

1. Добавлено в `.gitignore`:

```gitignore
# Databases - КРИТИЧНО: НЕ ЗАГРУЖАТЬ В GIT!
*.sqlite
*.sqlite3
*.db
database.sqlite
backend/database.sqlite
```

2. Файлы удалены из Git индекса:

```bash
git rm --cached database.sqlite backend/database.sqlite
```

**Результат:** БД больше не попадет в Git, но файлы остались локально

---

### 3. ✅ Uploads убраны из Git

**Проблема:**

- Загруженные пользователями файлы в репозитории
- Может содержать конфиденциальную информацию

**Исправлено:**

1. Добавлено в `.gitignore`:

```gitignore
# Uploads and user files - НЕ ЗАГРУЖАТЬ В GIT!
uploads/
backend/uploads/
```

2. Файлы удалены из Git:

```bash
git rm --cached -r backend/uploads/
```

**Результат:** Загруженные файлы не попадают в Git

---

### 4. ✅ Backups убраны из Git

**Исправлено:**

```gitignore
# Backups - НЕ ЗАГРУЖАТЬ В GIT!
backups/
backend/backups/
*.backup
*.bak
```

---

### 5. 📝 Обновлен env.example

**Добавлено:**

- Четкие инструкции по генерации JWT_SECRET
- Предупреждения о безопасности
- Рекомендации для dev и prod
- Команды для генерации секретов

**Файл:** `env.example`

---

## 📚 Новая документация

### 1. `DATABASE_SETUP.md`

Полное руководство по настройке БД:

- Почему разные БД - это плохо
- Как перейти на MySQL везде через Docker
- Альтернатива с PostgreSQL
- Настройка миграций

### 2. `docker-compose.dev.yml`

Готовая конфигурация для локальной разработки:

- MySQL 8.0
- phpMyAdmin для просмотра БД
- Автоматическая инициализация

---

## 🚀 Что нужно сделать СЕЙЧАС

### Шаг 1: Создайте .env файл

```bash
# В корне проекта
cp env.example .env
```

### Шаг 2: Сгенерируйте JWT_SECRET

**Вариант 1 (Node.js):**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Вариант 2 (OpenSSL):**

```bash
openssl rand -base64 64
```

**Вставьте результат в .env:**

```env
JWT_SECRET=ваш_сгенерированный_секрет_здесь
```

### Шаг 3: Настройте БД

**Опция A: Продолжить с SQLite (быстро, но не рекомендуется)**

```env
# В .env оставьте как есть, SQLite будет работать
NODE_ENV=development
```

**Опция B: Перейти на MySQL через Docker (рекомендуется)**

1. Установите Docker Desktop
2. Запустите MySQL:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. Проверьте:

```bash
docker ps
# Должен быть запущен coffee_admin_mysql_dev
```

4. Обновите .env:

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=coffee_user
DB_PASSWORD=coffee_dev_password
DB_DATABASE=coffee_admin
```

### Шаг 4: Закоммитьте изменения

```bash
# Проверьте статус
git status

# Должно быть:
# - modified: .gitignore
# - modified: backend/src/modules/аутентификация/jwt.strategy.ts
# - modified: env.example
# - deleted: database.sqlite
# - deleted: backend/database.sqlite
# - deleted: backend/uploads/*
# - deleted: backend/backups/*
# - new: docker-compose.dev.yml
# - new: docs/DATABASE_SETUP.md
# - new: docs/SECURITY_FIXES_APPLIED.md

# Закоммитьте
git add .
git commit -m "🔒 Security fixes: JWT validation, remove DB and uploads from git, update gitignore"
```

### Шаг 5: Создайте директории (они в gitignore)

```bash
# Создайте директории, но они не попадут в git
mkdir -p backend/uploads
mkdir -p backend/backups

# Опционально: создайте .gitkeep чтобы сохранить структуру
touch backend/uploads/.gitkeep
touch backend/backups/.gitkeep

# И добавьте .gitkeep в .gitignore исключения
echo "!**/.gitkeep" >> .gitignore
```

### Шаг 6: Проверьте, что все работает

```bash
# Backend
cd backend
npm run start:dev

# Вы должны увидеть либо:
# - Error: JWT_SECRET is not defined (если не настроили .env)
# - Coffee Admin API is running... (если все ОК)
```

---

## ⚠️ Важные примечания

### Для команды разработки:

1. **Каждый разработчик должен:**
   - Создать свой .env файл (он в .gitignore)
   - Сгенерировать свой JWT_SECRET
   - Не коммитить .env в Git!

2. **БД и uploads:**
   - Никогда не добавляйте их в Git
   - Используйте бэкапы для переноса данных
   - Для тестов используйте seed scripts

3. **Production:**
   - JWT_SECRET должен быть уникальным для prod
   - Храните секреты в безопасном месте (например, 1Password, AWS Secrets Manager)
   - Никогда не используйте dev секреты в prod!

### Миграция существующих данных:

Если у вас есть важные данные в старой `database.sqlite`:

```bash
# 1. Сделайте бэкап
cp database.sqlite database.sqlite.backup

# 2. Используйте скрипт экспорта (создайте если нужно)
# Или вручную экспортируйте критичные данные

# 3. Импортируйте в новую БД (MySQL)
# После настройки MySQL через docker-compose.dev.yml
```

---

## 📊 Чеклист безопасности

После всех изменений проверьте:

```
✅ JWT_SECRET проверяется при старте
✅ .env файл в .gitignore
✅ database.sqlite в .gitignore и удален из Git
✅ uploads/ в .gitignore и удалены из Git
✅ backups/ в .gitignore и удалены из Git
✅ env.example обновлен с инструкциями
✅ docker-compose.dev.yml создан
✅ Документация обновлена

❌ TODO: CORS все еще origin: true (следующий приоритет!)
❌ TODO: Нет helmet и rate-limiting
❌ TODO: Нет миграций БД
```

---

## 🔄 Следующие шаги (приоритет)

1. **Исправить CORS** (30 минут)
   - Ограничить allowed origins
   - Использовать переменную окружения

2. **Добавить защитные middleware** (1 час)
   - helmet
   - rate-limiting
   - compression

3. **Настроить миграции БД** (2 часа)
   - TypeORM migrations
   - Создать первую миграцию

4. **Написать первые тесты** (4 часа)
   - Unit тесты для критичных сервисов
   - E2E тесты для авторизации

---

## 📞 Вопросы?

Если что-то непонятно или не работает:

1. Проверьте документацию в `docs/`
2. Посмотрите логи: `docker logs coffee_admin_mysql_dev`
3. Проверьте .env файл

**Помните:** Безопасность - это процесс, не событие. Регулярно проверяйте и обновляйте настройки безопасности!

---

**Дата:** 2025-10-08  
**Версия:** 1.0  
**Статус:** ✅ Критические проблемы исправлены  
**Приоритет следующий:** CORS и middleware защиты
