# Аутентификация API

## Эндпоинты аутентификации

### POST /auth/login
Аутентификация пользователя.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - Неверные учетные данные

## Защита эндпоинтов

Для защиты эндпоинтов используйте следующие guards:

### JWT Guard
```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
getProtectedData() {
  // Этот эндпоинт требует аутентификации
}
```

### Roles Guard
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get('admin-only')
getAdminData() {
  // Этот эндпоинт доступен только админам
}
```

## Переменные окружения

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=coffee_user
DB_PASSWORD=coffee_password
DB_DATABASE=coffee_admin
```

## Роли пользователей

- `ADMIN` - Администратор (полный доступ)
- `MANAGER` - Менеджер (управление заказами и продуктами)
- `USER` - Пользователь (просмотр и базовые операции)

## Запуск

1. Установите переменные окружения (скопируйте `env.example` в `.env`)
2. Запустите базу данных MySQL
3. Выполните миграции: `npm run migration:run`
4. Запустите сервер: `npm run start:dev`

## Тестирование

```bash
# Запуск всех тестов
npm run test

# Запуск E2E тестов
npm run test:e2e
```
