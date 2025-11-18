# 🔒 Исправление безопасности: доступ к admin endpoint

## 🐛 Проблема

Эндпоинт `/api/statistics/admin/engineers` вызывался для менеджеров и инженеров, хотя он предназначен только для администраторов.

**Backend защита:**
```typescript
@Get('admin/engineers')
@Roles(UserRole.ADMIN)  // ✅ Правильно защищен
```

**Проблема на фронтенде:**
```typescript
// ❌ БЫЛО (неправильно):
if (this.isEngineer && this.currentUser()) {
  // engineer endpoint
} else {
  // admin endpoint для ВСЕХ остальных (включая менеджеров!)
  this.statisticsService.getAdminEngineerStatistics(year, month)
}
```

## ✅ Исправление

Исправлен `frontend/src/app/components/earnings-summary/earnings-summary.component.ts`:

```typescript
// ✅ СТАЛО (правильно):
if (this.isEngineer() && this.currentUser()) {
  // Инженеры: /api/statistics/engineer/detailed
  this.statisticsService.getEngineerDetailedStats(year, month)
} else if (this.isAdmin()) {
  // Админы: /api/statistics/admin/engineers
  this.statisticsService.getAdminEngineerStatistics(year, month)
} else if (this.isManager()) {
  // Менеджеры: /api/statistics/monthly
  this.statisticsService.getMonthlyStatistics(year, month)
} else {
  // Неизвестная роль - пустые данные
}
```

## 📋 Итоговое распределение эндпоинтов:

1. **Инженеры (USER):**
   - `/api/statistics/engineer/detailed` ✅

2. **Менеджеры (MANAGER):**
   - `/api/statistics/monthly` ✅
   - `/api/statistics/comprehensive` ✅
   - `/api/statistics/payment-debts` ✅

3. **Админы (ADMIN):**
   - `/api/statistics/admin/engineers` ✅ (только для админов)
   - `/api/statistics/monthly` ✅
   - `/api/statistics/comprehensive` ✅
   - `/api/statistics/payment-debts` ✅

## 🔐 Безопасность

**Backend всегда проверяет роль:**
- `RolesGuard` блокирует доступ к `/api/statistics/admin/engineers` для не-админов
- Но правильно не вызывать запрещенные эндпоинты с фронтенда

**Почему это важно:**
1. Меньше ненужных запросов к серверу
2. Лучший UX (нет ошибок 403)
3. Правильная архитектура (клиент не должен запрашивать то, к чему нет доступа)

## ✅ Результат

Теперь:
- ✅ Инженеры НЕ вызывают admin endpoint
- ✅ Менеджеры НЕ вызывают admin endpoint
- ✅ Только админы вызывают `/api/statistics/admin/engineers`

