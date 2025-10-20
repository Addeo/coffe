# 📱 Руководство по тестированию Android приложения

**Дата:** 20 октября 2025  
**Версия:** 1.0

---

## 📦 Доступные сборки

| Файл | Размер | Назначение | Backend URL |
|------|--------|------------|-------------|
| `CoffeeAdmin-fixed.apk` | 5.0 MB | ✅ **Для реальных устройств** | `http://192.144.12.102:3001/api` |
| `CoffeeAdmin-emulator.apk` | 4.9 MB | 🖥️ **Для эмулятора** | `http://localhost:3001/api` |

---

## 🎯 Выбор правильной сборки

### Для реального Android устройства (телефон/планшет)

✅ **Используйте:** `CoffeeAdmin-fixed.apk`

**Требования:**
- Устройство должно быть в той же сети, где доступен IP `192.144.12.102`
- Backend должен быть запущен и доступен по адресу `192.144.12.102:3001`
- Порт 3001 должен быть открыт в firewall

**Установка:**
```bash
adb install CoffeeAdmin-fixed.apk
```

Или скопируйте файл на устройство и установите вручную.

---

### Для эмулятора Android

✅ **Используйте:** `CoffeeAdmin-emulator.apk`

**Требования:**
- Backend должен быть запущен **на этом же компьютере** на порту 3001
- Настроен port forwarding через `adb reverse`

**Полная инструкция:**

#### 1. Запустите backend
```bash
cd backend
npm start
# Backend должен быть доступен на http://localhost:3001
```

#### 2. Запустите эмулятор
```bash
/Users/sergejkosilov/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_36.1 &
```

#### 3. Настройте port forwarding
```bash
adb reverse tcp:3001 tcp:3001
```

#### 4. Установите APK
```bash
adb install CoffeeAdmin-emulator.apk
```

#### 5. Запустите приложение
```bash
adb shell am start -n com.coffee.admin/.MainActivity
```

---

## 🔐 Тестовые данные для входа

| Роль | Email | Пароль |
|------|-------|---------|
| **Администратор** | `admin@coffee.com` | `password` |
| **Менеджер** | `manager@coffee.com` | `password` |
| **Инженер** | `engineer@coffee.com` | `password` |

---

## 📊 Мониторинг логов

### Просмотр логов приложения

```bash
# Очистить логи
adb logcat -c

# Смотреть логи в реальном времени
adb logcat | grep "Capacitor"
```

### Просмотр логов консоли (JavaScript)

```bash
adb logcat | grep "Capacitor/Console"
```

### Сделать скриншот

```bash
adb exec-out screencap -p > screenshot.png
```

### Получить детальный отчет об ошибках

```bash
adb bugreport bugreport.zip
```

---

## ✅ Проверка работоспособности

### Тест 1: Проверка backend

**Для реального устройства:**
```bash
# С устройства через браузер
http://192.144.12.102:3001/api
```

**Для эмулятора:**
```bash
# С компьютера
curl http://localhost:3001/api
```

Должен вернуть ответ от API (даже если 404 - это нормально, главное что сервер отвечает).

### Тест 2: Проверка подключения эмулятора

```bash
# Проверить port forwarding
adb reverse --list
# Должно показать: tcp:3001 -> tcp:3001

# Проверить с эмулятора
adb shell "curl -s http://localhost:3001/api"
```

### Тест 3: Проверка приложения

1. **Запустите приложение**
2. **Должна открыться страница логина** (не белый экран!)
3. **Введите данные:**
   - Email: `admin@coffee.com`
   - Password: `password`
4. **Нажмите "Войти"**
5. **Должен открыться Dashboard** с данными

---

## 🐛 Решение проблем

### Проблема: Белый экран

**Причина:** Неправильный `baseHref` в Angular  
**Решение:** Убедитесь, что используете правильную сборку APK

**Проверка:**
```bash
aapt dump badging CoffeeAdmin-fixed.apk | grep version
```

### Проблема: Ошибка подключения к серверу

**Для реального устройства:**
- Проверьте, что устройство в той же сети
- Проверьте доступность `192.144.12.102` с устройства
- Проверьте, что backend запущен

**Для эмулятора:**
- Проверьте, что backend запущен на localhost:3001
- Проверьте port forwarding: `adb reverse --list`
- Переустановите port forwarding: `adb reverse tcp:3001 tcp:3001`

### Проблема: Эмулятор не подключается

```bash
# Перезапустите adb
adb kill-server
adb start-server
adb devices
```

### Проблема: APK не устанавливается

```bash
# Удалите старую версию
adb uninstall com.coffee.admin

# Установите заново
adb install -r CoffeeAdmin-emulator.apk
```

---

## 🔍 Отладка

### Chrome DevTools для WebView

1. Откройте Chrome на компьютере
2. Перейдите на `chrome://inspect`
3. Найдите приложение Coffee Admin
4. Кликните "Inspect"
5. Смотрите Console, Network, Elements как в обычном браузере

### Логирование сетевых запросов

```bash
adb logcat | grep -E "http|xhr|fetch"
```

### Проверка состояния приложения

```bash
adb shell dumpsys activity | grep "com.coffee.admin"
```

---

## 📱 Различия между сборками

### CoffeeAdmin-fixed.apk (Production)

```typescript
// environment.prod.ts
apiUrl: 'http://192.144.12.102:3001/api'
authUrl: 'http://192.144.12.102:3001/api/auth/login'
```

**Для кого:** Реальные Android устройства в локальной сети  
**Когда использовать:** Финальное тестирование, production deploy

### CoffeeAdmin-emulator.apk (Development)

```typescript
// environment.prod.ts
apiUrl: 'http://localhost:3001/api'
authUrl: 'http://localhost:3001/api/auth/login'
```

**Для кого:** Android эмулятор на том же компьютере  
**Когда использовать:** Локальная разработка и отладка

---

## 🚀 Быстрый старт

### Вариант 1: Тестирование на эмуляторе

```bash
# 1. Запустите backend
cd backend && npm start &

# 2. Запустите эмулятор
/Users/sergejkosilov/Library/Android/sdk/emulator/emulator -avd Medium_Phone_API_36.1 &

# 3. Подождите 20 секунд

# 4. Настройте и установите
adb reverse tcp:3001 tcp:3001
adb install CoffeeAdmin-emulator.apk
adb shell am start -n com.coffee.admin/.MainActivity
```

### Вариант 2: Тестирование на реальном устройстве

```bash
# 1. Подключите устройство по USB
# 2. Включите отладку по USB на устройстве
# 3. Проверьте подключение
adb devices

# 4. Установите APK
adb install CoffeeAdmin-fixed.apk

# 5. Откройте приложение на устройстве
```

---

## 📋 Чеклист перед тестированием

- [ ] Backend запущен и доступен
- [ ] Эмулятор/устройство подключено (`adb devices`)
- [ ] Port forwarding настроен (для эмулятора)
- [ ] Правильная версия APK выбрана
- [ ] APK установлен успешно
- [ ] Тестовые данные под рукой

---

## 🎉 Успешное тестирование

Если всё работает правильно, вы должны:

1. ✅ Видеть страницу логина (не белый экран)
2. ✅ Успешно войти с тестовыми данными
3. ✅ Увидеть Dashboard с данными
4. ✅ Переходить между страницами
5. ✅ Загружать данные из API

---

**Создано:** 20 октября 2025  
**Статус:** ✅ ПРОТЕСТИРОВАНО  
**Версия документа:** 1.0

