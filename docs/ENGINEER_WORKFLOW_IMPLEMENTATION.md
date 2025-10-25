# Реализация Workflow для Инженеров

## 📋 Обзор

Реализован новый workflow для инженеров согласно требованиям:

1. ✅ Админ/Менеджер назначает инженера → статус `assigned` ("Новая")
2. ✅ Инженер видит кнопку "Подтвердить" и подтверждает заявку → статус `working` ("В работе")
3. ✅ Инженер видит кнопку "Выполнить" и вносит данные о работе
4. ⏳ После сохранения: заявка либо `completed` (выполнено), либо остается `working` (продолжение работ)
5. ⏳ Кнопка "Редактировать" в течение 24 часов после завершения

## ✅ Что реализовано (Frontend)

### 1. Кнопка "Подтвердить" (assigned → working)

**Где:** `frontend/src/app/pages/orders/orders.component.html` (строки 289-298)

**Логика:**

- Отображается только для инженеров (роль `USER`)
- Только для заказов со статусом `assigned`
- Только для заказов, назначенных на текущего инженера
- При нажатии вызывает `OrdersService.acceptOrder(id)`
- Backend endpoint: `POST /api/orders/:id/accept`

**Код:**

```typescript
canAcceptOrder(order: OrderDto): boolean {
  const currentUser = this.authService.currentUser();
  if (!currentUser || currentUser.role !== UserRole.USER) {
    return false;
  }
  return order.status === OrderStatus.ASSIGNED &&
         order.assignedEngineerId !== undefined;
}
```

### 2. Кнопка "Выполнить" (working → форма)

**Где:** `frontend/src/app/pages/orders/orders.component.html` (строки 300-309)

**Логика:**

- Отображается только для инженеров (роль `USER`)
- Только для заказов со статусом `working`
- Только для заказов, назначенных на текущего инженера
- При нажатии открывает диалог `WorkCompletionDialogComponent`

**Код:**

```typescript
canCompleteWork(order: OrderDto): boolean {
  const currentUser = this.authService.currentUser();
  if (!currentUser || currentUser.role !== UserRole.USER) {
    return false;
  }
  return order.status === OrderStatus.WORKING &&
         order.assignedEngineerId !== undefined;
}
```

### 3. Компонент формы ввода данных работы

**Файл:** `frontend/src/app/components/modals/work-completion-dialog.component.ts`

**Поля формы:**

#### ⏱ Время работы

- `regularHours` - Обычные часы (обязательное, min: 0)
- `overtimeHours` - Сверхурочные часы (min: 0)

#### 📍 Территория и расстояние

- `territoryType` - Тип территории (домашняя, зона 1-3, городская, пригородная, сельская)
- `distanceKm` - Расстояние в километрах

#### 🚗 Использование автомобиля

- `carPayment` - Оплата за использование автомобиля (₽)

#### 📝 Примечания

- `notes` - Комментарий о выполненной работе

#### ✅ Статус выполнения

- `isFullyCompleted` - Радио-кнопки:
  - ✅ **Работа завершена полностью** → статус `completed`
  - 🔄 **Требуется продолжение работ** → статус остается `working`

**UI Features:**

- Современный Material Design
- Валидация всех полей
- Адаптивный дизайн (мобильная версия)
- Loading состояние при сохранении
- Визуальное выделение статуса завершения

## ⏳ Что требует доработки Backend

### 1. API endpoint для сохранения данных работы

**Необходимо создать:** `POST /api/orders/:id/complete-work`

**Request Body:**

```typescript
{
  regularHours: number;
  overtimeHours: number;
  territoryType?: TerritoryType;
  distanceKm?: number;
  carPayment: number;
  notes?: string;
  isFullyCompleted: boolean;  // true = completed, false = остается working
}
```

**Response:**

```typescript
{
  order: OrderDto;  // Обновленный заказ
  workSession?: WorkSessionDto;  // Созданная рабочая сессия (если используется)
}
```

### 2. Логика обработки

**Backend должен:**

1. Проверить, что заказ в статусе `working`
2. Проверить, что инженер назначен на этот заказ
3. Создать/обновить запись о работе (work session или напрямую в order)
4. Рассчитать оплату на основе:
   - Часов работы
   - Ставок инженера
   - Ставок организации
   - Территории
5. Обновить статус заказа:
   - Если `isFullyCompleted === true` → `completed`
   - Если `isFullyCompleted === false` → остается `working`
6. Обновить поля заказа:
   ```typescript
   order.regularHours += regularHours;
   order.overtimeHours += overtimeHours;
   order.carUsageAmount += carPayment;
   order.distanceKm = distanceKm;
   order.territoryType = territoryType;
   order.workNotes = notes;
   if (isFullyCompleted) {
     order.completionDate = new Date();
   }
   ```

### 3. Уведомления

После сохранения данных о работе, отправить уведомления:

- Админу/Менеджеру о выполнении работы
- Если `isFullyCompleted === true` → уведомление о завершении заказа

## 🔄 Дальнейшие шаги

### Backend (требуется реализация):

1. **Создать endpoint:** `POST /api/orders/:id/complete-work`
2. **Добавить в OrdersController:**

   ```typescript
   @Post(':id/complete-work')
   @Roles(UserRole.USER)
   completeWork(
     @Param('id', ParseIntPipe) id: number,
     @Body() workData: CompleteWorkDto,
     @Request() req
   ) {
     return this.ordersService.completeWork(id, workData, req.user);
   }
   ```

3. **Добавить DTO:** `CompleteWorkDto`

   ```typescript
   export interface CompleteWorkDto {
     regularHours: number;
     overtimeHours: number;
     territoryType?: TerritoryType;
     distanceKm?: number;
     carPayment: number;
     notes?: string;
     isFullyCompleted: boolean;
   }
   ```

4. **Реализовать метод в OrdersService:**
   ```typescript
   async completeWork(
     orderId: number,
     workData: CompleteWorkDto,
     user: User
   ): Promise<Order> {
     // Проверки прав доступа
     // Создание/обновление данных работы
     // Расчет оплаты
     // Обновление статуса
     // Отправка уведомлений
   }
   ```

### Frontend (уже реализовано, требует подключения API):

1. **Обновить `WorkCompletionDialogComponent.onSave()`:**
   - Вызвать реальный API endpoint вместо placeholder
   - Обработать ответ
   - Обновить список заказов

2. **Обновить `OrdersComponent.onCompleteWork()`:**
   - Обработать результат из диалога
   - Обновить статус заказа в списке

## 🎯 Статусы заказов

| Статус    | Английский  | Когда               | Кто может изменить                                       |
| --------- | ----------- | ------------------- | -------------------------------------------------------- |
| Waiting   | `waiting`   | Создан, не назначен | Админ/Менеджер → `assigned`                              |
| Assigned  | `assigned`  | Назначен инженеру   | Инженер → `working` (кнопка "Подтвердить")               |
| Working   | `working`   | В работе            | Инженер → `working` или `completed` (кнопка "Выполнить") |
| Completed | `completed` | Завершен            | -                                                        |

## 📱 UI/UX

### Для Админа/Менеджера:

- Видят все кнопки управления заказами
- Могут назначать/переназначать инженеров
- Видят статистику по всем заказам

### Для Инженера:

- Видят только свои назначенные заказы
- **Статус `assigned`:** кнопка "Подтвердить" ✅
- **Статус `working`:** кнопка "Выполнить" 🔧
- После завершения: кнопка "Редактировать" в течение 24 часов (TODO)

## ✅ Готово к тестированию (Frontend)

1. ✅ Кнопка "Подтвердить" отображается и работает
2. ✅ Кнопка "Выполнить" отображается
3. ✅ Форма ввода данных работы создана и готова
4. ✅ Валидация полей формы
5. ✅ Адаптивный дизайн

## ⏳ Ожидает реализации

1. Backend endpoint для сохранения данных работы
2. Логика частичного/полного выполнения на backend
3. Кнопка "Редактировать" (24 часа после завершения)
4. Интеграция с WorkSessions (если требуется)

---

**Дата:** 16 октября 2025  
**Статус:** Frontend реализован, Backend требует доработки  
**Сборка:** ✅ Успешна (Hash: cf352f4b65979db7)
