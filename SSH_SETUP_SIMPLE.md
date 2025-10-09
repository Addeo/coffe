# 🔑 Простая настройка SSH через консоль Cloud.ru

## 📋 Ваш публичный ключ для копирования:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJAyaRN1xe8RUSxxIwwm9PBi6z6UBIdsO4U0R7od1+iW deploy@coffe-admin
```

**☝️ Скопируйте эту строку целиком!**

---

## 🖥️ ШАГ 1: Откройте консоль VPS в Cloud.ru

### В панели Cloud.ru:

1. Найдите вашу VM: **vm-46609d42d**
2. Найдите кнопку **"Консоль"**, **"VNC"** или **"Терминал"**
3. Кликните на неё - откроется терминал

**Должно появиться окно терминала с приглашением для входа.**

---

## 🔐 ШАГ 2: Залогиньтесь в консоли

В открывшемся терминале введите:

```
Login: user1
Password: coffeAdmin123!
```

**После успешного входа вы увидите что-то типа:**

```
user1@vm-46609d42d:~$
```

---

## 📝 ШАГ 3: Скопируйте и выполните команды

**В консоли VPS скопируйте и вставьте (все команды сразу):**

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJAyaRN1xe8RUSxxIwwm9PBi6z6UBIdsO4U0R7od1+iW deploy@coffe-admin
EOF
chmod 600 ~/.ssh/authorized_keys && echo "✅ SSH ключ добавлен!"
```

**Должно вывести:**

```
✅ SSH ключ добавлен!
```

---

## 🧪 ШАГ 4: Проверьте подключение с вашего Mac

В терминале на Mac:

```bash
ssh user1@192.144.12.102 "echo 'SSH подключение работает!'"
```

**Должно вывести:**

```
SSH подключение работает!
```

**БЕЗ запроса пароля!**

---

## ✅ ШАГ 5: Настройте Docker на VPS

В терминале на Mac выполните:

```bash
ssh user1@192.144.12.102 << 'ENDSSH'
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git curl
sudo usermod -aG docker user1
mkdir -p ~/coffe
docker --version
docker-compose --version
echo "✅ Docker установлен!"
ENDSSH
```

**После выполнения переподключитесь:**

```bash
ssh user1@192.144.12.102
exit
```

---

## 🚀 ШАГ 6: Запустите финальную проверку

```bash
bash check-deployment.sh
```

**Должно показать:**

```
2️⃣  ПОДКЛЮЧЕНИЕ К VPS
────────────────────────────────────────────────────────────
SSH подключение: ✅ OK

3️⃣  ПРОВЕРКА VPS
────────────────────────────────────────────────────────────
Docker установлен: ✅ Docker version ...
Docker Compose установлен: ✅ Docker Compose version ...
```

---

## 🎉 ШАГ 7: Запустите деплой!

Если все проверки ✅, выполните:

```bash
git commit -m "Deploy to VPS with refactored statistics"
git push origin main
```

Затем проверьте:

```
https://github.com/Addeo/coffe-deploy/actions
```

---

## 🐛 Если не работает:

### Проблема: "Permission denied (publickey)"

**Решение:** Ключ не добавлен или добавлен неправильно.

Проверьте в VNC консоли:

```bash
cat ~/.ssh/authorized_keys
```

Должна быть строка:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJAyaRN1xe8RUSxxIwwm9PBi6z6UBIdsO4U0R7od1+iW deploy@coffe-admin
```

### Проблема: "Connection refused"

**Решение:** VPS выключен или firewall блокирует.

В панели Cloud.ru проверьте, что VM **Запущена** (зелёный статус).

---

## 📞 Помощь:

Если не получается:

1. Сделайте скриншот панели Cloud.ru (где ищете SSH ключи)
2. Покажите вывод команды: `ssh -v user1@192.144.12.102`
3. Я помогу найти решение!
