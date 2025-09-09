# Frontend Deployment to GitHub Pages

## Настройка GitHub Pages для Angular Frontend

### Предварительные требования

1. **GitHub Repository**: Убедитесь, что ваш проект находится в GitHub репозитории
2. **GitHub Pages**: Включите GitHub Pages в настройках репозитория
3. **Node.js**: Версия 18 или выше

### Автоматическое развертывание (Рекомендуется)

#### 1. Включение GitHub Pages

1. Перейдите в ваш репозиторий на GitHub
2. Откройте **Settings** → **Pages**
3. В разделе **Source** выберите **GitHub Actions**
4. Сохраните настройки

#### 2. Настройка репозитория

Workflow файл `.github/workflows/deploy-frontend.yml` уже создан и настроен для:
- Автоматического развертывания при пуше в `main` ветку
- Только при изменениях в папке `frontend/`
- Использования Node.js 18
- Сборки production версии

#### 3. Первый запуск

1. Сделайте коммит и пуш изменений в `main` ветку:
```bash
git add .
git commit -m "Add GitHub Pages deployment"
git push origin main
```

2. Перейдите в **Actions** на GitHub и убедитесь, что workflow запустился

3. После завершения workflow перейдите в **Settings** → **Pages** чтобы увидеть URL вашего сайта

### Локальное развертывание (Альтернативный метод)

Если вы предпочитаете развертывать локально:

1. Установите `gh-pages` пакет:
```bash
cd frontend
npm install
```

2. Разверните приложение:
```bash
npm run deploy
```

3. Пакет автоматически:
   - Соберет production версию
   - Создаст новую ветку `gh-pages` (если не существует)
   - Опубликует содержимое папки `dist/coffee-admin`

### Важные настройки

#### Base Href
В `angular.json` уже настроен `baseHref: "/coffe/"` для production сборки. Это означает, что ваше приложение будет доступно по адресу:
```
https://YOUR_USERNAME.github.io/coffe/
```

#### API URL для Production
В `src/environments/environment.prod.ts` настройте ваш production API URL:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com/api',
  authUrl: 'https://your-production-api.com/api/auth/login',
  appName: 'Coffee Admin Panel',
  demo: false,
};
```

### CORS и API

При развертывании на GitHub Pages могут возникнуть проблемы с CORS при обращении к API:

1. **Вариант 1**: Настройте CORS headers на вашем backend сервере
2. **Вариант 2**: Используйте proxy в `angular.json`
3. **Вариант 3**: Разверните frontend и backend на одном домене

#### Настройка Proxy (Вариант 2)

Добавьте в `angular.json` в секцию `serve`:

```json
"serve": {
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

Создайте файл `proxy.conf.json` в корне frontend:

```json
{
  "/api/*": {
    "target": "https://your-api-url.com",
    "secure": true,
    "changeOrigin": true
  }
}
```

### Проверка развертывания

1. После развертывания перейдите по ссылке из GitHub Pages
2. Проверьте консоль браузера на ошибки
3. Убедитесь, что assets загружаются правильно
4. Протестируйте основные функции приложения

### Troubleshooting

#### Проблема: Assets не загружаются
**Решение**: Проверьте `baseHref` в `angular.json` и убедитесь, что пути к assets относительные

#### Проблема: CORS ошибки
**Решение**: Настройте CORS на backend или используйте proxy

#### Проблема: Routing не работает
**Решение**: Убедитесь, что в GitHub Pages настроен fallback на `index.html` для SPA routing

#### Проблема: Workflow не запускается
**Решение**: Проверьте, что файл workflow находится в правильной папке `.github/workflows/`

### Структура файлов для развертывания

```
.github/
  workflows/
    deploy-frontend.yml    # GitHub Actions workflow

frontend/
  angular.json            # Настройки Angular (baseHref уже настроен)
  package.json            # Скрипты для развертывания
  src/environments/
    environment.prod.ts   # Production настройки API
```

### Дополнительные настройки

#### Custom Domain
Если у вас есть кастомный домен:
1. Добавьте `CNAME` файл в корень проекта
2. Настройте DNS записи
3. Укажите домен в настройках GitHub Pages

#### HTTPS
GitHub Pages автоматически предоставляет HTTPS для всех сайтов.

#### Analytics
Для добавления аналитики используйте Google Analytics или другие сервисы в `index.html`.

### Поддержка

Если возникнут проблемы с развертыванием, проверьте:
1. Логи GitHub Actions
2. Консоль браузера
3. Network вкладку в DevTools
4. Документацию Angular по развертыванию
