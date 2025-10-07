# 🖥️ VM Management & Backup Guide

Полное руководство по управлению виртуальной машиной SberCloud и автоматизированным бэкапам для Coffee Admin Panel.

## 📋 Содержание

1. [Обзор системы](#1-обзор-системы)
2. [Управление VM](#2-управление-vm)
3. [Автоматизированные бэкапы](#3-автоматизированные-бэкапы)
4. [Скачивание бэкапов](#4-скачивание-бэкапов)
5. [Мониторинг и обслуживание](#5-мониторинг-и-обслуживание)
6. [Восстановление из бэкапа](#6-восстановление-из-бэкапа)
7. [Устранение неисправностей](#7-устранение-неисправностей)

## 1. Обзор системы

### Архитектура
```
Локальная машина ← SSH → SberCloud VM (Ubuntu)
                              ↓
                       Docker Containers
                       ├── MySQL (coffee_admin)
                       ├── NestJS Backend (:3000)
                       └── Angular Frontend (:4000)
                              ↓
                         Automated Backups
                         ├── Daily: 2:00 AM
                         └── Cleanup: Sunday 3:00 AM
```

### Созданные скрипты

| Скрипт | Назначение | Запуск |
|--------|------------|--------|
| `vm-manage.sh` | Управление VM и контейнерами | `./vm-manage.sh <command>` |
| `vm-backup-setup.sh` | Настройка автоматизированных бэкапов | `./vm-backup-setup.sh <vm_ip>` |
| `download-backups.sh` | Скачивание бэкапов на локальную машину | `./download-backups.sh <vm_ip>` |

## 2. Управление VM

### Основные команды

```bash
# Проверка статуса VM и приложений
./vm-manage.sh status 192.168.1.100 ~/.ssh/id_ed25519

# Просмотр логов контейнеров
./vm-manage.sh logs backend    # Backend логи
./vm-manage.sh logs frontend   # Frontend логи
./vm-manage.sh logs mysql      # MySQL логи
./vm-manage.sh logs all        # Все логи

# Перезапуск сервисов
./vm-manage.sh restart backend    # Перезапуск backend
./vm-manage.sh restart frontend   # Перезапуск frontend
./vm-manage.sh restart            # Перезапуск всех

# Мониторинг ресурсов
./vm-manage.sh monitor

# Очистка старых файлов
./vm-manage.sh cleanup

# Обновление приложения
./vm-manage.sh update

# SSH подключение к VM
./vm-manage.sh ssh
```

### Примеры использования

```bash
# Быстрая проверка статуса
./vm-manage.sh status

# Мониторинг в реальном времени
./vm-manage.sh logs all

# Перезапуск после обновления
./vm-manage.sh update && ./vm-manage.sh status
```

## 3. Автоматизированные бэкапы

### Настройка бэкапов

Бэкапы автоматически настраиваются при деплое через `deploy-sbercloud.sh`. Если нужно настроить вручную:

```bash
./vm-backup-setup.sh 192.168.1.100 ~/.ssh/id_ed25519
```

### Расписание бэкапов

```bash
# Ежедневные бэкапы в 2:00 ночи
0 2 * * * /home/ubuntu/scripts/create-backup.sh

# Еженедельная очистка старых бэкапов (воскресенье, 3:00)
0 3 * * 0 /home/ubuntu/scripts/cleanup-backups.sh
```

### Структура бэкапов на VM

```
/home/ubuntu/
├── backups/
│   ├── coffee_backup_20241201_020000.sql
│   ├── coffee_backup_20241202_020000.sql
│   └── backup.log
└── scripts/
    ├── create-backup.sh
    └── cleanup-backups.sh
```

### Ручное создание бэкапа

```bash
# На VM
~/scripts/create-backup.sh

# Через SSH
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.1.100 "~/scripts/create-backup.sh"
```

## 4. Скачивание бэкапов

### Автоматизированное скачивание

```bash
# Скачать все бэкапы с VM
./download-backups.sh 192.168.1.100 ~/.ssh/id_ed25519 ./vm-backups

# Использовать настройки по умолчанию
./download-backups.sh
```

### Что скачивается

Скрипт создает архив `vm_backup_YYYYMMDD_HHMMSS.tar.gz` содержащий:

- Все файлы бэкапов `*.sql`
- Логи бэкапов `backup.log`
- Системную информацию `system_info.txt`
- Документацию `README.md`

### Автоматизация скачивания

Добавьте в crontab на локальной машине:

```bash
# Еженедельное скачивание бэкапов (понедельник, 6:00)
0 6 * * 1 /path/to/coffee/download-backups.sh 192.168.1.100 ~/.ssh/id_ed25519 /path/to/backups
```

## 5. Мониторинг и обслуживание

### Проверка здоровья системы

```bash
# Статус всех компонентов
./vm-manage.sh status

# Детальный мониторинг
./vm-manage.sh monitor
```

### Очистка системы

```bash
# Очистка старых бэкапов и Docker
./vm-manage.sh cleanup

# На VM вручную
docker system prune -f
docker volume prune -f
```

### Обновление приложения

```bash
# Полное обновление с новыми образами
./vm-manage.sh update

# Или через SSH
ssh ubuntu@192.168.1.100
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build
```

## 6. Восстановление из бэкапа

### Локальное восстановление

```bash
# Скачать бэкап
./download-backups.sh

# Распаковать архив
tar -xzf vm_backup_*.tar.gz
cd vm_backup_*/

# Восстановить в локальную базу
mysql -u root -p coffee_admin < coffee_backup_20241201_020000.sql
```

### Восстановление на VM

```bash
# Остановить приложение
ssh ubuntu@192.168.1.100 "docker-compose -f docker-compose.prod.yml down"

# Восстановить базу
ssh ubuntu@192.168.1.100 "docker-compose -f docker-compose.prod.yml exec -T mysql mysql -u coffee_user -pcoffee_password coffee_admin < ~/backups/backup_file.sql"

# Запустить приложение
ssh ubuntu@192.168.1.100 "docker-compose -f docker-compose.prod.yml up -d"
```

### Через API (если доступно)

```bash
# Получить токен администратора из приложения
TOKEN="your-admin-jwt-token"

# Создать бэкап
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://192.168.1.100:3000/api/backup/create-sql-dump

# Скачать бэкап
curl -H "Authorization: Bearer $TOKEN" \
  http://192.168.1.100:3000/api/backup/download/backup_file.sql \
  -o backup_file.sql
```

## 7. Устранение неисправностей

### Проблемы с подключением

```bash
# Проверить SSH
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.1.100 "echo 'SSH works'"

# Проверить Docker
./vm-manage.sh status

# Проверить логи
./vm-manage.sh logs all
```

### Проблемы с бэкапами

```bash
# Проверить статус бэкапов на VM
ssh ubuntu@192.168.1.100 "ls -la ~/backups/"

# Проверить логи бэкапов
ssh ubuntu@192.168.1.100 "tail -50 ~/backups/backup.log"

# Проверить cron
ssh ubuntu@192.168.1.100 "crontab -l"

# Ручной тест бэкапа
ssh ubuntu@192.168.1.100 "~/scripts/create-backup.sh"
```

### Восстановление после сбоя

```bash
# Перезапуск всех сервисов
./vm-manage.sh restart

# Если не помогает - полное переразвертывание
./deploy-sbercloud.sh 192.168.1.100 ~/.ssh/id_ed25519
```

### Мониторинг дискового пространства

```bash
# Проверить место на VM
ssh ubuntu@192.168.1.100 "df -h"

# Очистить логи Docker
ssh ubuntu@192.168.1.100 "docker system prune -f"

# Очистить старые бэкапы
./vm-manage.sh cleanup
```

## 💰 Стоимость обслуживания

### Ежемесячные расходы (SberCloud):

| Сервис | Конфигурация | Цена |
|--------|-------------|------|
| ECS VM | s3.medium.2 (2CPU, 4GB) | ~300₽ |
| RDS MySQL | s3.medium (2CPU, 4GB, 40GB) | ~500₽ |
| EIP | Публичный IP | ~120₽ |
| **Итого** | | **~920₽/месяц** |

### Резервное копирование:

- ✅ **Автоматизированные бэкапы** (включены)
- ✅ **Локальные копии** (бесплатно)
- ✅ **Ротация бэкапов** (30 дней хранения)

## 🔧 Полезные команды

### На VM
```bash
# Просмотр статуса
docker-compose -f docker-compose.prod.yml ps

# Логи в реальном времени
docker-compose -f docker-compose.prod.yml logs -f

# Рестарт сервиса
docker-compose -f docker-compose.prod.yml restart backend

# Вход в контейнер
docker-compose -f docker-compose.prod.yml exec backend sh

# Проверка дискового пространства
df -h && du -sh ~/backups/
```

### Локальные команды
```bash
# Управление VM
./vm-manage.sh status
./vm-manage.sh logs all
./vm-manage.sh restart

# Работа с бэкапами
./download-backups.sh
./vm-backup-setup.sh

# Деплой
./deploy-sbercloud.sh <vm_ip> <ssh_key>
```

## 📞 Поддержка

При возникновении проблем:

1. **Проверьте логи**: `./vm-manage.sh logs all`
2. **Проверьте статус**: `./vm-manage.sh status`
3. **Перезапустите сервисы**: `./vm-manage.sh restart`
4. **Проверьте бэкапы**: `./download-backups.sh`

---

**🚀 Ваша система готова к надежной работе в SberCloud!**
