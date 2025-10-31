# Система версионирования и обновлений

## Как работает версионность

### 1. Текущая версия приложения

**Источник версии:**

- **В коде**: Зашита в `environment.ts` и `environment.prod.ts` как `appVersion: '1.0.1'`
- **При сборке**: Берется из `environment.appVersion` и встраивается в код
- **В нативном приложении**: Читается из `AndroidManifest.xml` через Capacitor App API

**Важно:** Версия в `environment.ts` должна совпадать с версией в `package.json`!

### 2. Версия на сервере

**Источник версии:**

- Backend возвращает актуальную версию через `/api/app/version`
- Версия хранится в `backend/src/modules/app/app.controller.ts`

**Текущая версия на сервере:** `1.0.2`

### 3. Процесс обновления

#### Шаг 1: Проверка при старте

```typescript
// При запуске приложения вызывается StartupService.checkForUpdates()
// Сравнивается текущая версия с версией на сервере
```

#### Шаг 2: Сравнение версий

```typescript
currentVersion: string = environment.appVersion; // Из кода
serverVersion: string = await http.get('/api/app/version');

if (serverVersion !== currentVersion) {
  // Показать диалог обновления
}
```

#### Шаг 3: Скачивание APK

```typescript
// Для Android открывается ссылка на APK
// Android автоматически предложит установить обновление
await App.openUrl({ url: downloadUrl });
```

#### Шаг 4: Установка

- Android покажет системный диалог установки
- После установки пользователь сам запускает новую версию

## Конфигурация

### Frontend (`environment.ts`)

```typescript
export const environment = {
  appVersion: '1.0.1', // ← Текущая версия в коде
  // ...
};
```

### Backend (`app.controller.ts`)

```typescript
@Get('version')
getVersion() {
  return {
    version: '1.0.2', // ← Новая версия на сервере
    downloadUrl: 'http://.../app-debug.apk',
    required: false,
    releaseNotes: '...',
  };
}
```

### Android (`build.gradle`)

```gradle
android {
    defaultConfig {
        versionCode 2      // ← Увеличить при каждой сборке
        versionName "1.0.2" // ← Должна совпадать с serverVersion
    }
}
```

## Обновление версии приложения

### Для новой сборки:

1. **Обновить версию в коде:**

   ```bash
   # В frontend/src/environments/environment.ts
   appVersion: '1.0.2'

   # В frontend/src/environments/environment.prod.ts
   appVersion: '1.0.2'
   ```

2. **Обновить версию на сервере:**

   ```bash
   # В backend/src/modules/app/app.controller.ts
   version: '1.0.2'
   ```

3. **Обновить AndroidManifest.xml:**

   ```bash
   # В frontend/android/app/build.gradle
   versionCode 2
   versionName "1.0.2"
   ```

4. **Пересобрать приложение:**

   ```bash
   ng build --configuration production
   npx cap sync android
   # Собрать APK
   ```

5. **Выложить новый APK на сервер:**
   ```bash
   # Загрузить на сервер доступный по downloadUrl
   ```

## Типы обновлений

### Обязательное обновление (`required: true`)

- Пользователь не может закрыть диалог
- При отмене приложение закрывается
- Используется для критических исправлений безопасности

### Опциональное обновление (`required: false`)

- Пользователь может отложить обновление
- Приложение продолжает работать

## Проверка работы

### Тестирование обновлений:

1. **Настроить версии:**
   - Frontend: `1.0.1`
   - Backend: `1.0.2`
   - APK должен быть `1.0.2`

2. **Запустить приложение:**

   ```bash
   # Должен появиться диалог обновления
   ```

3. **Проверить логи:**
   ```bash
   # В консоли браузера/Android Studio
   📱 Текущая версия приложения: 1.0.1
   📡 Версия на сервере: 1.0.2
   ✅ Доступна новая версия: 1.0.2
   ```

## Процесс для разработчика

### Когда выпускается новая версия:

1. **Обновить версию во всех местах:**

   ```bash
   environment.ts → 1.0.2
   environment.prod.ts → 1.0.2
   app.controller.ts → 1.0.2
   build.gradle → versionName "1.0.2"
   ```

2. **Собрать новую версию:**

   ```bash
   cd frontend
   ng build --configuration production
   npx cap sync android
   ```

3. **Сгенерировать APK:**

   ```bash
   cd android
   ./gradlew assembleDebug
   # Или через Android Studio
   ```

4. **Выложить APK на сервер:**

   ```bash
   # Разместить по URL из downloadUrl
   ```

5. **Протестировать обновление:**
   ```bash
   # Запустить старую версию
   # Должно появиться уведомление об обновлении
   ```

## Частые вопросы

### Q: Почему версия не обновляется?

A: Проверьте, что версия в `environment.ts` совпадает с версией на сервере

### Q: Как заставить пользователей обновиться?

A: Установите `required: true` в ответе `/api/app/version`

### Q: Можно ли обновлять автоматически?

A: Да, Android покажет системный диалог установки APK

### Q: Что если downloadUrl недоступен?

A: Приложение продолжит работать, но обновление не будет доступно

## Следующие шаги

1. ✅ Добавить проверку версии при старте
2. ✅ Показать диалог обновления
3. ✅ Реализовать скачивание APK
4. ⏳ Добавить прогресс загрузки
5. ⏳ Добавить уведомления о новых версиях
6. ⏳ Реализовать фоновую загрузку
