# Мобильная сборка Ionic/Angular приложения

Это руководство содержит все необходимые команды для сборки мобильного приложения на платформах Android и iOS.

## Предварительные требования

### Для Android:
- Android Studio (последняя версия)
- JDK 11 или выше
- Android SDK (API 22+ рекомендуется)

### Для iOS:
- macOS
- Xcode 13+
- iOS Simulator или физическое устройство

## Доступные команды сборки

### Основные команды:

```bash
# Установка зависимостей
npm install

# Сборка для разработки
npm run dev

# Сборка для production
npm run build

# Ionic команды
npm run ionic:serve    # Запуск в браузере с Ionic Dev Server
npm run ionic:build    # Сборка Ionic приложения
```

### Мобильная сборка:

```bash
# Сборка для Android (с синхронизацией Capacitor)
npm run build:android

# Сборка для iOS (с синхронизацией Capacitor)
npm run build:ios

# Сборка для обеих платформ
npm run mobile:build

# Альтернативные команды (если нужны отдельные шаги)
npm run build                    # Сборка Angular приложения
npm run capacitor:sync          # Синхронизация с нативными платформами
npm run capacitor:copy          # Только копирование веб-ресурсов
```

### Работа с Capacitor:

```bash
# Синхронизация веб-ресурсов с нативными платформами
npm run capacitor:sync

# Копирование веб-ресурсов (без обновления зависимостей)
npm run capacitor:copy

# Открытие Android проекта в Android Studio
npm run open:android

# Открытие iOS проекта в Xcode
npm run open:ios
```

### Добавление платформ (если необходимо):

```bash
# Добавить Android платформу
npm run capacitor:add:android

# Добавить iOS платформу
npm run capacitor:add:ios
```

## Процесс сборки

### Для Android:

1. **Подготовка:**
   ```bash
   npm run build:android
   ```

2. **Открытие в Android Studio:**
   ```bash
   npm run open:android
   ```

3. **Сборка APK:**
   - В Android Studio: Build → Build Bundle(s)/APK(s) → Build APK(s)
   - Или через командную строку в папке android:
     ```bash
     cd android
     ./gradlew assembleDebug  # Для debug версии
     ./gradlew assembleRelease  # Для release версии
     ```

### Для iOS:

1. **Подготовка:**
   ```bash
   npm run build:ios
   ```

2. **Открытие в Xcode:**
   ```bash
   npm run open:ios
   ```

3. **Сборка:**
   - В Xcode: Product → Build
   - Для запуска на симуляторе: Product → Run
   - Для архивации: Product → Archive

## Конфигурация

### Capacitor конфигурация (`capacitor.config.json`):
- **appId**: `com.coffee.admin`
- **appName**: `Coffee Admin`
- **webDir**: `dist/coffee-admin`
- Настроен Splash Screen

### Ionic конфигурация (`ionic.config.json`):
- Тип проекта: Angular
- Интеграция с Capacitor

## Полезные советы

1. **Перед первой сборкой** убедитесь, что все зависимости установлены:
   ```bash
   npm install
   ```

2. **Для Android** установите переменные окружения:
   ```bash
   export ANDROID_HOME=/path/to/Android/SDK
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```

3. **Очистка кэша** при проблемах:
   ```bash
   rm -rf node_modules android ios
   npm install
   npm run capacitor:add:android
   npm run capacitor:add:ios
   ```

4. **Обновление зависимостей Capacitor**:
   ```bash
   npx cap update
   ```

5. **Проверка состояния**:
   ```bash
   npx cap doctor
   ```

## Структура проекта

```
frontend/
├── android/           # Android нативный проект
├── ios/              # iOS нативный проект
├── capacitor.config.json
├── ionic.config.json
├── package.json      # Содержит все скрипты сборки
└── src/              # Исходный код Angular приложения
```

## Troubleshooting

### Android:
- Убедитесь, что Android SDK установлен
- Проверьте JAVA_HOME
- Попробуйте `./gradlew clean` в папке android

### iOS:
- Убедитесь, что Xcode установлен и настроен
- Проверьте Command Line Tools: `xcode-select --install`
- Для физического устройства настройте provisioning profile

### Общие проблемы:
- Очистите node_modules и переустановите
- Проверьте версии Node.js (рекомендуется 16+)
- Убедитесь, что порты 4200, 8100 свободны

### Проблемы с Capacitor:
- **"could not determine executable to run"**: Используйте `cap` вместо `npx cap`
- **RxJS конфликты**: Очистите все node_modules и переустановите
- **Android Studio не открывается**: Проверьте установку Android SDK
- **iOS сборка падает**: Убедитесь, что Xcode установлен и настроен
