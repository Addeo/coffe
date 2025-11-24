# Как проверить, что пользователь принял политику конфиденциальности

## Способы проверки

### 1. Через API эндпоинт (рекомендуемый способ)

#### Проверка статуса принятия соглашений

```bash
GET /api/agreements/user/check
Authorization: Bearer {user_token}
```

**Ответ:**

```json
{
  "hasAcceptedAll": true,
  "missingAgreements": [],
  "userAgreements": [
    {
      "id": 1,
      "userId": 123,
      "agreementType": "privacy_policy",
      "version": "1.0",
      "isAccepted": true,
      "acceptedAt": "2025-11-19T12:00:00Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

**Поля ответа:**

- `hasAcceptedAll` - `true` если все обязательные соглашения приняты
- `missingAgreements` - массив непринятых обязательных соглашений
- `userAgreements` - история всех принятий соглашений пользователем

#### Проверка конкретно политики конфиденциальности

```bash
# 1. Получить последнюю версию политики конфиденциальности
GET /api/agreements/latest/privacy_policy
Authorization: Bearer {user_token}

# 2. Проверить статус пользователя
GET /api/agreements/user/check
Authorization: Bearer {user_token}

# 3. Проверить в userAgreements, есть ли запись с:
#    - agreementType === "privacy_policy"
#    - version === последней версии
#    - isAccepted === true
```

#### Получение истории принятия соглашений

```bash
GET /api/agreements/user/history
Authorization: Bearer {user_token}
```

### 2. Через поле в модели User

При получении пользователя через API, в ответе будут поля:

```json
{
  "id": 123,
  "email": "user@example.com",
  "hasAcceptedAgreements": true,
  "agreementsAcceptedAt": "2025-11-19T12:00:00Z"
}
```

**Поля:**

- `hasAcceptedAgreements` - `true` если все обязательные соглашения приняты
- `agreementsAcceptedAt` - дата последнего принятия всех обязательных соглашений (или `null`)

### 3. При логине пользователя

При успешном логине в ответе автоматически включается информация о соглашениях:

```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

**Ответ:**

```json
{
  "access_token": "...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "hasAcceptedAgreements": true,
    "agreementsAcceptedAt": "2025-11-19T12:00:00Z"
  },
  "agreements": {
    "hasAcceptedAll": true,
    "missingAgreements": []
  }
}
```

## Примеры кода

### Frontend (TypeScript/Angular)

```typescript
// Проверка статуса соглашений
checkAgreementsStatus(): Observable<AgreementsStatus> {
  return this.http.get<AgreementsStatus>('/api/agreements/user/check');
}

// Проверка конкретно политики конфиденциальности
checkPrivacyPolicyAccepted(): Observable<boolean> {
  return this.checkAgreementsStatus().pipe(
    map(status => {
      const privacyPolicy = status.userAgreements?.find(
        ua => ua.agreementType === 'privacy_policy' && ua.isAccepted
      );
      return !!privacyPolicy;
    })
  );
}

// Проверка при инициализации компонента
ngOnInit() {
  this.checkAgreementsStatus().subscribe(status => {
    if (!status.hasAcceptedAll) {
      // Показать диалог для принятия соглашений
      this.showAgreementDialog(status.missingAgreements);
    }
  });
}
```

### Backend (в сервисе или контроллере)

```typescript
// Проверка перед доступом к защищенному ресурсу
@Get('protected-route')
async getProtectedData(@Request() req) {
  const agreementsStatus = await this.agreementsService.checkUserAgreements(req.user.id);

  if (!agreementsStatus.hasAcceptedAll) {
    throw new ForbiddenException('Вы должны принять все обязательные соглашения');
  }

  // Продолжаем выполнение...
  return { data: 'protected data' };
}
```

### Проверка через поле User

```typescript
// В сервисе
async checkUserAgreementsFromUser(userId: number): Promise<boolean> {
  const user = await this.usersRepository.findOne({ where: { id: userId } });
  return user?.hasAcceptedAgreements ?? false;
}
```

## Типы соглашений

Доступные типы соглашений (`AgreementType`):

- `terms_of_service` - Пользовательское соглашение
- `privacy_policy` - Политика конфиденциальности
- `data_processing` - Согласие на обработку данных

## Проверка в тестах

Добавлены тесты в `backend/scripts/test-api.js`:

- `test25_CheckUserAgreementsStatus` - проверка статуса соглашений
- `test25b_CheckUserAgreementsHistory` - получение истории
- `test25c_CheckPrivacyPolicyAccepted` - проверка политики конфиденциальности
- `test25d_CheckUserFieldInDatabase` - проверка поля в User

Запуск тестов:

```bash
npm run test:api
```

## Важные моменты

1. **Версии соглашений**: При обновлении соглашения создается новая версия, пользователь должен принять новую версию
2. **Обязательные соглашения**: Проверяются только соглашения с `isMandatory: true` и `isActive: true`
3. **История**: Все принятия сохраняются в таблице `user_agreements` для аудита
4. **IP и User-Agent**: При принятии соглашений автоматически сохраняются IP адрес и User-Agent браузера
