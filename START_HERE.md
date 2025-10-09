# 🚀 НАЧНИТЕ ОТСЮДА - Деплой на VPS

## ✅ Ваши данные VPS:

```
IP адрес:    192.144.12.102
Пользователь: user1
Пароль:       coffeAdmin123!
Сервер:       vm-46609d42d (Cloud.ru)
OS:           Ubuntu 22.04
Ресурсы:      2 vCPU, 4 GB RAM, 30 GB SSD
```

---

## 📋 Что делать (простыми словами):

### ✅ ШАГ 1: Подключитесь к VPS и настройте его (5 минут)

Откройте терминал и выполните:

```bash
# Подключитесь к VPS:
ssh user1@192.144.12.102
# Введите пароль: coffeAdmin123!

# Скопируйте и вставьте эти команды (по очереди):

sudo apt update && sudo apt upgrade -y

sudo apt install -y docker.io docker-compose git curl

sudo usermod -aG docker user1

mkdir -p ~/coffe

docker --version

# Выйдите и зайдите снова:
exit
ssh user1@192.144.12.102
```

**✅ VPS готов!**

---

### ✅ ШАГ 2: Добавьте секреты в GitHub (10 минут)

1. **Откройте в браузере:**
   ```
   https://github.com/Addeo/coffe-deploy/settings/secrets/actions
   ```

2. **Нажмите кнопку:** `New repository secret`

3. **Откройте файл:** `YOUR_GITHUB_SECRETS.txt` (в этой папке)

4. **Для каждого секрета:**
   - Скопируйте **Name** (например: `VPS_HOST`)
   - Вставьте в поле "Name" на GitHub
   - Скопируйте **Value** (например: `192.144.12.102`)
   - Вставьте в поле "Secret" на GitHub
   - Нажмите **"Add secret"**

5. **Добавьте все 12 секретов** (список в файле `YOUR_GITHUB_SECRETS.txt`)

**⚠️ Важно заполнить:**
- `SMTP_USER` - ваш Gmail адрес
- `SMTP_PASS` - пароль приложения Gmail (получить тут: https://myaccount.google.com/apppasswords)

**✅ Секреты добавлены!**

---

### ✅ ШАГ 3: Запустите автоматический деплой (1 минута)

В терминале на вашем Mac:

```bash
cd /Users/sergejkosilov/WebstormProjects/new\ goal/coffe

git add .github/workflows/deploy-vps.yml
git add docs/VPS_DEPLOY_CLOUDRU.md
git add VPS_QUICK_START.md
git add STEP_BY_STEP.md
git add DEPLOY_CHEATSHEET.md
git add vps-setup-commands.sh

git commit -m "Setup automatic VPS deployment"

git push origin main
```

**✅ Код отправлен!**

---

### ✅ ШАГ 4: Проверьте деплой (10 минут)

1. **Откройте в браузере:**
   ```
   https://github.com/Addeo/coffe-deploy/actions
   ```

2. **Вы увидите:**
   ```
   🔄 Deploy to VPS (Cloud.ru)
      Running...
   ```

3. **Дождитесь завершения:**
   ```
   ✅ Deploy to VPS (Cloud.ru)
      ✓ Completed (5-10 минут)
   ```

4. **Если ошибка:**
   - Кликните на workflow
   - Посмотрите логи
   - Покажите мне ошибку

**✅ Деплой завершён!**

---

### ✅ ШАГ 5: Откройте приложение! 🎉

В браузере откройте:

```
Frontend (основное приложение):
http://192.144.12.102:4000

Backend API (для проверки):
http://192.144.12.102:3001/api/test
```

**Логин по умолчанию:**
- Email: `admin@coffee.com`
- Пароль: `admin123` (или создайте нового админа на VPS)

---

## 🐛 Если что-то не работает:

### Проверить на VPS:

```bash
ssh user1@192.144.12.102

cd ~/coffe

# Статус контейнеров:
docker-compose -f docker-compose.prod.yml ps

# Логи backend:
docker-compose -f docker-compose.prod.yml logs -f backend

# Логи frontend:
docker-compose -f docker-compose.prod.yml logs -f frontend

# Перезапустить всё:
docker-compose -f docker-compose.prod.yml restart
```

---

## 📊 Полезные ссылки:

- 🔗 **Frontend:** http://192.144.12.102:4000
- 🔗 **Backend API:** http://192.144.12.102:3001/api
- 🔗 **GitHub Actions:** https://github.com/Addeo/coffe-deploy/actions
- 🔗 **GitHub Secrets:** https://github.com/Addeo/coffe-deploy/settings/secrets/actions

---

## ✅ Checklist:

- [ ] Подключился к VPS (ssh user1@192.144.12.102)
- [ ] Установил Docker на VPS
- [ ] Добавил все 12 секретов в GitHub
- [ ] Сделал git push
- [ ] Дождался зелёной галочки в GitHub Actions
- [ ] Открыл http://192.144.12.102:4000
- [ ] Залогинился в приложение

---

## 🎯 Всё готово!

**Следуйте шагам выше, и через 20 минут у вас будет работающее приложение на VPS!** 🚀

**Если возникнут вопросы - просто покажите мне ошибку или скриншот!**

