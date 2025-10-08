# JWT Security Configuration

## Обзор

JWT (JSON Web Token) используется для аутентификации пользователей в системе. Правильная настройка `JWT_SECRET` критически важна для безопасности приложения.

## Текущая конфигурация

### ✅ Что уже настроено:

1. **Обязательная проверка JWT_SECRET**
   - В `jwt.strategy.ts` - проверка при инициализации стратегии
   - В `auth.module.ts` - проверка при регистрации JWT модуля
   - Приложение **не запустится** если `JWT_SECRET` не установлен

2. **Загрузка из переменных окружения**
   - `ConfigModule.forRoot()` в `app.module.ts` загружает `.env` файл
   - `JWT_SECRET` доступен глобально через `ConfigService`

3. **Время жизни токена**
   - По умолчанию: **24 часа** (`expiresIn: '24h'`)
   - Можно изменить в `auth.module.ts`

## Настройка для разных окружений

### Development (локальная разработка)

**Файл:** `.env`

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

⚠️ **Важно:** Даже для development используйте уникальный секрет!

### Production

**Требования к JWT_SECRET:**

- ✅ Минимум **32 символа**
- ✅ Содержит буквы, цифры и специальные символы
- ✅ Случайно сгенерирован
- ✅ Уникален для каждого окружения
- ❌ НЕ хранится в git
- ❌ НЕ используется дефолтное значение

**Генерация безопасного секрета:**

```bash
# Вариант 1: OpenSSL
openssl rand -base64 64

# Вариант 2: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Вариант 3: Online генератор
# https://randomkeygen.com/
```

**Пример безопасного секрета:**

```env
JWT_SECRET=8Zf9kL2mN5pQ7rS1tU3vW6xY0zA4bC8dE2fG5hJ7kL9mN1pQ3rS5tU7vW9xY1zA3
```

### Docker / Docker Compose

**docker-compose.yml:**

```yaml
services:
  backend:
    environment:
      - JWT_SECRET=${JWT_SECRET}
    env_file:
      - .env
```

**Или через secrets (рекомендуется):**

```yaml
services:
  backend:
    secrets:
      - jwt_secret
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### Kubernetes

**Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: jwt-secret
type: Opaque
stringData:
  JWT_SECRET: 'your-production-secret-here'
```

**Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coffee-admin-backend
spec:
  template:
    spec:
      containers:
        - name: backend
          env:
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: jwt-secret
                  key: JWT_SECRET
```

### Cloud Providers

#### Render.com

1. Dashboard → Service → Environment
2. Add Environment Variable:
   - Key: `JWT_SECRET`
   - Value: `<your-generated-secret>`

#### Heroku

```bash
heroku config:set JWT_SECRET="your-generated-secret"
```

#### AWS (ECS/EKS)

- Используйте **AWS Secrets Manager** или **Parameter Store**
- Загружайте секрет при старте контейнера

#### Yandex Cloud / SberCloud

- Используйте встроенные сервисы управления секретами
- Или передавайте через переменные окружения VM

## Проверка конфигурации

### 1. Проверить наличие JWT_SECRET

```bash
# В .env файле
grep JWT_SECRET .env

# В окружении (если backend запущен)
echo $JWT_SECRET
```

### 2. Проверить что приложение использует правильный секрет

```bash
# Запустить backend
cd backend && npm run start:dev

# Если JWT_SECRET отсутствует, увидите ошибку:
# Error: JWT_SECRET is not defined in environment variables!
```

### 3. Проверить работу аутентификации

```bash
# Получить токен
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coffee.com","password":"admin123"}'

# Ответ должен содержать access_token
# {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}

# Использовать токен
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer <access_token>"
```

## Ротация JWT_SECRET

### Когда нужно менять секрет:

- 🔴 **Немедленно:** Если секрет скомпрометирован
- 🟡 **Регулярно:** Каждые 6-12 месяцев (best practice)
- 🟢 **При необходимости:** При смене окружения (dev → prod)

### Процесс ротации:

1. **Подготовка:**

   ```bash
   # Сгенерировать новый секрет
   NEW_SECRET=$(openssl rand -base64 64)
   echo "New JWT_SECRET: $NEW_SECRET"
   ```

2. **Обновление:**

   ```bash
   # Обновить .env или переменные окружения
   JWT_SECRET="$NEW_SECRET"
   ```

3. **Перезапуск:**

   ```bash
   # Перезапустить backend
   pm2 restart coffee-admin-backend
   # или
   docker-compose restart backend
   ```

4. **Важно:**
   - ⚠️ Все активные токены станут невалидными
   - 👥 Пользователи должны будут войти заново
   - 📱 Мобильные приложения потребуют повторной авторизации

### Стратегия без downtime (advanced):

Для ротации без отключения пользователей можно:

1. Поддерживать два секрета одновременно (старый + новый)
2. Подписывать новые токены новым секретом
3. Проверять токены обоими секретами
4. Через N дней удалить старый секрет

## Безопасность

### ✅ Best Practices:

1. **Никогда не коммитьте .env в git**

   ```gitignore
   # .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Используйте разные секреты для разных окружений**
   - Development: один секрет
   - Staging: другой секрет
   - Production: третий секрет

3. **Храните секреты в безопасном месте**
   - Password manager (1Password, LastPass)
   - Secrets management service (Vault, AWS Secrets Manager)
   - Encrypted notes

4. **Ограничьте доступ к секретам**
   - Только необходимые члены команды
   - Используйте role-based access control

5. **Мониторинг и алерты**
   - Логируйте неудачные попытки аутентификации
   - Настройте алерты на подозрительную активность

### ❌ Что НЕ делать:

- ❌ Использовать дефолтное значение в production
- ❌ Хранить секрет в коде
- ❌ Отправлять секрет по email/slack
- ❌ Использовать короткие/простые секреты
- ❌ Использовать один секрет для всех окружений

## Troubleshooting

### Проблема: "JWT_SECRET is not defined"

**Решение:**

```bash
# 1. Проверить наличие .env файла
ls -la .env

# 2. Проверить содержимое
cat .env | grep JWT_SECRET

# 3. Если отсутствует - создать из примера
cp env.example .env

# 4. Сгенерировать новый секрет
openssl rand -base64 64

# 5. Добавить в .env
echo "JWT_SECRET=<generated-secret>" >> .env
```

### Проблема: "Invalid token"

**Возможные причины:**

1. JWT_SECRET был изменён после создания токена
2. Токен истёк (> 24 часа)
3. Токен повреждён

**Решение:**

```bash
# Получить новый токен
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"your-password"}'
```

### Проблема: Backend не запускается

**Проверить:**

```bash
# 1. Загружается ли .env
cd backend
node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"

# 2. Правильный ли путь к .env
# В app.module.ts должно быть:
# ConfigModule.forRoot({ envFilePath: '.env' })
```

## Дополнительные настройки

### Изменить время жизни токена

**Файл:** `backend/src/modules/аутентификация/auth.module.ts`

```typescript
JwtModule.registerAsync({
  // ...
  useFactory: async (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET'),
    signOptions: {
      expiresIn: '7d', // Изменить на нужное значение
      // '1h' - 1 час
      // '24h' - 24 часа
      // '7d' - 7 дней
      // '30d' - 30 дней
    },
  }),
  // ...
});
```

### Добавить refresh tokens (advanced)

Для реализации refresh tokens нужно:

1. Создать отдельную таблицу для refresh tokens
2. Добавить endpoint `/auth/refresh`
3. Хранить refresh token в httpOnly cookie
4. Использовать короткий access token (15 мин) + долгий refresh token (30 дней)

## См. также

- [NestJS JWT Documentation](https://docs.nestjs.com/security/authentication#jwt-token)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
