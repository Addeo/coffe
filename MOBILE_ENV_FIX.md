# 📱 Исправление мобильного окружения

**Дата:** 25 октября 2025  
**Статус:** ✅ ИСПРАВЛЕНО

---

## 🎯 Проблема

Мобильное приложение использовало неправильный IP адрес для подключения к backend API:

- ❌ **Было:** `http://192.168.0.25:3001/api`
- ✅ **Стало:** `http://192.144.12.102:3001/api`

---

## ✅ Что было исправлено

### 1. Обновлен `environment.mobile.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'http://192.144.12.102:3001/api', // ✅ Правильный IP
  authUrl: 'http://192.144.12.102:3001/api/auth/login',
  appName: 'Coffee Admin Mobile',
  demo: false,
};
```

### 2. Обновлен `environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'http://192.144.12.102:3001/api', // ✅ Правильный IP
  authUrl: 'http://192.144.12.102:3001/api/auth/login',
  appName: 'Coffee Admin Panel',
  demo: false,
};
```

### 3. Добавлена конфигурация `mobile` в `angular.json`

Теперь есть отдельная конфигурация для мобильной сборки:

```json
"mobile": {
  "budgets": [...],
  "outputHashing": "all",
  "baseHref": "/",
  "fileReplacements": [
    {
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.mobile.ts"
    }
  ]
}
```

### 4. Обновлены npm scripts в `package.json`

```json
"build:android": "ng build --configuration mobile && cap sync android",
"build:ios": "ng build --configuration mobile && cap sync ios",
```

---

## 📦 Сборка Android приложения

### Команды для сборки:

```bash
# Переход в папку frontend
cd frontend

# Сборка для Android (использует mobile конфигурацию)
npm run build:android

# Переход в Android папку
cd android

# Сборка APK
./gradlew assembleDebug

# Копирование APK
cp app/build/outputs/apk/debug/app-debug.apk \
   /Users/sergejkosilov/WebstormProjects/new\ goal/coffe/CoffeeAdmin-mobile-fixed.apk
```

### Или одной командой:

```bash
cd frontend && npm run build:android && cd android && ./gradlew assembleDebug
```

---

## 📱 Результат

**APK файл:** `CoffeeAdmin-mobile-fixed.apk` (4.9 MB)

**Что изменилось:**

- ✅ Правильный backend URL: `http://192.144.12.102:3001/api`
- ✅ Отдельная конфигурация для мобильных устройств
- ✅ Корректное имя приложения: "Coffee Admin Mobile"

---

## 🔐 Тестовые данные

| Роль          | Email               | Пароль   |
| ------------- | ------------------- | -------- |
| Администратор | admin@coffee.com    | password |
| Менеджер      | manager@coffee.com  | password |
| Инженер       | engineer@coffee.com | password |

---

## ⚙️ Требования

### Backend сервер:

- ✅ Должен быть запущен на `192.144.12.102:3001`
- ✅ Порт 3001 должен быть открыт в firewall
- ✅ CORS настроен на прием запросов

### Мобильное устройство:

- ✅ Android 6.0+ (API 23+)
- ✅ Доступ к IP `192.144.12.102` (та же сеть/VPN)
- ✅ Интернет подключение

---

## 🧪 Проверка

### 1. Проверьте backend

```bash
curl http://192.144.12.102:3001/api
```

### 2. Проверьте APK

```bash
# Установка на устройство
adb install CoffeeAdmin-mobile-fixed.apk

# Запуск приложения
adb shell am start -n com.coffee.admin/.MainActivity
```

### 3. Проверьте логи

```bash
# Смотреть логи в реальном времени
adb logcat | grep "Capacitor"

# Проверка сетевых запросов
adb logcat | grep "http"
```

---

## 📋 Дополнительная информация

- **Package:** com.coffee.admin
- **Version:** 1.0
- **Min SDK:** Android 6.0 (API 23)
- **Target SDK:** Android 15 (API 35)
- **Размер:** 4.9 MB

---

## ✅ Готово!

Приложение готово к использованию с правильной конфигурацией backend API! 🎉
