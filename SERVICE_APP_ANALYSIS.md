# 📊 Анализ ТЗ: Система учета сервисных работ

## 🎯 Обзор проекта

**Название**: Система учета сервисных работ и расчета зарплаты инженеров

**Цель**: Автоматизация учета работ, расчетов зарплаты и премий для инженеров разных типов

## 🔍 Детальный анализ требований

### 1. Организации-заказчики

| Организация | Ставка (руб/час) | Коэфф. внеуроч. | Особенности |
|-------------|------------------|-----------------|-------------|
| Вистекс | 900 | 1.5 | Внеурочное время |
| РусХолтс | 1100 | - | Нет внеурочного |
| ТО Франко | 1100 | - | Нет внеурочного |
| Холод Вистекс | 1200 | 1.5 | Внеурочное время |
| Франко | 1210 | 1.5 | Внеурочное время |
| Локальный Сервис | 1200 | 1.5 | Внеурочное время |

### 2. Типы инженеров

#### Штатный инженер
- **Базовая ставка**: 700 руб/час
- **Оклад**: Включает план часов + другие работы
- **Переработка**: 700 руб/час
- **Внеурочное время**:
  - Вистекс: ×1.6
  - Холод Вистекс: ×1.8
  - Франко: ×1.8
  - Локальный Сервис: ×1.8

#### Удаленный инженер
- **Базовая ставка**: 750 руб/час
- **Оклад**: Только план часов
- **Переработка**: 650 руб/час
- **Внеурочное время**: Аналогично штатному

#### Наемный инженер
- **Нет оклада** (сдельная оплата)
- **Базовая ставка**: 700 руб/час
- **Внеурочное время**:
  - Вистекс: 1200 руб/час
  - Холод Вистекс: 1400 руб/час
  - Франко: 1200 руб/час
  - Локальный Сервис: 1200 руб/час

### 3. Эксплуатация автомобиля

#### Штатный и Удаленный
- **Домашняя территория** (≤60 км): Фиксированная сумма за месяц
- **Территория 1** (61-199 км): +1000 руб (только удаленный)
- **Территория 2** (200-250 км): +1500 руб
- **Территория 3** (>250 км): +2000 руб

#### Наемный
- **Стоимость**: 14 руб/км
- **Расчет**: По фактическому километражу

## 🗄️ Схема базы данных

### Основные сущности:

```sql
-- Пользователи системы
users (
  id, email, password, first_name, last_name,
  role (admin/manager/engineer), is_active,
  created_at, updated_at
)

-- Инженеры (расширение users)
engineers (
  user_id, engineer_type (staff/remote/contract),
  base_rate, plan_hours_month, current_salary,
  home_territory_fixed_amount, status
)

-- Организации-заказчики
organizations (
  id, name, base_rate, overtime_multiplier,
  has_overtime (boolean), is_active
)

-- Заявки на обслуживание
orders (
  id, organization_id, assigned_engineer_id,
  title, description, location, distance_km,
  territory_type, status (pending/assigned/in_progress/completed),
  created_by, assigned_by, created_at, updated_at,
  planned_start_date, actual_start_date, completion_date
)

-- Отчеты о выполненных работах
work_reports (
  id, order_id, engineer_id,
  start_time, end_time, total_hours,
  is_overtime (boolean), work_result (completed/partial),
  distance_km, territory_type,
  photo_url, notes, submitted_at,
  calculated_amount, car_usage_amount
)

-- Месячные расчеты зарплаты
salary_calculations (
  id, engineer_id, month, year,
  planned_hours, actual_hours, overtime_hours,
  base_amount, overtime_amount, bonus_amount,
  car_usage_amount, total_amount,
  client_revenue, profit_margin,
  calculated_at, status
)

-- Настройки системы (для администратора)
system_settings (
  key, value, description, updated_by, updated_at
)
```

## ⚙️ Бизнес-логика расчетов

### Расчет часов работы
```typescript
// Округление до 0.25 часа в большую сторону
function calculateWorkHours(startTime: Date, endTime: Date): number {
  const diffHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  return Math.ceil(diffHours * 4) / 4;
}
```

### Расчет оплаты инженера
```typescript
function calculateEngineerPayment(
  engineer: Engineer,
  hours: number,
  isOvertime: boolean,
  organization: Organization
): number {
  let rate = engineer.baseRate;

  if (isOvertime) {
    switch (engineer.type) {
      case 'staff':
        // Применить коэффициенты в зависимости от организации
        rate = applyOvertimeMultiplier(rate, organization);
        break;
      case 'remote':
        rate = applyOvertimeMultiplier(rate, organization);
        break;
      case 'contract':
        // Фиксированные ставки для внеурочного времени
        rate = getContractOvertimeRate(organization);
        break;
    }
  }

  return hours * rate;
}
```

### Расчет эксплуатации автомобиля
```typescript
function calculateCarUsage(
  engineer: Engineer,
  distance: number,
  territory: string
): number {
  if (engineer.type === 'contract') {
    return distance * 14; // 14 руб/км
  }

  // Для штатного и удаленного
  let amount = engineer.homeTerritoryFixedAmount;

  if (engineer.type === 'remote') {
    if (distance > 60 && distance <= 199) amount += 1000;
    else if (distance > 199 && distance <= 250) amount += 1500;
    else if (distance > 250) amount += 2000;
  } else {
    // штатный
    if (distance > 60 && distance <= 250) amount += 1500;
    else if (distance > 250) amount += 2000;
  }

  return amount;
}
```

## 👥 Роли пользователей

### Администратор
- **Полный доступ** ко всем функциям
- Управление пользователями и их ролями
- Настройка ставок организаций
- Настройка ставок инженеров
- Распределение заявок
- Просмотр всей статистики и финансов
- Мониторинг прибыли

### Менеджер
- Управление заявками
- Распределение работ между инженерами
- Просмотр статистики выполнения планов
- Мониторинг загрузки инженеров

### Инженер
- Прием назначенных заявок
- Загрузка отчетов о выполненных работах
- Просмотр личной статистики
- Просмотр начисленной зарплаты

## 🎨 UI/UX Требования

### Общие компоненты
- Аутентификация (логин/пароль)
- Навигация по ролям
- Dashboard с ключевыми метриками
- Таблицы с фильтрацией и поиском
- Формы создания/редактирования
- Загрузка файлов (фото актов)

### Администратор
- Панель управления пользователями
- Настройки организаций и ставок
- Распределение заявок
- Финансовые отчеты
- Аналитика прибыли

### Менеджер
- Список активных заявок
- Распределение работ
- Статистика загрузки инженеров
- Отчеты по выполнению планов

### Инженер
- Личный кабинет
- Список назначенных заявок
- Форма отчетов
- Личная статистика и зарплата

## 📋 План разработки

### Фаза 1: Базовая инфраструктура (2 недели)
1. Настройка проекта (Angular + NestJS + MySQL)
2. Аутентификация и авторизация
3. Базовые сущности (User, Organization)
4. Простой UI для основных ролей

### Фаза 2: Управление заявками (2 недели)
1. CRUD операции для заявок
2. Назначение инженеров
3. Статусы заявок
4. Базовые отчеты

### Фаза 3: Система отчетов (3 недели)
1. Форма загрузки отчетов
2. Расчет часов работы
3. Загрузка фотографий
4. Валидация данных

### Фаза 4: Расчеты зарплаты (3 недели)
1. Движок расчетов
2. Месячные начисления
3. Премии за переработку
4. Эксплуатация автомобиля

### Фаза 5: Аналитика и отчеты (2 недели)
1. Dashboard для каждой роли
2. Статистика выполнения планов
3. Финансовые отчеты
4. Экспорт данных

### Фаза 6: Тестирование и оптимизация (2 недели)
1. Unit тесты
2. E2E тесты
3. Оптимизация производительности
4. Безопасность

**Общая продолжительность**: 14 недель
**Команда**: 3-4 разработчика (Frontend + Backend + QA)
