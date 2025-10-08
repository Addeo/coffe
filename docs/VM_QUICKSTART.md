# 🚀 Быстрый старт: VM + Docker + Backups

## Предварительные требования

- SSH ключ (уже есть у вас)
- Доступ к SberCloud VM
- Проект Coffee Admin настроен

## 1. Развертывание на VM

```bash
# Сделать скрипт исполняемым
chmod +x deploy-sbercloud.sh

# Запустить деплой (автоматически настроит бэкапы)
./deploy-sbercloud.sh ВАШ_VM_IP ~/.ssh/id_ed25519
```

## 2. Управление VM

```bash
# Проверка статуса
./vm-manage.sh status ВАШ_VM_IP ~/.ssh/id_ed25519

# Просмотр логов
./vm-manage.sh logs all ВАШ_VM_IP ~/.ssh/id_ed25519

# Перезапуск сервисов
./vm-manage.sh restart ВАШ_VM_IP ~/.ssh/id_ed25519
```

## 3. Работа с бэкапами

```bash
# Скачать все бэкапы на локальную машину
./download-backups.sh ВАШ_VM_IP ~/.ssh/id_ed25519 ./my-backups

# Ручное создание бэкапа на VM
ssh -i ~/.ssh/id_ed25519 ubuntu@ВАШ_VM_IP "~/scripts/create-backup.sh"
```

## 📋 Что происходит автоматически

- ✅ **Ежедневные бэкапы** в 2:00 ночи
- ✅ **Очистка старых бэкапов** каждое воскресенье
- ✅ **Мониторинг контейнеров** Docker
- ✅ **Логирование** всех операций

## 🆘 Проблемы?

```bash
# Проверить статус
./vm-manage.sh status

# Посмотреть логи
./vm-manage.sh logs all

# Перезапустить всё
./vm-manage.sh restart
```

## 📊 Мониторинг

```bash
# Детальная информация о системе
./vm-manage.sh monitor ВАШ_VM_IP ~/.ssh/id_ed25519

# Проверка на VM
ssh ubuntu@ВАШ_VM_IP "df -h && docker-compose ps"
```

## 💾 Структура файлов

```
coffee-project/
├── vm-manage.sh           # Управление VM
├── download-backups.sh    # Скачивание бэкапов
├── vm-backup-setup.sh     # Настройка бэкапов
├── deploy-sbercloud.sh    # Деплой на SberCloud
└── docs/
    └── VM_MANAGEMENT_BACKUP_README.md  # Полная документация
```

## 🎯 Следующие шаги

1. **Тестирование**: `./vm-manage.sh status`
2. **Бэкапы**: `./download-backups.sh`
3. **Мониторинг**: Настроить оповещения в SberCloud Console
4. **SSL**: Настроить HTTPS сертификат

---

**🎉 Готово! Ваше приложение работает в SberCloud с автоматическими бэкапами.**
