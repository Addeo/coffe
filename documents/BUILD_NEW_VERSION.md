# 🚀 Как собрать новую версию мобильного приложения

## 📋 Шаг 1: Обновить версии

### 1.1 Обновить `environment.prod.ts`

```bash
# Отредактировать frontend/src/environments/environment.prod.ts
appVersion: '1.0.2'  # Изменить с 1.0.1 на 1.0.2
```

### 1.2 Обновить `build.gradle`

```bash
# Отредактировать frontend/android/app/build.gradle
versionCode 2           # Изменить с 1 на 2
versionName "1.0.2"     # Изменить с "1.0.1" на "1.0.2"
```

## 🔨 Шаг 2: Собрать приложение

### Вариант A: Полная сборка (рекомендуется)

```bash
# 1. Перейти в директорию frontend
cd frontend

# 2. Собрать и синхронизировать с Android
npm run build:android

# Это выполнит:
# - ng build --configuration mobile
# - cap sync android
```

### Вариант B: Пошагово

```bash
# 1. Собрать Angular приложение для мобильной версии
cd frontend
ng build --configuration mobile

# 2. Синхронизировать с Android
npx cap sync android
```

## 📦 Шаг 3: Собрать APK

### Вариант A: Через командную строку

```bash
# Перейти в директорию android
cd frontend/android

# Собрать debug APK
./gradlew assembleDebug

# APK будет здесь:
# app/build/outputs/apk/debug/app-debug.apk
```

### Вариант B: Через Android Studio (рекомендуется)

```bash
# 1. Открыть Android Studio
cd frontend/android
./gradlew openAndroidStudio
# Или вручную: Android Studio → Open → frontend/android

# 2. В Android Studio:
#    - Дождаться завершения индексации
#    - Build → Build Bundle(s) / APK(s) → Build APK(s)
#    - Дождаться сборки (появится уведомление)
#    - Click "locate" в уведомлении
#    - Или найти: app/build/outputs/apk/debug/app-debug.apk
```

## 📥 Шаг 4: Загрузить APK на сервер

```bash
# Из корня проекта
scp frontend/android/app/build/outputs/apk/debug/app-debug.apk \
  user1@192.144.12.102:~/coffe/app-debug.apk

# Или если из frontend/android
scp app/build/outputs/apk/debug/app-debug.apk \
  user1@192.144.12.102:~/coffe/app-debug.apk
```

## ✅ Шаг 5: Проверить

```bash
# Проверить доступность APK
curl -I http://192.144.12.102:3001/app-debug.apk

# Должен вернуть: HTTP 200 OK

# Проверить версию API
curl http://192.144.12.102:3001/api/app/version

# Должен вернуть:
# {
#   "version": "1.0.2",
#   "downloadUrl": "http://192.144.12.102:3001/app-debug.apk"
# }
```

## 🧪 Шаг 6: Тестирование обновления

### Вариант A: На реальном устройстве

```bash
# 1. Скачать APK версии 1.0.1 (если есть)
# 2. Установить APK 1.0.1 на устройство
adb install app-debug.apk

# 3. Запустить приложение
# 4. Должен появиться диалог обновления на версию 1.0.2
```

### Вариант B: На эмуляторе

```bash
# 1. Запустить эмулятор Android
emulator -avd <AVD_NAME>

# 2. Установить старую версию (1.0.1)
adb install -r old-version.apk

# 3. Запустить приложение
# 4. Должен появиться диалог обновления

# 5. Установить новую версию (1.0.2)
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## 📝 Быстрая команда (все сразу)

```bash
# Из корня проекта
cd frontend && \
npm run build:android && \
cd android && \
./gradlew assembleDebug && \
scp app/build/outputs/apk/debug/app-debug.apk \
  user1@192.144.12.102:~/coffe/app-debug.apk && \
echo "✅ APK загружен на сервер!"
```

## 🔍 Проверка версии APK

### Через командную строку:

```bash
# Использовать aapt (Android Asset Packaging Tool)
aapt dump badging app/build/outputs/apk/debug/app-debug.apk | grep version

# Или через Android SDK tools
# ~/Library/Android/sdk/build-tools/*/aapt dump badging app-debug.apk | grep version

# Вывод:
# package: name='com.coffee.admin' versionCode='2' versionName='1.0.2'
```

### Через Android Studio:

1. Открыть APK в Android Studio
2. Посмотреть Manifest → versionCode и versionName

## ⚠️ Важные замечания

1. **versionCode** должен **всегда увеличиваться** (1 → 2 → 3...)
2. **versionName** должна совпадать с `backend app.controller.ts`
3. **Перед сборкой** убедитесь, что backend обновлен до версии 1.0.2
4. **После загрузки** проверьте доступность APK по URL

## 🐛 Решение проблем

### Проблема: "Gradle build failed"

```bash
# Очистить кэш и пересобрать
cd frontend/android
./gradlew clean
./gradlew assembleDebug
```

### Проблема: "Capacitor sync failed"

```bash
# Установить зависимости
cd frontend
npm install

# Пересинхронизировать
npx cap sync android
```

### Проблема: APK не доступен на сервере

```bash
# Проверить права доступа
ssh user1@192.144.12.102
ls -lah ~/coffe/app-debug.apk

# Если файла нет - загрузить снова
# Если ошибка доступа - настроить nginx для раздачи APK
```

### Проблема: "App not installed"

```bash
# Удалить старую версию перед установкой новой
adb uninstall com.coffee.admin
adb install app-debug.apk
```

## 📦 Альтернатива: Использовать готовый скрипт

```bash
# Создать скрипт для автоматической сборки
cat > build-and-deploy-apk.sh << 'EOF'
#!/bin/bash

set -e

echo "🚀 Building new APK version..."

# Перейти в frontend
cd frontend

# Собрать
echo "📦 Building Angular app..."
npm run build:android

# Собрать APK
echo "🔨 Building APK..."
cd android
./gradlew assembleDebug

# Загрузить на сервер
echo "📤 Uploading APK to server..."
scp app/build/outputs/apk/debug/app-debug.apk \
  user1@192.144.12.102:~/coffe/app-debug.apk

echo "✅ APK deployed successfully!"
echo ""
echo "Version check:"
curl http://192.144.12.102:3001/api/app/version
EOF

chmod +x build-and-deploy-apk.sh
./build-and-deploy-apk.sh
```

## 🎯 Итоговый чеклист

Перед выпуском новой версии убедитесь:

- [ ] Версия обновлена в `environment.prod.ts`
- [ ] Версия обновлена в `build.gradle` (versionName)
- [ ] versionCode увеличен в `build.gradle`
- [ ] Версия обновлена в `backend app.controller.ts`
- [ ] Сборка прошла без ошибок
- [ ] APK загружен на сервер
- [ ] APK доступен по URL
- [ ] API возвращает правильную версию
- [ ] Тестирование обновления прошло успешно
