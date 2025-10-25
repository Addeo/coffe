# 📱 Работа с Android Studio

## 🎯 3 СПОСОБА РАБОТЫ С ANDROID ПРИЛОЖЕНИЕМ

---

## 🚀 СПОСОБ 1: Открыть проект в Android Studio (РЕКОМЕНДУЕМ!)

### Через командную строку:

```bash
cd /Users/sergejkosilov/WebstormProjects/new\ goal/coffe/frontend
npx cap open android
```

**Что произойдёт:**

- ✅ Откроется Android Studio
- ✅ Загрузится проект `frontend/android/`
- ✅ Gradle синхронизируется
- ✅ Можно запускать на эмуляторе/устройстве
- ✅ Можно редактировать Android код
- ✅ Можно отлаживать приложение

### Вручную:

1. **Откройте Android Studio**
2. **File → Open**
3. **Выберите папку:**
   ```
   /Users/sergejkosilov/WebstormProjects/new goal/coffe/frontend/android
   ```
4. **Нажмите "Open"**
5. **Дождитесь Gradle sync**

### После открытия:

**Запустить приложение:**

1. Нажмите ▶️ (Run) или `Shift + F10`
2. Выберите устройство (эмулятор или физическое)
3. Приложение запустится автоматически

**Собрать APK:**

1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. Дождитесь завершения
3. Нажмите "locate" для поиска APK

---

## 🔍 СПОСОБ 2: APK Analyzer (анализ готового APK)

Позволяет посмотреть содержимое APK, размеры, ресурсы:

### Шаги:

1. **Откройте Android Studio**
2. **Build → Analyze APK...**
3. **Выберите файл:**
   ```
   /Users/sergejkosilov/WebstormProjects/new goal/coffe/CoffeeAdmin-debug.apk
   ```
4. **Нажмите "OK"**

### Что можно посмотреть:

```
┌─────────────────────────────────────────────┐
│ APK Analyzer                                │
├─────────────────────────────────────────────┤
│ ✅ Размер APK: 4.8 MB                       │
│ ✅ Download size: ~4.5 MB                   │
│                                             │
│ Содержимое:                                 │
│ ├── classes.dex        2.1 MB              │
│ ├── resources.arsc     500 KB              │
│ ├── assets/public/     1.8 MB (web files)  │
│ ├── lib/               400 KB              │
│ └── META-INF/          100 KB              │
│                                             │
│ Информация:                                 │
│ • Package: com.coffee.admin                 │
│ • Version: 0.0.0                            │
│ • Min SDK: 21 (Android 5.0)                 │
│ • Target SDK: 33 (Android 13)               │
└─────────────────────────────────────────────┘
```

**Можно:**

- ✅ Просмотреть размер каждого файла
- ✅ Увидеть структуру APK
- ✅ Проверить AndroidManifest.xml
- ✅ Посмотреть ресурсы (иконки, layouts)
- ✅ Увидеть используемые библиотеки
- ✅ Проанализировать dex файлы

---

## 🧪 СПОСОБ 3: Установить и запустить на эмуляторе

### A. Через Android Studio (с проектом):

1. **Откройте проект** (Способ 1)
2. **Device Manager** → Создайте эмулятор (если нет)
3. **Запустите эмулятор**
4. **Run → Run 'app'** или нажмите ▶️
5. **Приложение установится и запустится**

### B. Через командную строку (с APK):

```bash
# 1. Запустите эмулятор
emulator -avd Pixel_5_API_33

# Или список доступных:
emulator -list-avds

# 2. Установите APK
adb install CoffeeAdmin-debug.apk

# 3. Запустите приложение
adb shell am start -n com.coffee.admin/.MainActivity
```

---

## 🛠️ РАСШИРЕННЫЕ ВОЗМОЖНОСТИ В ANDROID STUDIO

### 1. Live Reload (при изменениях)

```bash
# Terminal 1: Запустите ionic serve
cd frontend
ionic serve

# Terminal 2: Откройте Android Studio
npx cap open android

# В capacitor.config.json добавьте:
{
  "server": {
    "url": "http://localhost:8100",
    "cleartext": true
  }
}

# Пересоберите и запустите
```

**Теперь:** Изменения в коде автоматически обновляются в приложении!

---

### 2. Отладка через Chrome DevTools

**Шаги:**

1. Запустите приложение на устройстве/эмуляторе
2. В Chrome откройте: `chrome://inspect`
3. Найдите ваше приложение в списке
4. Нажмите "inspect"
5. **Откроется DevTools** с консолью, Network, и т.д.

**Можно:**

- Смотреть console.log
- Проверять Network requests
- Отлаживать JavaScript
- Инспектировать элементы

---

### 3. Logcat (Android логи)

**В Android Studio:**

1. Запустите приложение
2. Откройте вкладку **Logcat** (внизу)
3. Фильтр: `package:com.coffee.admin`

**Или через команду:**

```bash
adb logcat | grep "Coffee"
```

---

### 4. Profiler (анализ производительности)

**В Android Studio:**

1. Запустите приложение
2. **View → Tool Windows → Profiler**
3. Выберите процесс `com.coffee.admin`

**Можно отслеживать:**

- CPU usage
- Memory usage
- Network activity
- Energy consumption

---

## 📊 АНАЛИЗ APK

### Что можно проверить в APK Analyzer:

**1. Размеры компонентов:**

```
classes.dex:      ~2.1 MB (Java/Kotlin код)
resources.arsc:   ~500 KB (ресурсы)
assets/public/:   ~1.8 MB (web файлы - Angular)
lib/:             ~400 KB (нативные библиотеки)
res/:             ~200 KB (иконки, layouts)
```

**2. Методы и классы:**

- Количество классов
- Количество методов (DEX limit 64K)
- Использование MultiDex

**3. Ресурсы:**

- Все иконки и изображения
- Layouts XML файлы
- Strings и другие values

**4. Permissions:**

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

---

## 🔧 КОМАНДЫ ДЛЯ РАБОТЫ

### Открыть проект:

```bash
# Через Capacitor CLI
npx cap open android

# Или напрямую Android Studio
open -a "Android Studio" /Users/sergejkosilov/WebstormProjects/new\ goal/coffe/frontend/android
```

### Пересобрать APK в Android Studio:

```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### Запустить на устройстве:

```
Run → Run 'app' (или ▶️ кнопка)
```

### Очистить и пересобрать:

```
Build → Clean Project
Build → Rebuild Project
```

---

## 🐛 УСТРАНЕНИЕ ПРОБЛЕМ

### Проблема: Gradle sync failed

**Решение:**

```bash
cd frontend/android
./gradlew clean
./gradlew build
```

### Проблема: SDK not found

**Решение:**

1. File → Project Structure → SDK Location
2. Укажите путь к Android SDK:
   ```
   /Users/sergejkosilov/Library/Android/sdk
   ```
3. Нажмите "Apply"

### Проблема: Build configuration не найдена

**Решение:**

1. Build → Select Build Variant
2. Выберите "debug" или "release"
3. Пересоберите проект

### Проблема: Эмулятор не запускается

**Решение:**

1. Tools → Device Manager
2. Создайте новый эмулятор:
   - Pixel 5 или 6
   - API 33 (Android 13)
   - x86_64 архитектура
3. Запустите эмулятор

---

## 📱 ТЕСТИРОВАНИЕ НА УСТРОЙСТВАХ

### Подключение физического устройства:

1. **Включите режим разработчика на Android:**
   - Настройки → О телефоне
   - Нажмите 7 раз на "Номер сборки"
2. **Включите отладку по USB:**
   - Настройки → Параметры разработчика
   - Включите "Отладка по USB"

3. **Подключите USB кабель**

4. **Проверьте подключение:**

   ```bash
   adb devices
   ```

   Должно показать ваше устройство

5. **В Android Studio:**
   - Выберите устройство в списке
   - Нажмите ▶️ Run

---

## 🎨 РЕДАКТИРОВАНИЕ РЕСУРСОВ

### Изменить иконку приложения:

**Путь к иконкам:**

```
frontend/android/app/src/main/res/mipmap-*/ic_launcher.png
```

**Автоматическая генерация:**

```bash
# 1. Поместите иконку 1024x1024 в frontend/resources/icon.png
# 2. Установите инструмент
npm install -g @capacitor/assets

# 3. Сгенерируйте все размеры
npx capacitor-assets generate --iconBackgroundColor='#ffffff' --iconBackgroundColorDark='#000000'
```

### Изменить Splash Screen:

**Путь:**

```
frontend/android/app/src/main/res/drawable-*/splash.png
```

**Генерация:**

```bash
# Поместите splash.png (2732x2732) в frontend/resources/
npx capacitor-assets generate
```

---

## 🔍 ПОЛЕЗНЫЕ ОКНА В ANDROID STUDIO

### 1. **Project** (слева)

- Структура проекта
- Файлы и папки
- Gradle scripts

### 2. **Logcat** (внизу)

- Логи приложения
- Ошибки и warnings
- System messages

### 3. **Build** (внизу)

- Вывод Gradle
- Ошибки компиляции
- Build summary

### 4. **Device Manager** (справа)

- Управление эмуляторами
- Создание новых устройств
- Запуск/остановка

### 5. **Profiler** (внизу)

- CPU monitoring
- Memory usage
- Network activity

---

## 📊 APK ANALYZER - ЧТО МОЖНО УЗНАТЬ

### Общая информация:

```
✅ Package name: com.coffee.admin
✅ Version: 0.0.0
✅ Min SDK: 21 (Android 5.0)
✅ Target SDK: 33 (Android 13)
✅ APK size: 4.8 MB
✅ Download size: ~4.5 MB (сжатый)
```

### Размер по компонентам:

```
classes.dex:         2.1 MB (44%)
assets/:             1.8 MB (38%)  ← Angular приложение здесь
resources.arsc:      500 KB (10%)
lib/:                400 KB (8%)
```

### Методы и классы:

```
Total methods:       ~15,000
Total classes:       ~2,500
Multidex:            Enabled (если нужно)
```

### Permissions:

```
INTERNET:                     ✅ Для API
WRITE_EXTERNAL_STORAGE:       ✅ Для экспорта файлов
READ_EXTERNAL_STORAGE:        ✅ Для чтения
ACCESS_NETWORK_STATE:         ✅ Для проверки сети
```

---

## 🧪 ЗАПУСК И ОТЛАДКА

### Запуск на эмуляторе:

**В Android Studio:**

```
1. Tools → Device Manager
2. Выберите эмулятор (или создайте новый)
3. Нажмите ▶️ (Play) на эмуляторе
4. Подождите загрузки Android
5. Run → Run 'app' (или ▶️ в тулбаре)
6. Приложение установится и запустится
```

**Через командную строку:**

```bash
# 1. Список эмуляторов
emulator -list-avds

# 2. Запустите эмулятор
emulator -avd Pixel_5_API_33

# 3. Установите APK
adb install CoffeeAdmin-debug.apk

# 4. Запустите
adb shell am start -n com.coffee.admin/.MainActivity
```

---

### Отладка JavaScript/TypeScript:

**Способ A: Chrome DevTools**

```
1. Запустите приложение на устройстве
2. В Chrome: chrome://inspect
3. Найдите "Coffee Admin"
4. Нажмите "inspect"
5. Откроются DevTools
```

**Способ B: Safari Web Inspector (для iOS)**

```
1. Подключите iOS устройство
2. Safari → Develop → [Your Device]
3. Выберите Coffee Admin
```

---

## 🔧 GRADLE КОМАНДЫ

### В Terminal Android Studio:

**Очистить проект:**

```bash
./gradlew clean
```

**Собрать debug APK:**

```bash
./gradlew assembleDebug
```

**Собрать release APK:**

```bash
./gradlew assembleRelease
```

**Установить на подключённое устройство:**

```bash
./gradlew installDebug
```

**Запустить тесты:**

```bash
./gradlew test
```

**Информация о проекте:**

```bash
./gradlew projects
```

---

## 📝 СТРУКТУРА ANDROID ПРОЕКТА

```
android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── AndroidManifest.xml      ← Манифест приложения
│   │       ├── assets/
│   │       │   └── public/              ← Angular приложение здесь!
│   │       ├── java/
│   │       │   └── com/coffee/admin/
│   │       │       └── MainActivity.java ← Главная Activity
│   │       └── res/
│   │           ├── mipmap-*/            ← Иконки приложения
│   │           ├── drawable-*/          ← Splash screens
│   │           └── values/              ← Strings, colors, styles
│   └── build.gradle                     ← Конфигурация приложения
├── gradle/                              ← Gradle wrapper
├── build.gradle                         ← Root build config
└── settings.gradle                      ← Настройки проекта
```

---

## 🎨 РЕДАКТИРОВАНИЕ В ANDROID STUDIO

### Что можно редактировать:

**1. MainActivity.java**

```java
package com.coffee.admin;

public class MainActivity extends BridgeActivity {
    // Можно добавить:
    // - Инициализацию плагинов
    // - Обработку deep links
    // - Native функции
}
```

**2. AndroidManifest.xml**

```xml
<manifest>
    <application
        android:label="Coffee Admin"     ← Название приложения
        android:icon="@mipmap/ic_launcher" ← Иконка
        android:theme="@style/AppTheme">  ← Тема
    </application>
</manifest>
```

**3. build.gradle (app)**

```gradle
android {
    namespace 'com.coffee.admin'
    compileSdk 33                        ← Версия SDK для компиляции

    defaultConfig {
        applicationId "com.coffee.admin"
        minSdk 21                        ← Минимальная версия Android
        targetSdk 33                     ← Целевая версия
        versionCode 1                    ← Код версии (увеличивать при обновлении)
        versionName "1.0.0"              ← Имя версии
    }
}
```

**4. Ресурсы (res/)**

- strings.xml - текстовые строки
- colors.xml - цвета темы
- styles.xml - стили приложения

---

## 🚀 БЫСТРЫЕ ДЕЙСТВИЯ

### Открыть проект:

```bash
npx cap open android
```

### Пересобрать после изменений в web:

```bash
# 1. Обновите Angular
npm run build

# 2. Синхронизируйте
npx cap sync android

# 3. В Android Studio нажмите
Build → Rebuild Project
```

### Создать подписанный APK:

```
Build → Generate Signed Bundle / APK → APK
→ Выберите keystore
→ Введите пароли
→ Build
```

---

## 📱 СОЗДАНИЕ ЭМУЛЯТОРА

**В Android Studio:**

```
1. Tools → Device Manager
2. Нажмите "+" (Create device)
3. Выберите:
   - Hardware: Pixel 5 или 6
   - System Image: API 33 (Android 13)
   - Architecture: x86_64
4. Настройте:
   - RAM: 2048 MB
   - Internal Storage: 2048 MB
5. Finish
```

**Рекомендуемые эмуляторы:**

- Pixel 5 (API 33) - современный
- Pixel 3a (API 29) - средний
- Nexus 5X (API 21) - минимальный

---

## 🎯 ЧТО ПРОВЕРИТЬ

### В APK Analyzer:

- [ ] Размер APK приемлемый (<10 MB)
- [ ] Нет дублирующихся библиотек
- [ ] Assets/public содержит Angular файлы
- [ ] Иконки всех размеров присутствуют
- [ ] AndroidManifest.xml корректный
- [ ] Permissions минимальные

### При запуске на эмуляторе:

- [ ] Приложение запускается
- [ ] Splash screen отображается
- [ ] Логин работает
- [ ] Навигация работает
- [ ] Все страницы загружаются
- [ ] Графики отображаются
- [ ] Экспорт Excel работает (если ADMIN)

---

## 💡 СОВЕТЫ

### 1. Используйте горячие клавиши:

| Действие    | macOS           | Windows/Linux    |
| ----------- | --------------- | ---------------- |
| Запустить   | Ctrl + R        | Shift + F10      |
| Отладка     | Ctrl + D        | Shift + F9       |
| Build       | Cmd + F9        | Ctrl + F9        |
| Sync Gradle | Cmd + Shift + O | Ctrl + Shift + O |

### 2. Включите Auto Import:

Preferences → Editor → General → Auto Import → Enable auto import

### 3. Используйте Android Studio Profiler:

Для оптимизации производительности приложения

### 4. Логирование в коде:

```java
// В MainActivity.java
import android.util.Log;

Log.d("CoffeeAdmin", "Application started");
```

---

## 📊 РАЗМЕР APK - ЧТО ВЛИЯЕТ

```
Angular bundle:      ~1.3 MB
Capacitor runtime:   ~200 KB
WebView system:      ~2 MB (встроен в Android)
Native libs:         ~400 KB
Resources:           ~700 KB
──────────────────────────────
Итого:               ~4.8 MB
```

### Как уменьшить:

**1. В build.gradle:**

```gradle
buildTypes {
    release {
        minifyEnabled true        ← ProGuard
        shrinkResources true      ← Удаление неиспользуемых ресурсов
    }
}
```

**Результат:** ~3.5 MB

**2. Разделение по архитектуре:**

```gradle
splits {
    abi {
        enable true
        reset()
        include 'armeabi-v7a', 'arm64-v8a'
    }
}
```

**Результат:** 2-3 APK по ~2 MB каждый

---

## ✅ ГОТОВО!

```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║     📱 ANDROID STUDIO ГОТОВ К РАБОТЕ! 📱             ║
║                                                        ║
║  Способ 1: Открыть проект      ✅                     ║
║  Способ 2: APK Analyzer        ✅                     ║
║  Способ 3: Эмулятор            ✅                     ║
║                                                        ║
║  Команда: npx cap open android                        ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

**Выберите способ и начинайте!** 🚀

---

**Дата:** 17 октября 2025  
**Версия:** 1.0
