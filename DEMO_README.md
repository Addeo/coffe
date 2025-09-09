# 🚀 Coffee Admin Panel - Live Demo Setup

Это руководство поможет вам настроить живую демонстрацию системы учета сервисных работ.

## 📋 Что будет настроено

### 1. Frontend Demo (GitHub Pages)

- Бесплатный хостинг на GitHub Pages
- Автоматическая сборка и деплой через GitHub Actions
- Доступ по URL: `https://[your-username].github.io/coffee-admin/`

### 2. Backend Demo (Render.com)

- Бесплатный хостинг на Render.com
- PostgreSQL база данных
- API доступно по URL: `https://coffee-admin-demo.onrender.com`

## 🔧 Настройка Frontend Demo

### Шаг 1: Включите GitHub Pages

1. Перейдите в настройки репозитория на GitHub
2. В разделе "Pages" выберите:
   - **Source**: "GitHub Actions"
   - **Branch**: `main` (или ваша основная ветка)

### Шаг 2: Обновите workflow файл

В файле `.github/workflows/deploy-frontend.yml` убедитесь, что:

- Node.js версия: `18`
- Build команда: `npm run build -- --configuration production --base-href /coffee-admin/`
- Путь к артефактам: `./frontend/dist/coffee-admin`

### Шаг 3: Обновите environment.prod.ts

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-url.onrender.com', // Замените на ваш backend URL
  appName: 'Coffee Admin Panel Demo',
  demo: true,
};
```

## 🔧 Настройка Backend Demo

### Вариант 1: Render.com (Рекомендуется)

#### Шаг 1: Создайте аккаунт на Render.com

1. Перейдите на [render.com](https://render.com)
2. Зарегистрируйтесь (бесплатно)

#### Шаг 2: Создайте PostgreSQL базу данных

1. В Render Dashboard нажмите "New" → "PostgreSQL"
2. Название: `coffee-admin-db`
3. План: Free
4. Скопируйте connection string

#### Шаг 3: Разверните Backend

1. В Render Dashboard нажмите "New" → "Web Service"
2. Подключите ваш GitHub репозиторий
3. Настройки:
   - **Name**: `coffee-admin-demo-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
4. Добавьте Environment Variables:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret-key-here
   NODE_ENV=production
   ```

#### Шаг 4: Обновите схему базы данных

1. Подключитесь к PostgreSQL через Render
2. Выполните SQL скрипты из `docker/mysql/init.sql`

### Вариант 2: Railway.app

#### Шаг 1: Создайте проект

1. Перейдите на [railway.app](https://railway.app)
2. Создайте новый проект

#### Шаг 2: Добавьте базу данных

1. Добавьте PostgreSQL плагин
2. Скопируйте DATABASE_URL

#### Шаг 3: Разверните приложение

1. Подключите GitHub репозиторий
2. Настройте переменные окружения
3. Railway автоматически определит настройки Node.js

## 🔄 Автоматический деплой

### Frontend (GitHub Actions)

После каждого push в `main` ветку:

1. Запускается сборка фронтенда
2. Создается production build
3. Автоматически деплоится на GitHub Pages

### Backend (Render/Railway)

- Автоматический деплой при push в main ветку
- Обновление происходит в течение 2-5 минут

## 🧪 Тестирование демо

### Проверка Frontend

```bash
# Локальная проверка сборки
cd frontend
npm run build -- --configuration production --base-href /coffee-admin/

# Проверка через HTTP сервер
npx http-server dist/coffee-admin -p 8080
```

### Проверка Backend

```bash
# Тест API endpoints
curl https://your-backend-url.onrender.com/health

# Тест аутентификации
curl -X POST https://your-backend-url.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coffee.com","password":"password"}'
```

## 📊 Мониторинг

### Render.com

- Логи доступны в Dashboard
- Metrics: CPU, Memory, Response times
- Free tier: 750 часов/месяц

### GitHub Pages

- Статистика посещений в Insights
- Build logs в Actions tab

## 🔒 Безопасность для демо

### Важные настройки:

1. **JWT Secret**: Используйте сложный секрет для продакшена
2. **Rate Limiting**: Настройте ограничения запросов
3. **CORS**: Разрешите только ваш домен
4. **Database**: Используйте отдельную демо базу данных

## 🎯 Что показать в демо

### Основные возможности:

- ✅ Авторизация пользователей
- ✅ Управление организациями (CRUD)
- ✅ Адаптивный дизайн
- ✅ Мобильная версия
- ✅ API документация (Swagger)

### Тестовые данные:

```sql
-- Добавьте тестовые организации
INSERT INTO organizations (name, base_rate, has_overtime) VALUES
('Вистекс', 900, true),
('РусХолтс', 1100, false),
('ТО Франко', 1100, false);
```

## 📞 Поддержка

Если возникли проблемы с настройкой демо:

1. Проверьте логи в GitHub Actions / Render Dashboard
2. Убедитесь, что все environment variables установлены
3. Проверьте connectivity между frontend и backend
4. Используйте browser dev tools для отладки

## 🎉 Готово!

После настройки у вас будет:

- 🌐 Frontend: https://username.github.io/coffee-admin/
- 🚀 Backend: https://coffee-admin-demo.onrender.com
- 📱 Mobile-friendly интерфейс
- 🔄 Автоматические обновления

Демо готово к демонстрации! 🎊
