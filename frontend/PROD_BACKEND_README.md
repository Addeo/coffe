# Запуск Frontend с Production Backend

Эта конфигурация позволяет запускать frontend в режиме разработки, но подключаться к продакшен бекенду.

## Быстрый старт

Из корня проекта:
```bash
npm run dev:frontend:prod
```

Или из папки `frontend`:
```bash
npm run dev:prod-backend
```

Frontend будет доступен по адресу: `http://localhost:4202`

## Настройка Production Backend URL

По умолчанию используется URL: `https://servicecheck.tech`

Чтобы изменить URL продакшен бекенда, отредактируйте файл `proxy.conf.prod.json`:

```json
{
  "/api/*": {
    "target": "https://your-production-api.com",
    "secure": true,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

**Важно:** Укажите только домен без `/api` в поле `target`, так как путь `/api` добавляется автоматически.

## Как это работает

1. Frontend запускается в режиме разработки (с hot-reload)
2. Все запросы к `/api/*` проксируются на продакшен бекенд через `proxy.conf.prod.json`
3. Используется environment файл `environment.prod-backend.ts` с настройками для разработки

## Файлы конфигурации

- `proxy.conf.prod.json` - конфигурация прокси для продакшен бекенда
- `src/environments/environment.prod-backend.ts` - environment файл для разработки с продакшен бекендом
- `angular.json` - конфигурация Angular с настройкой `prod-backend`

## Отличия от обычного dev режима

- Используется продакшен бекенд вместо локального
- Все API запросы идут на продакшен сервер
- Frontend работает в режиме разработки (с source maps и hot-reload)

## Проверка работы прокси

После запуска команды проверьте в консоли браузера (DevTools → Network), что запросы идут на продакшен сервер:

1. Откройте DevTools (F12)
2. Перейдите на вкладку Network
3. Выполните вход в приложение
4. Проверьте, что запрос к `/api/auth/login` идет на `https://servicecheck.tech/api/auth/login`, а не на `http://localhost:4202/api/auth/login`

Если запросы все еще идут на localhost, убедитесь, что:
- Используется правильная команда: `npm run dev:prod-backend`
- В консоли Angular CLI видно сообщение о применении прокси
- Файл `proxy.conf.prod.json` содержит правильный `target`

