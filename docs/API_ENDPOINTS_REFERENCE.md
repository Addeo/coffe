# API Endpoints Reference

Полный список всех API эндпоинтов с требованиями к ролям.

> ⚠️ **Важно:** Проверьте [API_SECURITY_AUDIT.md](./API_SECURITY_AUDIT.md) для информации о безопасности эндпоинтов.

## 🔐 Аутентификация (`/api/auth`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| POST | `/auth/login` | Public | Вход в систему |
| POST | `/auth/switch-role` | All | Переключение роли |
| POST | `/auth/reset-role` | All | Сброс к основной роли |
| GET | `/auth/init-admin` | Public | Инициализация админа |

## 👥 Пользователи (`/api/users`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/users` | ADMIN, MANAGER | Список пользователей |
| POST | `/users` | ADMIN | Создать пользователя |
| GET | `/users/profile` | All | Свой профиль |
| PATCH | `/users/profile` | All | Обновить свой профиль |
| GET | `/users/:id` | ADMIN, MANAGER | Получить пользователя |
| PATCH | `/users/:id` | ADMIN | Обновить пользователя |
| DELETE | `/users/:id` | ADMIN | Удалить пользователя |
| DELETE | `/users/:id/force` | ADMIN | Принудительное удаление |

## 🏢 Организации (`/api/organizations`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/organizations` | ADMIN, MANAGER | Список организаций |
| POST | `/organizations` | ADMIN | Создать организацию |
| GET | `/organizations/:id` | ADMIN, MANAGER | Получить организацию |
| PATCH | `/organizations/:id` | ADMIN | Обновить организацию |
| PATCH | `/organizations/:id/toggle-status` | ADMIN | Переключить статус |
| DELETE | `/organizations/:id` | ADMIN | Удалить организацию |
| GET | `/organizations/test` | Public | Тестовый эндпоинт |
| GET | `/organizations/public` | Public | Публичный список |

## 📦 Заказы (`/api/orders`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/orders` | All | Список заказов (фильтруется по роли) |
| POST | `/orders` | ADMIN, MANAGER | Создать заказ |
| POST | `/orders/automatic` | ADMIN | Создать автоматический заказ |
| GET | `/orders/my-orders` | ADMIN, MANAGER | Мои созданные заказы |
| GET | `/orders/by-source/:source` | ADMIN, MANAGER | Заказы по источнику |
| GET | `/orders/stats` | All | Статистика заказов |
| GET | `/orders/:id` | All | Получить заказ |
| PATCH | `/orders/:id` | All | Обновить заказ (ограничено по роли) |
| DELETE | `/orders/:id` | All | Удалить заказ (ограничено по роли) |
| POST | `/orders/:id/assign-engineer` | ADMIN, MANAGER | Назначить инженера |
| POST | `/orders/:id/accept` | USER | Принять заказ (инженер) |
| POST | `/orders/:id/complete-work` | USER | Завершить работу |
| POST | `/orders/:id/work-sessions` | All | Создать рабочую сессию |
| GET | `/orders/:id/work-sessions` | All | Список рабочих сессий |
| POST | `/orders/:id/complete` | MANAGER, ADMIN | Завершить заказ |

## 📊 Статистика (`/api/statistics`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/statistics` | ADMIN, MANAGER | Общая статистика |
| GET | `/statistics/organizations` | ADMIN, MANAGER | Статистика по организациям |
| GET | `/statistics/engineers` | ADMIN | Статистика по инженерам |
| GET | `/statistics/engineer/detailed` | ADMIN | Детальная статистика инженера |

## 💰 Выплаты (`/api/salary-payments`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/salary-payments` | ADMIN, MANAGER | Список выплат |
| POST | `/salary-payments` | ADMIN, MANAGER | Создать выплату |
| GET | `/salary-payments/:id` | ADMIN, MANAGER | Получить выплату |
| PATCH | `/salary-payments/:id` | ADMIN, MANAGER | Обновить выплату |
| DELETE | `/salary-payments/:id` | ADMIN, MANAGER | Удалить выплату |
| POST | `/salary-payments/:id/mark-paid` | ADMIN, MANAGER | Отметить как оплаченную |
| POST | `/salary-payments/:id/mark-cancelled` | ADMIN, MANAGER | Отменить выплату |
| GET | `/salary-payments/engineer/:engineerId` | ADMIN, MANAGER | Выплаты инженера |

## 👨‍💼 Инженер-Организация Тарифы (`/api/engineer-organization-rates`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/engineer-organization-rates` | ADMIN, MANAGER | Список тарифов |
| POST | `/engineer-organization-rates` | ADMIN, MANAGER | Создать тариф |
| GET | `/engineer-organization-rates/:id` | ADMIN, MANAGER | Получить тариф |
| PATCH | `/engineer-organization-rates/:id` | ADMIN, MANAGER | Обновить тариф |
| DELETE | `/engineer-organization-rates/:id` | ADMIN, MANAGER | Удалить тариф |
| GET | `/engineer-organization-rates/by-engineer/:engineerId` | ADMIN, MANAGER | Тарифы инженера |

## 🔔 Уведомления (`/api/notifications`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/notifications` | All | Список уведомлений |
| GET | `/notifications/unread-count` | All | Количество непрочитанных |
| POST | `/notifications/:id/mark-read` | All | Отметить как прочитанное |
| POST | `/notifications/mark-all-read` | All | Отметить все как прочитанные |

## ⚙️ Настройки (`/api/settings`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/settings` | ADMIN, MANAGER | Получить настройки |
| PATCH | `/settings` | MANAGER | Обновить настройки |

## 📄 Файлы (`/api/files`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| POST | `/files/upload` | All | Загрузить файл |
| GET | `/files` | All | Список файлов |
| GET | `/files/:id` | All | Получить файл |
| DELETE | `/files/:id` | All | Удалить файл |
| GET | `/files/:id/download` | All | Скачать файл |

## 📈 Отчеты (`/api/reports`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/reports/orders` | ADMIN, MANAGER | Отчет по заказам |
| GET | `/reports/salary` | ADMIN, MANAGER | Отчет по зарплатам |

## 📤 Экспорт (`/api/export`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/export/orders` | All | Экспорт заказов |

## 💾 Резервное копирование (`/api/backup`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/backup` | ADMIN | Список бэкапов |
| POST | `/backup` | ADMIN | Создать бэкап |
| GET | `/backup/:id/download` | ADMIN | Скачать бэкап |

## 📝 Логи (`/api/logs`)

| Метод | Эндпоинт | Роли | Описание |
|-------|----------|------|----------|
| GET | `/logs` | ADMIN | Список логов |

## ⚠️ Важные замечания:

1. **RolesGuard** использует иерархию ролей:
   - ADMIN может выполнять все действия
   - MANAGER может выполнять действия MANAGER и USER
   - USER может выполнять только свои действия

2. **Фильтрация данных:**
   - USER видит только свои заказы
   - MANAGER видит заказы своей организации
   - ADMIN видит все заказы

3. **Автоматические проверки:**
   - Инженер может работать только с назначенными ему заказами
   - Менеджер может управлять заказами своей организации

