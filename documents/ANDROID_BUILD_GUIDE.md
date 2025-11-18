# Android Build Guide - Coffee Admin Mobile App

Полное руководство по сборке Android APK для Coffee Admin приложения.

## 📋 Содержание

- [Требования](#требования)
- [Предустановленные компоненты](#предустановленные-компоненты)
- [Установка окружения](#установка-окружения)
- [Сборка APK](#сборка-apk)
- [Установка на устройство](#установка-на-устройство)
- [Команды для работы](#команды-для-работы)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Требования

### Обязательные компоненты:

1. **Android Studio** (последняя версия)
2. **Android SDK** (API 22+, рекомендуется API 35+)
3. **JDK 21** (критично - проект требует именно версию 21)
4. **Node.js** 16+ (рекомендуется 18+)
5. **npm** или **yarn**

### Для macOS дополнительно:

- **Homebrew** (для установки JDK)
- **Xcode Command Line Tools** (опционально)

---

## ✅ Предустановленные компоненты

Проект уже содержит:

- ✅ **Capacitor 5.0** - настроен и готов к работе
- ✅ **Ionic 7.0** - интегрирован с Angular
- ✅ **Android проект** - находится в `frontend/android/`
- ✅ **iOS проект** - находится в `frontend/ios/`
- ✅ **Gradle Wrapper** - встроен в проект (`frontend/android/gradlew`)
- ✅ **npm скрипты** - все команды сборки настроены

Конфигурация приложения:

```json
{
  "appId": "com.coffee.admin",
  "appName": "Coffee Admin",
  "webDir": "dist/coffee-admin"
}
```

---

## 🔧 Установка окружения

### Шаг 1: Установка Android Studio

1. Скачайте [Android Studio](https://developer.android.com/studio)
2. Установите и запустите первоначальную настройку
3. Убедитесь, что установлены:
   - Android SDK
   - Android SDK Platform (API 35+)
   - Android SDK Build-Tools
   - Android Emulator (опционально)

### Шаг 2: Установка JDK 21

**⚠️ ВАЖНО:** Проект требует именно **JDK 21**, а не 17 или 11!

#### macOS (через Homebrew):

```bash
# Установка JDK 21
brew install openjdk@21

# Опциональная системная ссылка (требует sudo)
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

#### Windows:

Скачайте [OpenJDK 21](https://adoptium.net/) и установите через инсталлятор.

#### Linux:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# Fedora/RHEL
sudo dnf install java-21-openjdk-devel
```

### Шаг 3: Настройка переменных окружения

#### macOS/Linux (добавить в `~/.zshrc` или `~/.bashrc`):

```bash
# ====== Android Development Environment ======
# Java (OpenJDK 21)
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"

# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/build-tools/36.1.0
# ============================================
```

Применить изменения:

```bash
source ~/.zshrc  # или source ~/.bashrc
```

#### Windows (через System Properties):

1. Откройте **System Properties** → **Environment Variables**
2. Добавьте:
   - `JAVA_HOME`: `C:\Program Files\OpenJDK\jdk-21`
   - `ANDROID_HOME`: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
3. Добавьте в `PATH`:
   - `%JAVA_HOME%\bin`
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

### Шаг 4: Проверка установки

```bash
# Проверка Java
java -version
# Ожидаемый вывод: openjdk version "21.0.x"

# Проверка JAVA_HOME
echo $JAVA_HOME
# Ожидаемый вывод: /opt/homebrew/opt/openjdk@21 (macOS)

# Проверка ANDROID_HOME
echo $ANDROID_HOME
# Ожидаемый вывод: /Users/username/Library/Android/sdk (macOS)

# Проверка ADB
which adb
# Ожидаемый вывод: путь к adb в Android SDK

# Проверка Gradle
cd frontend/android
./gradlew --version
# Ожидаемый вывод: Gradle 8.11.1 + JVM 21.0.x
```

### Шаг 5: Установка зависимостей проекта

```bash
# Из корня проекта
cd frontend
npm install
```

---

## 🚀 Сборка APK

### Способ 1: Через npm скрипты (рекомендуется)

#### Полная сборка (Angular + Android):

```bash
cd frontend
npm run build:android
```

Эта команда:

1. Собирает Angular приложение для production
2. Копирует веб-ресурсы в Android проект
3. Синхронизирует Capacitor плагины

#### Сборка только APK:

Если веб-приложение уже собрано:

```bash
cd frontend/android
./gradlew assembleDebug
```

### Способ 2: Через Android Studio

```bash
# Открыть проект в Android Studio
cd frontend
npm run open:android
```

В Android Studio:

1. **Build** → **Build Bundle(s)/APK(s)** → **Build APK(s)**
2. Дождитесь завершения сборки
3. APK будет в: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

### Сборка Release версии (для публикации)

```bash
cd frontend/android
./gradlew assembleRelease
```

**⚠️ Примечание:** Release версия требует настройки подписи (signing config).

---

## 📦 Результаты сборки

После успешной сборки:

| Тип сборки  | Путь к файлу                                                              | Размер (примерно) |
| ----------- | ------------------------------------------------------------------------- | ----------------- |
| Debug APK   | `frontend/android/app/build/outputs/apk/debug/app-debug.apk`              | ~4-5 MB           |
| Release APK | `frontend/android/app/build/outputs/apk/release/app-release-unsigned.apk` | ~3-4 MB           |

---

## 📱 Установка на устройство

### Вариант 1: Через ADB (USB подключение)

```bash
# Подключите Android устройство по USB
# Включите "Отладка по USB" в настройках разработчика

# Установка APK
adb install frontend/android/app/build/outputs/apk/debug/app-debug.apk

# Переустановка (если приложение уже установлено)
adb install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk

# Удаление приложения
adb uninstall com.coffee.admin
```

### Вариант 2: Ручная установка

1. Скопируйте `app-debug.apk` на Android устройство:
   - Через email/мессенджер
   - Через облачное хранилище
   - Через USB (просто скопировать файл)

2. На Android устройстве:
   - Откройте **Настройки** → **Безопасность**
   - Включите **Установка из неизвестных источников**
   - Откройте файл APK через файловый менеджер
   - Нажмите **Установить**

### Вариант 3: Через Android Studio

1. Откройте проект в Android Studio: `npm run open:android`
2. Подключите устройство или запустите эмулятор
3. Нажмите **Run** (зелёная кнопка) или **Shift+F10**

---

## 🛠 Команды для работы

### Основные команды (из директории `frontend/`):

```bash
# Установка зависимостей
npm install

# Сборка веб-приложения
npm run build

# Сборка для Android (веб + sync)
npm run build:android

# Сборка для iOS (веб + sync)
npm run build:ios

# Сборка для обеих платформ
npm run mobile:build

# Синхронизация Capacitor
npm run capacitor:sync

# Копирование веб-ресурсов (без обновления плагинов)
npm run capacitor:copy

# Открыть Android проект в Android Studio
npm run open:android

# Открыть iOS проект в Xcode (только macOS)
npm run open:ios
```

### Gradle команды (из директории `frontend/android/`):

```bash
# Проверка версии Gradle
./gradlew --version

# Сборка debug APK
./gradlew assembleDebug

# Сборка release APK
./gradlew assembleRelease

# Очистка сборки
./gradlew clean

# Полная пересборка
./gradlew clean assembleDebug

# Список всех задач
./gradlew tasks

# Проверка зависимостей
./gradlew dependencies
```

### Capacitor команды:

```bash
# Проверка состояния Capacitor
npx cap doctor

# Обновление Capacitor
npx cap update

# Добавление платформы (если удалили)
npx cap add android
npx cap add ios

# Синхронизация
npx cap sync

# Копирование веб-ресурсов
npx cap copy

# Открытие в IDE
npx cap open android
npx cap open ios
```

---

## 🐛 Troubleshooting

### Проблема: `error: invalid source release: 21`

**Причина:** Неправильная версия Java.

**Решение:**

```bash
# Проверьте версию Java
java -version

# Должно быть: openjdk version "21.0.x"
# Если нет - переустановите JDK 21 и проверьте JAVA_HOME
echo $JAVA_HOME
```

### Проблема: `ANDROID_HOME is not set`

**Причина:** Переменная окружения не настроена.

**Решение:**

```bash
# Добавьте в ~/.zshrc или ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export ANDROID_HOME=$HOME/Android/Sdk           # Linux
# Для Windows используйте System Properties

source ~/.zshrc
```

### Проблема: `SDK location not found`

**Причина:** Android SDK не установлен или путь неверный.

**Решение:**

1. Установите Android Studio
2. Откройте Android Studio → **SDK Manager**
3. Убедитесь, что SDK установлен
4. Проверьте путь в `local.properties` (создастся автоматически)

### Проблема: `npm run build:android` не работает

**Решение:**

```bash
# Очистите кэш и переустановите зависимости
cd frontend
rm -rf node_modules package-lock.json
npm install

# Проверьте, что shared зависимость установлена
ls -la ../shared
```

### Проблема: `Gradle Daemon failed to start`

**Причина:** Недостаточно памяти или конфликт версий.

**Решение:**

```bash
# Остановите все Gradle процессы
cd frontend/android
./gradlew --stop

# Очистите кэш Gradle
rm -rf ~/.gradle/caches/
rm -rf ~/.gradle/daemon/

# Попробуйте снова
./gradlew clean assembleDebug
```

### Проблема: `could not determine executable to run` (Capacitor)

**Причина:** Capacitor CLI не установлен.

**Решение:**

```bash
cd frontend
npm install @capacitor/cli --save-dev

# Или используйте cap вместо npx cap
```

### Проблема: Build warnings о превышении бюджета

**Пример:**

```
Warning: bundle initial exceeded maximum budget. Budget 500.00 kB was not met by 693.35 kB
```

**Решение:**
Это предупреждения, не ошибки. Для оптимизации:

1. Включите tree-shaking
2. Используйте lazy loading для модулей
3. Оптимизируйте изображения
4. Или просто измените бюджет в `angular.json`

### Проблема: APK не устанавливается на устройство

**Возможные причины:**

1. Не включена "Установка из неизвестных источников"
2. Устройство не поддерживает minSdkVersion (23+)
3. Конфликт с существующей версией

**Решение:**

```bash
# Удалите старую версию
adb uninstall com.coffee.admin

# Установите заново
adb install -r app-debug.apk
```

### Проблема: `RxJS` ошибки

**Решение:**

```bash
# Очистите все node_modules
cd frontend
rm -rf node_modules
cd ../backend
rm -rf node_modules
cd ../shared
rm -rf node_modules

# Переустановите из корня
cd ..
npm install
```

---

## 📊 Технические детали проекта

### Структура Android проекта:

```
frontend/
├── android/                     # Нативный Android проект
│   ├── app/
│   │   ├── build.gradle         # Конфигурация приложения
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── assets/      # Веб-ресурсы (копируются при sync)
│   │   │       ├── java/        # Java/Kotlin код
│   │   │       ├── res/         # Android ресурсы
│   │   │       └── AndroidManifest.xml
│   │   └── build/
│   │       └── outputs/
│   │           └── apk/         # Готовые APK файлы
│   ├── build.gradle             # Конфигурация проекта
│   ├── variables.gradle         # Версии SDK и библиотек
│   ├── gradlew                  # Gradle wrapper (Unix)
│   └── gradlew.bat              # Gradle wrapper (Windows)
├── capacitor.config.json        # Конфигурация Capacitor
├── ionic.config.json            # Конфигурация Ionic
└── package.json                 # npm скрипты
```

### Версии компонентов:

```json
{
  "capacitor": "^5.0.0",
  "ionic/angular": "^7.0.0",
  "angular": "^17.0.0",
  "compileSdkVersion": 35,
  "targetSdkVersion": 35,
  "minSdkVersion": 23,
  "gradle": "8.11.1",
  "jdk": "21.0.8"
}
```

### Конфигурация в `variables.gradle`:

```groovy
ext {
    minSdkVersion = 23        // Android 6.0+
    compileSdkVersion = 35    // Android 15
    targetSdkVersion = 35     // Android 15
}
```

### Capacitor плагины:

- `@capacitor/android` - Android платформа
- `@capacitor/core` - Core Capacitor API
- `@capacitor/ios` - iOS платформа (для будущих iOS сборок)

---

## 🔐 Настройка подписи для Release (опционально)

Для публикации в Google Play нужен подписанный APK:

### 1. Создайте keystore:

```bash
cd frontend/android/app

keytool -genkey -v -keystore coffee-admin-release.keystore \
  -alias coffee-admin \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### 2. Создайте `keystore.properties`:

```bash
cd frontend/android
touch keystore.properties
```

Содержимое `keystore.properties`:

```properties
storeFile=app/coffee-admin-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=coffee-admin
keyPassword=YOUR_KEY_PASSWORD
```

### 3. Обновите `app/build.gradle`:

```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4. Соберите подписанный release APK:

```bash
cd frontend/android
./gradlew assembleRelease
```

APK будет в: `app/build/outputs/apk/release/app-release.apk`

**⚠️ ВАЖНО:**

- Храните `keystore.properties` и `.keystore` файл в безопасности
- Добавьте их в `.gitignore`
- Никогда не коммитьте пароли в git

---

## 📚 Полезные ссылки

- [Android Developer Documentation](https://developer.android.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Ionic Framework Documentation](https://ionicframework.com/docs)
- [Angular Documentation](https://angular.io/docs)
- [Gradle Build Tool](https://gradle.org/guides/)

---

## 📝 Чеклист перед сборкой

- [ ] Android Studio установлен
- [ ] JDK 21 установлен и `java -version` показывает 21.0.x
- [ ] `JAVA_HOME` указывает на JDK 21
- [ ] `ANDROID_HOME` настроен
- [ ] `adb` доступен в PATH
- [ ] `npm install` выполнен в `frontend/`
- [ ] Порты 4200, 8100 свободны (для dev сервера)
- [ ] Достаточно места на диске (~2GB для сборки)

---

## 🎯 Быстрый старт

Если всё уже установлено:

```bash
# 1. Перейти в директорию проекта
cd /path/to/coffe/frontend

# 2. Установить зависимости (если не установлены)
npm install

# 3. Собрать Android APK
npm run build:android

# 4. Собрать APK файл
cd android
./gradlew assembleDebug

# 5. APK готов!
# Путь: android/app/build/outputs/apk/debug/app-debug.apk
```

---

**Дата создания:** 13 октября 2025  
**Версия:** 1.0.0  
**Автор:** Coffee Admin Team
