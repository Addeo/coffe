# Gmail Integration Setup Guide

## Обзор

Система поддерживает автоматическое создание заказов из email сообщений Gmail. При получении письма с определенными тегами система автоматически создаст заказ в системе.

## Настройка Google Cloud Console

### 1. Создание проекта

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий

### 2. Включение Gmail API

1. В левом меню выберите "APIs & Services" > "Library"
2. Найдите "Gmail API" и включите его

### 3. Создание учетных данных

1. Перейдите в "APIs & Services" > "Credentials"
2. Нажмите "Create Credentials" > "OAuth 2.0 Client IDs"
3. Выберите тип приложения "Web application"
4. Добавьте авторизованные redirect URIs:
   - Для разработки: `http://localhost:3002/api/gmail/auth/callback`
   - Для продакшена: `https://your-domain.com/api/gmail/auth/callback`

### 4. Настройка переменных окружения

Добавьте следующие переменные в ваш `.env` файл:

```env
# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3002/api/gmail/auth/callback

# Google OAuth2 Tokens (получите через авторизацию)
GOOGLE_ACCESS_TOKEN=
GOOGLE_REFRESH_TOKEN=
```

## Процесс авторизации

### 1. Получение URL авторизации

```bash
GET /api/gmail/auth-url
```

Этот эндпоинт вернет URL для авторизации Google аккаунта.

### 2. Авторизация

1. Откройте полученный URL в браузере
2. Выберите Google аккаунт
3. Предоставьте разрешения на доступ к Gmail
4. Google перенаправит вас обратно с кодом авторизации

### 3. Обработка callback

```bash
POST /api/gmail/auth/callback?code=authorization_code
```

Система автоматически сохранит access и refresh токены.

## Формат email для создания заказов

### Теги для распознавания

Email должен содержать один из следующих тегов в теме или теле письма:

- `[ORDER]` или `[ЗАКАЗ]`
- `ORDER:` или `ЗАКАЗ:`
- `#order` или `#заказ`
- `[НОВЫЙ ЗАКАЗ]`

### Пример email

**Тема:** `[ЗАКАЗ] Ремонт кофе-машины в офисе

**Тело письма:**

```
Уважаемые коллеги,

Нам требуется ремонт кофе-машины в офисе на ул. Ленина, 15.

Описание проблемы: Кофе-машина не включается, индикаторы не горят.

Organization ID: 5
Планируемая дата: 15.09.2025

С уважением,
Иван Иванов
```

### Парсинг данных из email

Система автоматически извлекает следующие данные:

1. **Организация** - ищет паттерны типа `Organization: 123` или `Org ID: 123`
2. **Описание** - ищет после слов `Description:`, `Details:` или `Message:`
3. **Адрес** - ищет после слов `Address:`, `Location:` или `Place:`
4. **Дата** - распознает даты в форматах DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD

## API эндпоинты

### Проверка статуса

```bash
GET /api/gmail/status
```

Возвращает статус настройки Gmail интеграции.

### Ручная проверка email

```bash
POST /api/gmail/check-emails
```

Принудительно проверяет новые email (только для администраторов).

## Планировщик задач

Система автоматически проверяет новые email каждые 5 минут через cron job:

```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async handleEmailCheck() {
  await this.gmailService.checkNewEmails();
}
```

## Уведомления

При создании заказа из email:

1. **Логируется** в системе аудита
2. **Отправляется уведомление** всем администраторам
3. **Заказ помечается** как созданный из email

## Безопасность

- Доступ к Gmail API только у администраторов
- Автоматическая обработка токенов OAuth2
- Логирование всех операций с email

## Отладка

Для отладки Gmail интеграции:

1. Проверьте статус: `GET /api/gmail/status`
2. Проверьте логи сервера на наличие ошибок
3. Убедитесь, что переменные окружения настроены правильно

## Troubleshooting

### Распространенные проблемы:

1. **"Gmail client not initialized"**
   - Проверьте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET

2. **"Invalid grant"**
   - Токены истекли, нужно повторно авторизоваться

3. **"Access denied"**
   - Проверьте права доступа к Gmail API

4. **Email не обрабатывается**
   - Проверьте, содержит ли email нужные теги
   - Проверьте логи сервера

## Мониторинг

Система логирует все операции с Gmail:

- Успешная авторизация
- Создание заказов из email
- Ошибки обработки
- Статистика проверок

Логи доступны через LoggerService для анализа и отладки.
