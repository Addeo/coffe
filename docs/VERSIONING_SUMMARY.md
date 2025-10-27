# Сводка по версионированию

## ✅ Что было исправлено

### 1. Источник текущей версии
**Проблема:** Версия была захардкожена в `AppUpdateService` и не обновлялась при сборке.

**Решение:**
- Версия теперь хранится в `environment.ts` как `appVersion: '1.0.1'`
- При инициализации `AppUpdateService` читает версию из `environment.ts`
- В нативном приложении дополнительно читается через Capacitor App API

### 2. Сравнение версий
**Проблема:** Некорректное сравнение версий между текущей и серверной.

**Решение:**
```typescript
// Текущая версия берется из environment (зашита в код)
const currentVersion = environment.appVersion;

// Серверная версия берется с backend
const serverVersion = await http.get('/api/app/version');

// Корректное сравнение
if (serverVersion !== currentVersion) {
  // Показать диалог обновления
}
```

### 3. Отображение версии в login
**Проблема:** Версия загружалась с backend вместо показа текущей версии приложения.

**Решение:**
```typescript
// Было: загрузка с backend
this.http.get('/api/app/version').subscribe(...)

// Стало: использование зашитой версии
appVersion = signal(environment.appVersion);
```

### 4. Скачивание APK для Android
**Проблема:** Использовался несуществующий `App.openUrl()` API.

**Решение:**
```typescript
// Для Android используем window.open с target='_system'
const link = document.createElement('a');
link.href = url;
link.target = '_system';
link.click();
```

## 📋 Текущая конфигурация

### Frontend
```typescript
// environment.ts и environment.prod.ts
appVersion: '1.0.1' // ← Fallback версия (используется в веб-версии)
```

### Backend
```typescript
// app.controller.ts
version: '1.0.2' // ← Новая версия на сервере
downloadUrl: 'http://localhost:8080/app-debug.apk'
```

### Android
```gradle
// build.gradle
versionCode 1
versionName "1.0.1" // ← РЕАЛЬНАЯ версия для нативного приложения
```

**⚠️ ВАЖНО:** В нативном приложении версия берется из `AndroidManifest.xml` (versionName), а НЕ из `environment.ts`!

## 🔄 Как работает обновление

### Шаг 1: Проверка при старте
```
AppComponent.ngOnInit()
  ↓
StartupService.checkForUpdates()
  ↓
AppUpdateService.checkForUpdates()
```

### Шаг 2: Сравнение версий
```
currentVersion (1.0.1) ≠ serverVersion (1.0.2)
  ↓
Показать диалог обновления
```

### Шаг 3: Скачивание
```
Пользователь нажимает "Обновить"
  ↓
AppUpdateService.downloadAndInstall(url)
  ↓
Android открывает системный диалог установки APK
```

### Шаг 4: Установка
```
Android устанавливает новую версию
  ↓
Пользователь запускает приложение
  ↓
Новая версия работает
```

## 🎯 Результат

### ✅ Что работает правильно:

1. **Текущая версия берется из кода**
   - Зашита в `environment.ts` при сборке
   - Не зависит от backend

2. **Версия на сервере возвращается через API**
   - `/api/app/version` возвращает актуальную версию
   - Может отличаться от текущей версии приложения

3. **Сравнение версий работает корректно**
   - Показывает диалог, если версии не совпадают
   - Не показывает диалог, если версии совпадают

4. **Скачивание APK работает для Android**
   - Использует системный браузер для скачивания
   - Android автоматически предлагает установку

5. **Отображение версии в login**
   - Показывает текущую версию приложения
   - Не загружает с backend

## 📝 Что нужно сделать для новой версии

1. **Обновить версию в коде:**
   ```bash
   # environment.ts
   appVersion: '1.0.2'
   
   # environment.prod.ts
   appVersion: '1.0.2'
   ```

2. **Обновить версию на сервере:**
   ```bash
   # app.controller.ts
   version: '1.0.2'
   ```

3. **Обновить Android версию:**
   ```bash
   # build.gradle
   versionCode 2
   versionName "1.0.2"
   ```

4. **Пересобрать приложение:**
   ```bash
   ng build --configuration production
   npx cap sync android
   ```

5. **Выложить APK на сервер:**
   ```bash
   # Разместить APK по URL из downloadUrl
   ```

## 🚀 Как протестировать

1. **Настроить разные версии:**
   - Frontend: `1.0.1`
   - Backend: `1.0.2`

2. **Запустить приложение:**
   ```bash
   # Должен появиться диалог обновления
   ```

3. **Проверить логи:**
   ```
   📱 Текущая версия приложения: 1.0.1
   📡 Версия на сервере: 1.0.2
   ✅ Доступна новая версия: 1.0.2
   ```

4. **Проверить скачивание:**
   ```
   📥 Загрузка обновления с: http://localhost:8080/app-debug.apk
   ✅ Обновление запущено на скачивание
   ```

## ❓ FAQ: Изменится ли версия в environment после обновления?

### Ответ: НЕТ! Environment НЕ меняется автоматически.

**Как это работает:**

1. **При сборке:**
   ```typescript
   // environment.ts
   appVersion: '1.0.1' // ← Компилируется в код
   ```

2. **В нативном приложении:**
   ```typescript
   // Версия берется из AndroidManifest.xml
   const info = await App.getInfo();
   info.version = "1.0.1" // ← Из build.gradle
   ```

3. **После установки нового APK:**
   ```typescript
   // Environment остается прежним ('1.0.1')
   // НО версия в AndroidManifest.xml изменяется ('1.0.2')
   const info = await App.getInfo();
   info.version = "1.0.2" // ← Из НОВОГО build.gradle
   ```

**Вывод:** 
- ❌ Environment НЕ меняется автоматически при обновлении
- ✅ Версия в AndroidManifest.xml меняется при установке нового APK
- ✅ AppUpdateService читает РЕАЛЬНУЮ версию из `App.getInfo()`

## 🔒 Защита от постоянных обновлений

### Проблема
Если версия не совпадает, приложение будет постоянно предлагать обновление при каждом запуске.

### Решение
Добавлена проверка интервала времени:
- Проверка обновлений происходит не чаще **раз в 24 часа**
- Время последней проверки сохраняется в `localStorage`
- Веб-версия **не проверяет** обновления вообще

```typescript
// Проверяем только для нативных платформ
if (!Capacitor.isNativePlatform()) {
  return null; // Веб-версия не проверяет
}

// Проверяем интервал
const lastCheck = getLastCheckTime();
if (lastCheck && (now - lastCheck) < 24 * 60 * 60 * 1000) {
  return null; // Пропускаем, если проверяли недавно
}
```

## ✅ Итог

Система версионирования работает корректно для Ionic/Capacitor приложения:
- ✅ Текущая версия берется из AndroidManifest.xml (нативное) или environment.ts (веб)
- ✅ Сравнение с серверной версией работает
- ✅ Скачивание APK для Android реализовано
- ✅ Отображение версии в login исправлено
- ✅ Environment НЕ меняется автоматически при обновлении
- ✅ **Веб-версия НЕ проверяет обновления**
- ✅ **Защита от постоянных обновлений (раз в 24 часа)**

