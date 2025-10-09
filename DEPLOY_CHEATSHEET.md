# 🚀 Шпаргалка по деплоу

## ⚡ Быстрые команды

### 1️⃣ Узнать IP VPS

```bash
# В панели Cloud.ru или:
ssh user1@IP_АДРЕС "curl ifconfig.me"
```

### 2️⃣ Настроить VPS (один раз)

```bash
# Скопируйте скрипт на VPS:
scp vps-setup-commands.sh user1@IP_АДРЕС:~/

# Подключитесь и выполните:
ssh user1@IP_АДРЕС
bash ~/vps-setup-commands.sh
```

### 3️⃣ Добавить секреты в GitHub

```
https://github.com/Addeo/coffe-deploy/settings/secrets/actions

Файл с готовыми значениями: YOUR_GITHUB_SECRETS.txt
```

### 4️⃣ Запустить деплой

```bash
git add .
git commit -m "Deploy to VPS"
git push origin main
```

### 5️⃣ Проверить статус

```
https://github.com/Addeo/coffe-deploy/actions
```

---

## 🔧 Полезные команды для VPS

### Подключение:

```bash
ssh user1@ВАШ_IP
```

### Просмотр логов:

```bash
cd ~/coffe
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Перезапуск:

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Статус контейнеров:

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Остановка:

```bash
docker-compose -f docker-compose.prod.yml down
```

### Запуск:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Проверка работы

### Backend API:

```bash
curl http://ВАШ_IP:3001/api/test
```

### Frontend:

```bash
curl http://ВАШ_IP:4000
```

### MySQL:

```bash
docker exec -it coffee_mysql_prod mysql -u coffee_user -pCoffeeUser2025!SecurePass coffee_admin
```

---

## 🔑 Секреты (для справки)

| Секрет              | Значение                                                         |
| ------------------- | ---------------------------------------------------------------- |
| VPS_HOST            | ВАШ_IP (из Cloud.ru)                                             |
| VPS_USER            | user1                                                            |
| VPS_SSH_KEY         | ~/.ssh/id_ed25519                                                |
| JWT_SECRET          | e781b5404b1eea3de2b1827d7791c556c8fb1a23b9853f5cd87f6e26f25b498d |
| MYSQL_ROOT_PASSWORD | CoffeeRoot2025!SecurePass                                        |
| MYSQL_DATABASE      | coffee_admin                                                     |
| MYSQL_USER          | coffee_user                                                      |
| MYSQL_PASSWORD      | CoffeeUser2025!SecurePass                                        |

---

## 📚 Документация

- **Быстрый старт:** `VPS_QUICK_START.md`
- **Полная инструкция:** `docs/VPS_DEPLOY_CLOUDRU.md`
- **Готовые секреты:** `YOUR_GITHUB_SECRETS.txt` ⚠️ НЕ КОММИТИТЬ!
- **Пошаговая инструкция:** `STEP_BY_STEP.md`

---

## ✅ Готово!

После деплоя:

- **Frontend:** http://ВАШ_IP:4000
- **Backend:** http://ВАШ_IP:3001/api
