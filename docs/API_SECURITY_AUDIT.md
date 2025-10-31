# API Security Audit Report

## 🔍 Обнаруженные проблемы безопасности

### 1. ⚠️ КРИТИЧНО: Organizations Controller

**Проблема:** Контроллер `OrganizationsController` использует декораторы `@Roles` на методах, но НЕ использует `@UseGuards(JwtAuthGuard, RolesGuard)` на уровне контроллера.

**Файл:** `backend/src/modules/organizations/organizations.controller.ts`

**Текущее состояние:**
```typescript
@Controller('organizations')
export class OrganizationsController {
  @Post()
  @Roles(UserRole.ADMIN) // ❌ Не работает без RolesGuard!
```

**Исправление:**
```typescript
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard) // ✅ Добавить
export class OrganizationsController {
```

### 2. ⚠️ ВАЖНО: Products Controller

**Проблема:** Все эндпоинты доступны любому авторизованному пользователю, нет проверки ролей.

**Файл:** `backend/src/modules/products/products.controller.ts`

**Рекомендации:**
- `POST /products` - должен быть ADMIN, MANAGER
- `PATCH /products/:id` - должен быть ADMIN, MANAGER
- `DELETE /products/:id` - должен быть ADMIN
- `PATCH /products/:id/stock` - должен быть MANAGER, ADMIN
- `POST /products/bulk/status` - должен быть ADMIN
- `GET /products*` - может быть доступен всем авторизованным

### 3. ⚠️ ВАЖНО: Files Controller

**Проблема:** Множество эндпоинтов без проверки ролей.

**Файл:** `backend/src/modules/files/files.controller.ts`

**Проблемные эндпоинты:**
- `GET /files` - без проверки
- `GET /files/stats` - без проверки
- `GET /files/my-files` - без JwtAuthGuard (но использует req.user)
- `GET /files/get-order-files/:orderId` - без проверки
- `GET /files/view/:id` - без проверки
- `POST /files/:id/attach-to-order` - guard закомментирован
- `GET /files/metadata/:id` - дублируется (два метода с одинаковым путем)

**Рекомендации:**
- Публичные файлы (view) могут быть доступны без авторизации
- Личные файлы должны требовать авторизации
- Удаление/обновление должно требовать ADMIN или владельца

### 4. ⚠️ СРЕДНЕ: Statistics Controller

**Проблема:** Некоторые эндпоинты доступны всем авторизованным пользователям без ограничений.

**Файл:** `backend/src/modules/statistics/statistics.controller.ts`

**Эндпоинты без @Roles (доступны всем авторизованным):**
- `GET /statistics/earnings` - получение собственной статистики (ОК)
- `GET /statistics/earnings/comparison` - сравнение (ОК)
- `GET /statistics/earnings/rank` - рейтинг (ОК)
- `GET /statistics/engineer/detailed` - детальная статистика (ОК, но должен фильтроваться по req.user.id)

**Статус:** ✅ Это нормально - пользователи видят только свою статистику.

### 5. ⚠️ СРЕДНЕ: Work Sessions Controller

**Проблема:** `GET /work-sessions/:id` доступен всем авторизованным без проверки владельца.

**Рекомендация:** Добавить проверку, что сессия принадлежит текущему пользователю или пользователь - MANAGER/ADMIN.

### 6. ✅ Правильно настроенные контроллеры:

- ✅ `UsersController` - полная проверка ролей
- ✅ `OrdersController` - полная проверка ролей
- ✅ `SalaryPaymentController` - полная проверка ролей
- ✅ `EngineerOrganizationRatesController` - полная проверка ролей
- ✅ `CalculationsController` - полная проверка ролей
- ✅ `StatisticsController` - правильная проверка (пользователи видят только свои данные)
- ✅ `NotificationsController` - правильная проверка (пользователи видят только свои уведомления)

## 📋 План исправлений

### Приоритет 1 (Критично):
1. ✅ Добавить `@UseGuards(JwtAuthGuard, RolesGuard)` в `OrganizationsController`

### Приоритет 2 (Важно):
2. ✅ Добавить проверку ролей в `ProductsController`
3. ✅ Исправить проверки в `FilesController`
4. ✅ Исправить дублирование `GET /files/metadata/:id`

### Приоритет 3 (Средне):
5. ✅ Добавить проверку владельца в `WorkSessionsController.getWorkSession`

## 🔐 Общие рекомендации по безопасности:

1. **Всегда использовать `@UseGuards(JwtAuthGuard, RolesGuard)` на уровне контроллера**, если требуется проверка ролей
2. **Добавлять `@Roles()` на методы**, которые требуют конкретные роли
3. **Проверять владельца ресурса** при доступе к личным данным (orders, files, sessions)
4. **Использовать фильтрацию в сервисах** - даже если эндпоинт доступен, данные должны фильтроваться по пользователю
5. **Не комментировать guards** без крайней необходимости
6. **Тестировать доступ** для всех ролей к каждому эндпоинту

## 📊 Матрица доступа по ролям

| Модуль | USER | MANAGER | ADMIN |
|--------|------|---------|-------|
| Orders - создать | ❌ | ✅ | ✅ |
| Orders - принять | ✅ | ❌ | ❌ |
| Orders - завершить работу | ✅ | ❌ | ❌ |
| Orders - назначить инженера | ❌ | ✅ | ✅ |
| Users - список | ❌ | ✅ | ✅ |
| Users - создать | ❌ | ❌ | ✅ |
| Organizations - список | ❌ | ✅ | ✅ |
| Organizations - создать | ❌ | ❌ | ✅ |
| Statistics - общая | ❌ | ✅ | ✅ |
| Statistics - своя | ✅ | ✅ | ✅ |
| Payments - все операции | ❌ | ✅ | ✅ |
| Calculations - запуск | ❌ | ✅ | ✅ |
| Calculations - просмотр | ✅ | ✅ | ✅ |
| Files - свои | ✅ | ✅ | ✅ |
| Files - все | ❌ | ❌ | ✅ |

