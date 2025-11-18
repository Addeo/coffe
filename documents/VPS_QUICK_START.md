# 🚀 Быстрый старт деплоя на VPS (Cloud.ru)

## ✅ Что уже готово в вашем проекте:

1. ✅ `docker-compose.prod.yml` - конфигурация для production
2. ✅ `backend/Dockerfile` - образ для NestJS
3. ✅ `frontend/Dockerfile` - образ для Angular SSR
4. ✅ `.github/workflows/deploy-vps.yml` - автоматический деплой

---

## 🎯 Что нужно сделать (3 шага):

### Шаг 1: Настроить VPS (один раз)

```bash
# На VPS выполните:
sudo apt update && sudo apt install -y docker.io docker-compose git
sudo usermod -aG docker $USER
newgrp docker
mkdir -p ~/coffe
```

### Шаг 2: Добавить секреты в GitHub

**GitHub → Settings → Secrets and variables → Actions → New secret**

Добавьте эти секреты:

| Название              | Что вставить                                           |
| --------------------- | ------------------------------------------------------ |
| `VPS_HOST`            | IP вашего VPS (например: `185.123.45.67`)              |
| `VPS_USER`            | Имя пользователя (например: `ubuntu` или `root`)       |
| `VPS_SSH_KEY`         | Ваш приватный SSH ключ (весь текст из `~/.ssh/id_rsa`) |
| `JWT_SECRET`          | Любая длинная строка (мин. 32 символа)                 |
| `MYSQL_ROOT_PASSWORD` | Любой надёжный пароль                                  |
| `MYSQL_DATABASE`      | `coffee_admin`                                         |
| `MYSQL_USER`          | `coffee_user`                                          |
| `MYSQL_PASSWORD`      | Любой надёжный пароль                                  |
| `SMTP_HOST`           | `smtp.gmail.com` (если используете Gmail)              |
| `SMTP_PORT`           | `587`                                                  |
| `SMTP_USER`           | Ваш email                                              |
| `SMTP_PASS`           | Пароль приложения Gmail                                |

**Генерация JWT_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Шаг 3: Запушить код

```bash
git add .
git commit -m "Setup VPS deployment"
git push origin main
```

**Готово!** GitHub Actions автоматически задеплоит приложение на VPS! 🎉

---

## 🔍 Проверка после деплоя:

1. **GitHub Actions:**
   - Перейдите в **GitHub → Actions**
   - Проверьте, что workflow завершился успешно (зелёная галочка)

2. **Проверка работы:**

   ```bash
   # Backend API
   curl http://YOUR_VPS_IP:3001/api/test

   # Frontend
   curl http://YOUR_VPS_IP:4000
   ```

3. **Открыть в браузере:**
   - Frontend: `http://YOUR_VPS_IP:4000`
   - Backend API: `http://YOUR_VPS_IP:3001/api`

---

## 🐛 Если что-то не работает:

### Проверить логи на VPS:

```bash
ssh user@YOUR_VPS_IP
cd ~/coffe
docker-compose -f docker-compose.prod.yml logs -f
```

### Перезапустить сервисы:

```bash
docker-compose -f docker-compose.prod.yml restart
```

---

## 📋 Альтернатива: Ручной деплой (без GitHub Actions)

Если не хотите использовать GitHub Actions:

```bash
# 1. На VPS:
cd ~/coffe
git clone https://github.com/YOUR_USERNAME/coffe.git .

# 2. Создать .env файл
nano .env
# Вставить все переменные окружения

# 3. Запустить
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Проверить
docker-compose -f docker-compose.prod.yml ps
```

---

## ✅ Итого:

**У вас уже всё готово!** Нужно только:

1. Добавить секреты в GitHub (5 минут)
2. Сделать push (1 минута)
3. Дождаться деплоя (5-10 минут)

**Полная документация:** `docs/VPS_DEPLOY_CLOUDRU.md`

---

## 🎯 Что получите:

✅ Автоматический деплой при каждом push  
✅ MySQL база данных в контейнере  
✅ Backend API на порту 3001  
✅ Frontend на порту 4000  
✅ Автоматическое резервное копирование  
✅ Логирование и мониторинг

**Готово к production!** 🚀
