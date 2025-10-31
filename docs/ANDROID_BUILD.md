# 📱 Сборка Android приложения

## 🚀 Быстрый старт

### 1. Соберите frontend

```bash
cd frontend
npm run build
```

### 2. Синхронизируйте с Android проектом

```bash
npx cap sync android
```

### 3. Откройте в Android Studio

```bash
npx cap open android
```

### 4. Соберите APK

В Android Studio:

- Выберите **Build > Build Bundle(s) / APK(s) > Build APK(s)**
- Или через командную строку:

```bash
cd android
./gradlew assembleDebug
```

APK файл будет в: `android/app/build/outputs/apk/debug/app-debug.apk`

## 🔄 Автообновление

Система автообновления:

- ✅ Проверяет версию при старте приложения
- ✅ Показывает диалог при наличии новой версии
- ✅ Скачивает и устанавливает обновление

Подробнее см. [ANDROID_AUTO_UPDATE.md](./ANDROID_AUTO_UPDATE.md)

## 📋 Требования

- **Android Studio** - для сборки и отладки
- **Java JDK** - версия 11 или выше
- **Android SDK** - настроенный в Android Studio

## 🎯 Следующие шаги

1. Настройте **`downloadUrl`** в backend для обновлений
2. Загрузите APK файлы на ваш сервер
3. Протестируйте автообновление
4. Опубликуйте в Google Play Store (опционально)
