# 🚀 Быстрое развертывание демо с ngrok

## Шаг 1: Запуск бекенда локально

```bash
# В одном терминале - запуск бекенда
cd backend
npm install
npm run start:dev
```

Бекенд будет доступен на `http://localhost:3002`

## Шаг 2: Запуск ngrok

```bash
# Установите ngrok если не установлен
# https://ngrok.com/download

# Запустите ngrok для порта 3002
ngrok http 3002
```

ngrok покажет вам временный URL типа: `https://abc123.ngrok.io`

## Шаг 3: Обновление URL в проекте

```bash
# Используйте скрипт для автоматического обновления
./update-ngrok-url.sh https://abc123.ngrok.io
```

## Шаг 4: Сборка и деплой фронтенда

### Вариант A: Автоматический деплой на GitHub Pages

```bash
# Зафиксируйте изменения
git add .
git commit -m "Update ngrok URL for demo"
git push origin main

# GitHub Actions автоматически соберет и задеплоит
```

### Вариант B: Локальная сборка для тестирования

```bash
# Сборка фронтенда
cd frontend
npm run build -- --configuration production --base-href /coffee-admin/

# Запуск локального сервера для тестирования
npx http-server dist/coffee-admin -p 8080
```

## Шаг 5: Проверка демо

После деплоя демо будет доступно по адресу:
- **Frontend**: `https://[ваш-username].github.io/coffee-admin/`
- **Backend**: `https://abc123.ngrok.io` (через ngrok)

## Тестовые аккаунты

- **Admin**: admin@coffee.com / password
- **Manager**: manager@coffee.com / password
- **Engineer**: engineer@coffee.com / password

## Важные моменты

### 🔄 Динамический URL ngrok
- ngrok URL меняется при каждом запуске
- При изменении URL нужно повторно запустить `./update-ngrok-url.sh`
- После обновления нужно закоммитить и запушить изменения

### 🔒 CORS для демо
Если возникают CORS ошибки, убедитесь что:
1. ngrok запущен на правильном порту (3002)
2. В environment файлах указан правильный ngrok URL
3. Бекенд запущен и отвечает на `/health` endpoint

### 🧪 Тестирование
```bash
# Тест API доступности
curl https://your-ngrok-url.ngrok.io/api/health

# Тест аутентификации
curl -X POST https://your-ngrok-url.ngrok.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coffee.com","password":"password"}'
```

## Быстрый старт для демонстрации

```bash
# 1. Запуск бекенда
cd backend && npm run start:dev

# 2. Запуск ngrok (в новом терминале)
ngrok http 3002

# 3. Обновление URL (скопируйте URL из ngrok)
./update-ngrok-url.sh https://your-ngrok-url.ngrok.io

# 4. Коммит и пуш
git add . && git commit -m "Update demo URL" && git push

# 5. Демо готово!
echo "Frontend: https://[username].github.io/coffee-admin/"
echo "Backend: https://your-ngrok-url.ngrok.io"
```

## Troubleshooting

### Проблема: Frontend не может подключиться к backend
**Решение**: Проверьте что ngrok URL правильно обновлен в обоих environment файлах

### Проблема: CORS ошибки
**Решение**: Убедитесь что бекенд запущен и ngrok правильно проксирует запросы

### Проблема: Авторизация не работает
**Решение**: Проверьте что в authUrl указан правильный ngrok URL

## 💡 Альтернативы ngrok

Если ngrok не подходит, рассмотрите:
- **LocalTunnel**: `npx localtunnel --port 3002`
- **Serveo**: `ssh -R 80:localhost:3002 serveo.net`
- **Cloudflare Tunnel**: Для production-ready решения

---

🎉 **Демо готово к демонстрации!**
