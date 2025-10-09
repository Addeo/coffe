# 📝 Пошаговая инструкция деплоя на VPS

## 🎯 Ваши данные:

- **VPS:** vm-46609d42d (Ubuntu 22.04, 2 vCPU, 4 GB RAM)
- **Пользователь:** `user1`
- **Пароль:** `coffeAdmin123!`
- **Провайдер:** Cloud.ru
- **IP адрес:** ❓ НУЖНО УЗНАТЬ В ПАНЕЛИ CLOUD.RU

---

## 🚀 ШАГ 1: Узнать IP адрес VPS

### Вариант A: В панели Cloud.ru

1. Откройте: https://cloud.ru/
2. Войдите в аккаунт
3. Перейдите: Виртуальные машины → vm-46609d42d
4. Скопируйте **IP адрес** (например: `185.123.45.67`)

### Вариант B: Через SSH (если уже знаете IP)

```bash
ssh user1@IP_АДРЕС
# Введите пароль: coffeAdmin123!

# На VPS выполните:
curl ifconfig.me
```

**📝 Запишите IP адрес, он понадобится дальше!**

---

## 🐳 ШАГ 2: Настроить VPS (один раз)

### Подключитесь к VPS:

```bash
ssh user1@ВАШ_IP_АДРЕС
# Введите пароль: coffeAdmin123!
```

### Выполните команды:

```bash
# 1. Обновить систему
sudo apt update && sudo apt upgrade -y

# 2. Установить Docker и Docker Compose
sudo apt install -y docker.io docker-compose git curl

# 3. Добавить пользователя в группу docker
sudo usermod -aG docker user1

# 4. Применить изменения группы
newgrp docker

# 5. Проверить установку
docker --version
docker-compose --version

# 6. Создать директорию для проекта
mkdir -p ~/coffe
cd ~/coffe

# 7. Готово!
echo "✅ VPS готов к деплоу!"
```

**⚠️ ВАЖНО:** После выполнения выйдите и зайдите снова для применения прав docker:

```bash
exit
ssh user1@ВАШ_IP_АДРЕС
```

---

## 🔐 ШАГ 3: Добавить секреты в GitHub

### 1. Откройте репозиторий:

```
https://github.com/Addeo/coffe-deploy
```

### 2. Перейдите в Settings → Secrets:

```
Settings (вверху)
  → Secrets and variables (слева)
    → Actions
      → New repository secret
```

### 3. Добавьте 12 секретов:

Откройте файл **`YOUR_GITHUB_SECRETS.txt`** и для каждого секрета:

- Скопируйте **Name**
- Скопируйте **Value**
- Нажмите **"Add secret"**

**Секреты для добавления:**

| #   | Name                  | Value            | Откуда взять       |
| --- | --------------------- | ---------------- | ------------------ |
| 1   | `VPS_HOST`            | `ВАШ_IP_АДРЕС`   | Из Шага 1          |
| 2   | `VPS_USER`            | `user1`          | Готово ✅          |
| 3   | `VPS_SSH_KEY`         | Из файла         | Готово ✅          |
| 4   | `JWT_SECRET`          | Из файла         | Готово ✅          |
| 5   | `MYSQL_ROOT_PASSWORD` | Из файла         | Готово ✅          |
| 6   | `MYSQL_DATABASE`      | `coffee_admin`   | Готово ✅          |
| 7   | `MYSQL_USER`          | `coffee_user`    | Готово ✅          |
| 8   | `MYSQL_PASSWORD`      | Из файла         | Готово ✅          |
| 9   | `SMTP_HOST`           | `smtp.gmail.com` | Готово ✅          |
| 10  | `SMTP_PORT`           | `587`            | Готово ✅          |
| 11  | `SMTP_USER`           | Ваш email        | Нужно заполнить ❗ |
| 12  | `SMTP_PASS`           | Пароль Gmail     | Нужно получить ❗  |

**Для SMTP_PASS:**

1. Перейдите: https://myaccount.google.com/apppasswords
2. Создайте пароль для "Mail"
3. Скопируйте 16-значный код

---

## 📤 ШАГ 4: Запушить код в GitHub

```bash
# В терминале на вашем Mac:
cd /Users/sergejkosilov/WebstormProjects/new\ goal/coffe

# Добавить файлы
git add .github/workflows/deploy-vps.yml
git add docs/VPS_DEPLOY_CLOUDRU.md
git add VPS_QUICK_START.md

# Коммит
git commit -m "Setup automatic VPS deployment with GitHub Actions"

# Пуш
git push origin main
```

---

## 🎬 ШАГ 5: Проверить деплой

### 1. Откройте GitHub Actions:

```
https://github.com/Addeo/coffe-deploy/actions
```

### 2. Вы увидите:

```
🔄 Deploy to VPS (Cloud.ru)
   Running...
```

### 3. Дождитесь завершения (5-10 минут):

```
✅ Deploy to VPS (Cloud.ru)
   Completed successfully
```

### 4. Откройте приложение в браузере:

```
Frontend: http://ВАШ_IP:4000
Backend:  http://ВАШ_IP:3001/api
```

---

## 🐛 Если что-то пошло не так:

### Проверить логи на VPS:

```bash
ssh user1@ВАШ_IP
cd ~/coffe
docker-compose -f docker-compose.prod.yml logs -f
```

### Перезапустить сервисы:

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Проверить статус:

```bash
docker-compose -f docker-compose.prod.yml ps
```

---

## 📋 Checklist (отмечайте по ходу):

- [ ] ✅ Узнал IP адрес VPS
- [ ] ✅ Подключился к VPS по SSH
- [ ] ✅ Установил Docker и Docker Compose на VPS
- [ ] ✅ Добавил все 12 секретов в GitHub
- [ ] ✅ Сделал git push в main ветку
- [ ] ✅ Проверил GitHub Actions (workflow завершился успешно)
- [ ] ✅ Открыл приложение в браузере
- [ ] ✅ Залогинился как admin

---

## 🎯 Итого:

**Вам нужно:**

1. ⏱️ **5 минут** - узнать IP и настроить VPS (Шаг 1-2)
2. ⏱️ **5 минут** - добавить секреты в GitHub (Шаг 3)
3. ⏱️ **1 минута** - сделать git push (Шаг 4)
4. ⏱️ **10 минут** - дождаться деплоя (Шаг 5)

**Всего: ~20 минут до готового приложения на VPS!** 🚀

---

## 📞 Нужна помощь?

Если что-то не получается, покажите мне:

- Скриншот из GitHub Actions
- Логи с VPS (`docker-compose logs`)
- Сообщение об ошибке

Я помогу разобраться! 💪
