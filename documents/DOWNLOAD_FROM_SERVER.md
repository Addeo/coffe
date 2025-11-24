# 📥 Как скачать файлы с сервера

## 🔹 Основной способ: SCP (Secure Copy)

### Синтаксис:

```bash
scp [опции] user@host:/путь/к/файлу /локальный/путь/
```

## 📋 Примеры

### 1. Скачать APK файл

```bash
# Скачать APK на сервере в текущую директорию
scp user1@192.144.12.102:~/coffe/app-debug.apk ./

# Скачать в конкретную директорию
scp user1@192.144.12.102:~/coffe/app-debug.apk ./downloads/

# Скачать с другим именем
scp user1@192.144.12.102:~/coffe/app-debug.apk ./my-app.apk
```

### 2. Скачать директорию (рекурсивно)

```bash
# Скачать всю директорию проекта
scp -r user1@192.144.12.102:~/coffe ./server-backup/

# Скачать только backend
scp -r user1@192.144.12.102:~/coffe/backend ./backend-backup/
```

### 3. Скачать несколько файлов

```bash
# Скачать несколько файлов
scp user1@192.144.12.102:~/coffe/app-debug.apk \
    user1@192.144.12.102:~/coffe/.env \
    ./
```

### 4. Скачать с указанием порта (если SSH не на стандартном порту)

```bash
scp -P 2222 user1@192.144.12.102:~/coffe/app-debug.apk ./
```

## 🔹 Альтернативный способ: SFTP

### Интерактивный режим:

```bash
sftp user1@192.144.12.102

# В sftp:
> cd ~/coffe
> ls
> get app-debug.apk
> get app-debug.apk ./local-app.apk  # С другим именем
> get -r backend ./backend-backup    # Скачать директорию
> exit
```

### Неинтерактивный режим:

```bash
# Скачать файл через sftp (batch mode)
echo "get ~/coffe/app-debug.apk ./app-debug.apk" | sftp user1@192.144.12.102
```

## 🔹 Скачать через HTTP (если файл доступен)

```bash
# Если APK доступен через веб-сервер
curl -O http://192.144.12.102:3001/app-debug.apk

# Или с другим именем
curl -o my-app.apk http://192.144.12.102:3001/app-debug.apk

# С прогресс-баром
curl -# -O http://192.144.12.102:3001/app-debug.apk
```

## 📋 Быстрые команды для этого проекта

### Скачать APK с сервера:

```bash
scp user1@192.144.12.102:~/coffe/app-debug.apk ./apk-from-server.apk
```

### Скачать логи:

```bash
# Логи backend
scp user1@192.144.12.102:~/coffe/backend/logs/* ./logs/

# Docker logs (если сохранены)
ssh user1@192.144.12.102 "docker logs coffee_backend_fallback > /tmp/backend.log"
scp user1@192.144.12.102:/tmp/backend.log ./backend.log
```

### Скачать бэкапы:

```bash
scp -r user1@192.144.12.102:~/coffe/backups ./server-backups/
```

### Скачать весь проект:

```bash
scp -r user1@192.144.12.102:~/coffe ./server-coffe-backup/
```

## 🔧 Полезные опции SCP

```bash
# Сохранить права доступа
scp -p user1@192.144.12.102:~/coffe/file.txt ./

# Показать прогресс
scp -v user1@192.144.12.102:~/coffe/app-debug.apk ./

# Использовать сжатие (для медленных соединений)
scp -C user1@192.144.12.102:~/coffe/large-file.zip ./

# Комбинация опций
scp -vprC user1@192.144.12.102:~/coffe/app-debug.apk ./
# -v: verbose (показать прогресс)
# -p: preserve permissions
# -r: recursive (для директорий)
# -C: compress
```

## 📝 Скрипт для автоматического скачивания

```bash
#!/bin/bash
# download-apk.sh

VPS_HOST="192.144.12.102"
VPS_USER="user1"
REMOTE_PATH="~/coffe/app-debug.apk"
LOCAL_PATH="./apk-from-server.apk"

echo "📥 Downloading APK from server..."
scp -v "${VPS_USER}@${VPS_HOST}:${REMOTE_PATH}" "${LOCAL_PATH}"

if [ -f "${LOCAL_PATH}" ]; then
  echo "✅ APK downloaded successfully!"
  ls -lh "${LOCAL_PATH}"
else
  echo "❌ Download failed"
fi
```

## ⚠️ Решение проблем

### Проблема: "Permission denied"

```bash
# Проверить права доступа на сервере
ssh user1@192.144.12.102 "ls -lah ~/coffe/app-debug.apk"

# Исправить права (на сервере)
ssh user1@192.144.12.102 "chmod 644 ~/coffe/app-debug.apk"
```

### Проблема: "Host key verification failed"

```bash
# Добавить host в known_hosts
ssh-keyscan -H 192.144.12.102 >> ~/.ssh/known_hosts

# Или использовать опцию
scp -o StrictHostKeyChecking=no user1@192.144.12.102:~/coffe/app-debug.apk ./
```

### Проблема: Медленное соединение

```bash
# Использовать сжатие
scp -C user1@192.144.12.102:~/coffe/app-debug.apk ./

# Или использовать rsync (с прогрессом)
rsync -avz --progress user1@192.144.12.102:~/coffe/app-debug.apk ./
```

## 🔍 Проверка перед скачиванием

```bash
# Проверить, что файл существует на сервере
ssh user1@192.144.12.102 "ls -lh ~/coffe/app-debug.apk"

# Проверить размер
ssh user1@192.144.12.102 "du -h ~/coffe/app-debug.apk"

# Проверить доступность
ssh user1@192.144.12.102 "test -f ~/coffe/app-debug.apk && echo 'File exists' || echo 'File not found'"
```
