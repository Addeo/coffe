# 📱 Автообновление Android приложения

## 🎯 Обзор

Система автообновления Android приложения реализована с использованием следующих технологий:
- **Capacitor** - для создания нативного Android приложения
- **Backend API** - для хранения информации о версиях
- **Angular сервисы** - для проверки и загрузки обновлений

## 🔧 Что было реализовано

### 1. Frontend (Angular)

#### Сервисы:
- **`AppUpdateService`** (`frontend/src/app/services/app-update.service.ts`)
  - Проверяет наличие новых версий
  - Загружает обновления
  - Перезагружает приложение

- **`StartupService`** (`frontend/src/app/services/startup.service.ts`)
  - Проверяет обновления при старте приложения
  - Показывает диалог обновления

#### Компоненты:
- **`AppUpdateComponent`** (`frontend/src/app/components/app-update/app-update.component.ts`)
  - Диалог с предложением обновить приложение
  - Кнопки "Обновить сейчас" и "Напомнить позже"

### 2. Backend (NestJS)

#### Endpoint:
- **`GET /api/app/version`** - возвращает информацию о текущей версии приложения

```json
{
  "version": "1.0.1",
  "downloadUrl": "https://your-app-download-url.com/app.apk",
  "required": false,
  "releaseNotes": "Обновление включает новые функции и исправления ошибок."
}
```

## 🚀 Как это работает

### Процесс обновления:

1. **При старте приложения** (`app.component.ts`):
   - Вызывается `startupService.checkForUpdates()`
   - Запрос к backend для получения информации о версии

2. **Проверка версии**:
   - Сравнивается текущая версия с версией на сервере
   - Если версии отличаются, показывается диалог обновления

3. **Загрузка обновления**:
   - Пользователь нажимает "Обновить сейчас"
   - Приложение скачивает APK файл
   - После загрузки выполняется установка

## 📋 Настройка

### 1. Обновление версии на backend

Измените версию в `backend/src/modules/app/app.controller.ts`:

```typescript
@Get('version')
getVersion() {
  return {
    version: '1.0.2', // Новая версия
    downloadUrl: 'https://your-server.com/app-v1.0.2.apk',
    required: false,
    releaseNotes: 'Новые функции и исправления',
  };
}
```

### 2. Загрузка APK на сервер

После сборки Android приложения загрузите APK файл на ваш сервер:

```bash
# Соберите Android приложение
cd frontend/android
./gradlew assembleRelease

# APK файл будет в
# android/app/build/outputs/apk/release/app-release.apk

# Загрузите на сервер
scp android/app/build/outputs/apk/release/app-release.apk user@server:/var/www/app-v1.0.2.apk
```

### 3. Обновление downloadUrl

Укажите URL для скачивания APK в backend:

```typescript
downloadUrl: 'https://your-server.com/app-v1.0.2.apk'
```

## 🔒 Безопасность

### Рекомендации:

1. **Проверка подписи APK**:
   - Всегда подписывайте APK файлы
   - Проверяйте подпись перед установкой

2. **HTTPS**:
   - Используйте HTTPS для скачивания APK
   - Защитите backend API

3. **Версионность**:
   - Храните историю версий
   - Откатывайте обновления при необходимости

## 🎨 Кастомизация

### Изменение диалога обновления

Отредактируйте `frontend/src/app/components/app-update/app-update.component.ts`:

```typescript
template: `
  <div class="update-dialog">
    <h2>Доступно обновление</h2>
    <!-- Ваш кастомный дизайн -->
  </div>
`
```

### Изменение логики проверки

Отредактируйте `frontend/src/app/services/app-update.service.ts`:

```typescript
async checkForUpdates(): Promise<{ available: boolean; version?: string; url?: string }> {
  // Ваша логика проверки
}
```

## 📊 Мониторинг

### Логирование обновлений

Все действия логируются в консоль:

```typescript
console.log('Проверка обновлений...');
console.log('Доступна новая версия:', version);
console.log('Загрузка обновления...');
```

### Backend логи

Для отслеживания запросов на обновления добавьте middleware в `app.controller.ts`:

```typescript
@Get('version')
@UseInterceptors(LoggingInterceptor)
getVersion() {
  // Логирование запросов
}
```

## 🐛 Отладка

### Проверка версии

```bash
# Проверьте версию на backend
curl http://localhost:3000/api/app/version

# Должен вернуться JSON с информацией о версии
```

### Проверка загрузки

```bash
# Проверьте доступность APK файла
curl -I https://your-server.com/app-v1.0.2.apk

# Должен вернуться HTTP 200
```

## ⚠️ Важные замечания

1. **Google Play Store**:
   - Для публикации в Google Play используйте **In-App Updates**
   - Эта система предназначена для внутренних обновлений или внешних источников

2. **Разрешения Android**:
   - Приложение должно запрашивать разрешение на установку из неизвестных источников
   - Добавьте в `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
```

3. **Производительность**:
   - Проверка обновлений происходит при каждом старте
   - Рассмотрите добавление кэширования результатов

## 📚 Дополнительные ресурсы

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android In-App Updates](https://developer.android.com/guide/play/core/in-app-updates)
- [Angular Signals](https://angular.dev/guide/signals)

