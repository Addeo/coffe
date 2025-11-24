# 🔧 Исправление проблемы с APK файлом (404)

## ❌ Проблема

```
GET http://192.144.12.102:3001/app-debug.apk
Response: 404 - Cannot GET /app-debug.apk
```

## ✅ Решение

Исправлены две проблемы:

### 1. Порядок middleware в `main.ts`

**Проблема:** `setGlobalPrefix('api')` применялся ДО статических файлов, поэтому `/app-debug.apk` обрабатывался как `/api/app-debug.apk`

**Исправление:** Перемещен порядок - статические файлы ДО `setGlobalPrefix`

### 2. Docker volume mount

**Проблема:** APK файл не был доступен внутри контейнера

**Исправление:** Добавлен volume mount в `docker-compose.fallback.yml`

## 📋 Что нужно сделать

### Шаг 1: Загрузить APK на сервер

```bash
./setup-apk-serving.sh
```

Или вручную:

```bash
scp ./apk-builds/app-debug-1.0.2.apk user1@192.144.12.102:~/coffe/app-debug.apk
```

### Шаг 2: Перезапустить backend

```bash
ssh user1@192.144.12.102
cd ~/coffe
docker compose -f docker-compose.fallback.yml restart backend
```

Или пересобрать (если нужны изменения в коде):

```bash
docker compose -f docker-compose.fallback.yml up -d --build backend
```

### Шаг 3: Проверить

```bash
# Проверить доступность
curl -I http://192.144.12.102:3001/app-debug.apk

# Должен вернуть HTTP 200
```

## 🔍 Проверка логов

```bash
# Проверить путь APK в логах
ssh user1@192.144.12.102 "docker logs coffee_backend_fallback | grep 'APK file path'"

# Должно показать:
# APK file path: /app/app-debug.apk
```

## 📝 Изменения в коде

### backend/src/main.ts

1. **Порядок middleware изменен:**
   - Статические файлы ДО `setGlobalPrefix('api')`
   - Теперь `/app-debug.apk` доступен напрямую (не через `/api/`)

2. **Добавлена переменная окружения:**

   ```typescript
   const apkPath = process.env.APK_PATH || join(__dirname, '../../app-debug.apk');
   ```

3. **Добавлены правильные заголовки:**
   ```typescript
   res.setHeader('Content-Type', 'application/vnd.android.package-archive');
   res.setHeader('Content-Disposition', 'attachment; filename="app-debug.apk"');
   ```

### docker-compose.fallback.yml

1. **Добавлен volume mount:**

   ```yaml
   volumes:
     - ./app-debug.apk:/app/app-debug.apk:ro
   ```

2. **Добавлена переменная окружения:**
   ```yaml
   environment:
     APK_PATH: /app/app-debug.apk
   ```

## ✅ После исправления

1. ✅ APK файл загружен на сервер в `~/coffe/app-debug.apk`
2. ✅ Backend настроен для раздачи статических файлов ДО префикса `api`
3. ✅ Docker volume монтирует APK в контейнер
4. ✅ URL `http://192.144.12.102:3001/app-debug.apk` доступен
5. ✅ Приложение версии 1.0.1 сможет скачать APK для обновления

## 🧪 Тестирование

```bash
# 1. Загрузить APK
./setup-apk-serving.sh

# 2. Перезапустить backend
# (через SSH на сервере)
docker compose -f docker-compose.fallback.yml restart backend

# 3. Проверить
curl -I http://192.144.12.102:3001/app-debug.apk
# Должен вернуть: HTTP/1.1 200 OK

# 4. Проверить версию API
curl http://192.144.12.102:3001/api/app/version
# Должен вернуть: {"version":"1.0.2","downloadUrl":"..."}
```

---

Готово! После этих изменений APK будет доступен по URL. 🚀
