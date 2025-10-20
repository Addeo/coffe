# 🔑 Добавить SSH ключ на VPS

## 📋 Ваш публичный SSH ключ:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJAyaRN1xe8RUSxxIwwm9PBi6z6UBIdsO4U0R7od1+iW deploy@coffe-admin
```

---

## 🎯 Способ 1: Через панель Cloud.ru (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Откройте панель управления

```
https://cloud.ru/
```

### Шаг 2: Найдите вашу VM

- Виртуальные машины → **vm-46609d42d**

### Шаг 3: Добавьте SSH ключ

1. Найдите раздел **"SSH ключи"**, **"Безопасность"** или **"Настройки"**
2. Нажмите **"Добавить SSH ключ"** или **"Добавить ключ"**
3. Вставьте этот ключ:
   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJAyaRN1xe8RUSxxIwwm9PBi6z6UBIdsO4U0R7od1+iW deploy@coffe-admin
   ```
4. Нажмите **"Сохранить"**

### Шаг 4: Проверьте подключение

```bash
ssh user1@192.144.12.102
# Должно подключиться БЕЗ пароля!
```

---

## 🎯 Способ 2: Через VNC консоль Cloud.ru

Если панель не позволяет добавить ключ:

### Шаг 1: Откройте VNC консоль

1. Cloud.ru → vm-46609d42d
2. Найдите кнопку **"Консоль"** или **"VNC"**
3. Кликните на консоль

### Шаг 2: Залогиньтесь

```
Login: user1
Password: coffeAdmin123!
```

### Шаг 3: Добавьте ключ вручную

Выполните команды:

```bash
# Создать директорию для ключей
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Добавить ваш публичный ключ
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJAyaRN1xe8RUSxxIwwm9PBi6z6UBIdsO4U0R7od1+iW deploy@coffe-admin
EOF

# Установить правильные права
chmod 600 ~/.ssh/authorized_keys

# Проверить, что ключ добавлен
cat ~/.ssh/authorized_keys
```

### Шаг 4: Проверьте с вашего Mac

```bash
ssh user1@192.144.12.102 "echo 'SSH works!'"
```

---

## 🎯 Способ 3: Включить временно вход по паролю

Через VNC консоль:

```bash
# Войдите как user1

# Включить вход по паролю
sudo nano /etc/ssh/sshd_config

# Найдите строку:
# PasswordAuthentication no

# Измените на:
# PasswordAuthentication yes

# Сохраните: Ctrl+O, Enter, Ctrl+X

# Перезапустите SSH
sudo systemctl restart sshd

# Теперь с Mac подключитесь с паролем:
ssh user1@192.144.12.102
# Пароль: coffeAdmin123!

# После подключения добавьте ключ (из Способа 2, Шаг 3)
```

---

## ✅ После настройки SSH:

### 1. Проверьте подключение:

```bash
ssh user1@192.144.12.102
# Должно работать БЕЗ пароля!
```

### 2. Настройте VPS:

```bash
ssh user1@192.144.12.102

# Выполните команды:
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git curl
sudo usermod -aG docker user1
mkdir -p ~/coffe

# Выйдите и зайдите снова
exit
ssh user1@192.144.12.102
```

### 3. Проверьте готовность:

```bash
# На вашем Mac:
bash check-deployment.sh
```

Должно показать:

```
2️⃣  ПОДКЛЮЧЕНИЕ К VPS
────────────────────────────────────────────────────────────
SSH подключение: ✅ OK
```

### 4. Запустите деплой:

```bash
git commit -m "Deploy to VPS"
git push origin main
```

---

## 📞 Нужна помощь?

Если не получается настроить SSH:

1. Сделайте скриншот панели Cloud.ru (раздел SSH ключи)
2. Покажите вывод команды: `ssh -v user1@192.144.12.102`
3. Я помогу разобраться!
