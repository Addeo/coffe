# Автоматическая инициализация пользователей и миграции

## 🔄 Автоматическое создание пользователей

При запуске приложения автоматически создаются тестовые пользователи, если их еще нет:

### Как это работает:

1. **При старте backend** (`AuthModule.onModuleInit`):
   - Ждет 5 секунд для установки соединения с базой данных
   - Вызывает `initializeAdmin()` из `AuthService`
   - Создает/обновляет пользователей: admin, manager, engineer
   - Логирует результаты в консоль

2. **Пользователи создаются только если их нет:**
   - Если пользователь существует - обновляется его роль (если нужно)
   - Если пользователя нет - создается новый

### Пароли по умолчанию:

- **Admin:** `admin@coffee.com` / `admin123`
- **Manager:** `manager@coffee.com` / `manager123`
- **Engineer:** `engineer@coffee.com` / `engineer123`

## 📋 Миграции базы данных

### Во время деплоймента:

1. **MySQL запускается** и ждет готовности (до 60 секунд)
2. **Применяются SQL миграции** из `backend/migrations/*_add_*.sql`:
   - `004_add_role_hierarchy_fields.sql` - поля для иерархии ролей
   - `005_add_order_work_execution_fields.sql` - поля для выполнения работ
   - Другие миграции, если есть

3. **Затем запускается backend**, который:
   - Подключается к MySQL
   - Автоматически создает пользователей (через `AuthModule.onModuleInit`)

### Важно:

- Миграции выполняются **перед** запуском backend
- Пользователи создаются **после** запуска backend (в `onModuleInit`)
- Если что-то пойдет не так, это не остановит запуск приложения

## 🔍 Проверка логов

После деплоймента проверьте логи backend:

```bash
docker logs coffee_backend_fallback | grep -E "(Auto-initializing|Default users|Migrations)"
```

Вы должны увидеть:
```
🔄 Auto-initializing default users...
✅ Default users initialized: { admin: 'created/updated', manager: 'created/updated', engineer: 'created/updated' }
📝 Default passwords: { admin: 'admin123', manager: 'manager123', engineer: 'engineer123' }
```

## 🛠️ Ручная инициализация

Если автоматическая инициализация не сработала, можно вызвать вручную:

```bash
curl http://YOUR_VPS_IP:3001/api/auth/init-admin
```

Или из браузера:
```
http://YOUR_VPS_IP:3001/api/auth/init-admin
```

## ⚠️ Проблемы и решения

### Проблема: Пользователи не создаются

**Причины:**
1. База данных еще не готова (MySQL только запускается)
2. Ошибка подключения к БД
3. Таблица `users` еще не существует (миграции не применились)

**Решение:**
1. Проверьте логи MySQL: `docker logs coffee_mysql_fallback`
2. Проверьте логи backend: `docker logs coffee_backend_fallback`
3. Проверьте, что миграции выполнились
4. Вызовите инициализацию вручную через API

### Проблема: Миграции не применяются

**Причины:**
1. Файлы миграций не включены в деплой-пакет
2. Неправильные права доступа к MySQL
3. Ошибки в SQL-скриптах

**Решение:**
1. Проверьте, что `backend/migrations/` включен в `.github/workflows/deploy-with-fallback.yml`
2. Проверьте логи MySQL
3. Попробуйте применить миграции вручную:

```bash
docker exec -i coffee_mysql_fallback mysql \
  -u${MYSQL_USER} \
  -p${MYSQL_PASSWORD} \
  ${MYSQL_DATABASE} < backend/migrations/004_add_role_hierarchy_fields.sql
```

## 📝 Порядок выполнения при деплойменте:

1. ✅ MySQL запускается
2. ✅ Ждем готовности MySQL (до 60 сек)
3. ✅ Применяем миграции SQL
4. ✅ Запускаем backend
5. ✅ Backend подключается к MySQL
6. ✅ `AuthModule.onModuleInit` выполняется (через 5 сек после старта)
7. ✅ Создаются пользователи (если их нет)

## 🔒 Безопасность

- Пароли по умолчанию должны быть изменены после первого входа
- В продакшене рекомендуется отключить автоматическую инициализацию
- Используйте переменные окружения для разных паролей в разных окружениях

