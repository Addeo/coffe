# 📱 Пошаговая инструкция сборки Android приложения

## 🎯 Быстрая сборка (одна команда)

```bash
cd /Users/sergejkosilov/WebstormProjects/new\ goal/coffe/frontend
npm run build:android && cd android && ./gradlew assembleDebug
```

**Результат:** APK файл в `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📋 Детальная инструкция

### Шаг 1: Подготовка (выполняется один раз)

```bash
# 1.1. Убедитесь, что установлены зависимости
cd frontend
npm install

# 1.2. Проверьте Capacitor
npx cap doctor

# 1.3. Если Android не добавлен, добавьте:
npx cap add android
```

---

### Шаг 2: Сборка Angular приложения

```bash
# Соберите production версию
npm run build -- --configuration production
```

**Ожидаемый результат:**
```
✔ Browser application bundle generation complete.
Build at: 2025-10-17T10:40:00.000Z
```

**Время:** ~6-10 секунд

---

### Шаг 3: Синхронизация с Capacitor

```bash
# Скопируйте web assets в Android проект
npx cap sync android
```

**Что происходит:**
- Копирование `dist/` в `android/app/src/main/assets/public/`
- Обновление конфигурации
- Обновление плагинов

**Ожидаемый результат:**
```
✔ Copying web assets from coffee-admin to android/app/src/main/assets/public
✔ Creating capacitor.config.json in android/app/src/main/assets
✔ copy android
✔ Updating Android plugins
✔ update android
Sync finished in 0.097s
```

**Время:** ~100 мс

---

### Шаг 4: Сборка APK

```bash
# Перейдите в Android директорию
cd android

# Соберите debug APK
./gradlew assembleDebug

# Или release APK (требует keystore)
./gradlew assembleRelease
```

**Ожидаемый результат:**
```
BUILD SUCCESSFUL in 6s
85 actionable tasks: 24 executed, 61 up-to-date
```

**Время:** ~6-15 секунд

---

### Шаг 5: Найдите APK

```bash
# Debug APK:
find . -name "app-debug.apk"
# Результат: ./app/build/outputs/apk/debug/app-debug.apk

# Release APK:
find . -name "app-release.apk"
# Результат: ./app/build/outputs/apk/release/app-release.apk
```

**Или просто:**
```bash
ls -lh app/build/outputs/apk/debug/
```

---

### Шаг 6: Копирование в удобное место

```bash
# Скопируйте APK в корень проекта
cp app/build/outputs/apk/debug/app-debug.apk \
   /Users/sergejkosilov/WebstormProjects/new\ goal/coffe/CoffeeAdmin-debug.apk

# Проверьте
ls -lh /Users/sergejkosilov/WebstormProjects/new\ goal/coffe/*.apk
```

---

## 🚀 АЛЬТЕРНАТИВНЫЕ СПОСОБЫ

### Способ 1: Через npm скрипт (РЕКОМЕНДУЕМ!)

```bash
cd frontend
npm run build:android
```

Эта команда выполнит:
1. `ng build --configuration production`
2. `cap sync android`

**Затем соберите APK:**
```bash
cd android
./gradlew assembleDebug
```

---

### Способ 2: Через Android Studio

```bash
# 1. Откройте проект в Android Studio
cd frontend
npx cap open android
```

**В Android Studio:**
1. Подождите синхронизации Gradle
2. Нажмите **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Дождитесь завершения
4. Нажмите **locate** для поиска APK

---

### Способ 3: Через Ionic CLI

```bash
# 1. Соберите Ionic приложение
ionic build --prod

# 2. Синхронизируйте
ionic cap sync android

# 3. Откройте в Android Studio
ionic cap open android
```

---

## 🔧 НАСТРОЙКА ПЕРЕД СБОРКОЙ

### 1. Версия приложения

Обновите в `frontend/package.json`:
```json
{
  "version": "1.0.0"
}
```

### 2. App ID и название

Обновите в `capacitor.config.json`:
```json
{
  "appId": "com.coffee.admin",
  "appName": "Coffee Admin"
}
```

### 3. API URL для production

Обновите в `frontend/src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-url.com',
};
```

### 4. Иконки и splash screen

```bash
# Сгенерируйте из исходных изображений
npm install -g @capacitor/assets
npx capacitor-assets generate
```

---

## 📊 РАЗМЕРЫ СБОРКИ

| Компонент | Размер |
|-----------|--------|
| Angular bundle | 1.34 MB |
| Web assets | ~500 KB |
| Capacitor runtime | ~200 KB |
| Android WebView | ~2 MB |
| **Итого APK** | **~4.8 MB** |

### Оптимизация:

```bash
# 1. Включите ProGuard (в build.gradle)
minifyEnabled true
shrinkResources true

# 2. Используйте AAB вместо APK
./gradlew bundleRelease

# 3. Разделите по ABI
splits {
    abi {
        enable true
        reset()
        include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
    }
}
```

**Результат:** Уменьшение до ~3.5 MB

---

## ⚡ БЫСТРЫЕ КОМАНДЫ

### Полная пересборка:

```bash
cd frontend
rm -rf dist/ android/app/build/
npm run build -- --configuration production
npx cap sync android
cd android
./gradlew clean assembleDebug
```

### Только APK (без Angular rebuild):

```bash
cd frontend/android
./gradlew assembleDebug
```

### Установка на подключённое устройство:

```bash
./gradlew installDebug
```

### Запуск на устройстве:

```bash
./gradlew installDebug
adb shell am start -n com.coffee.admin/.MainActivity
```

---

## 🧪 ТЕСТИРОВАНИЕ APK

### На эмуляторе:

```bash
# Запустите эмулятор
emulator -avd Pixel_5_API_33

# Установите APK
adb install CoffeeAdmin-debug.apk

# Запустите приложение
adb shell am start -n com.coffee.admin/.MainActivity
```

### На физическом устройстве:

```bash
# Подключите устройство по USB
# Включите "Отладку по USB" на устройстве

# Проверьте подключение
adb devices

# Установите
adb install CoffeeAdmin-debug.apk
```

---

## 📝 ЧЕКЛИСТ ПЕРЕД СБОРКОЙ

- [ ] Backend URL настроен правильно
- [ ] Версия обновлена в package.json
- [ ] Иконка и splash screen обновлены
- [ ] Все зависимости установлены
- [ ] Angular build проходит без ошибок
- [ ] Capacitor sync выполнен
- [ ] Android SDK установлен
- [ ] Java JDK 11+ установлен

---

## 🎉 ГОТОВО!

**APK файл создан:**
```
📱 CoffeeAdmin-debug.apk (4.8 MB)
```

**Можете устанавливать на Android устройства!** 🚀

---

**Дата:** 17 октября 2025  
**Версия:** Debug build  
**Статус:** ✅ READY

