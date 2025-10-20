# ✅ Чеклист деплоя системы Work Sessions

## 📋 Предварительная проверка

- [x] Backend скомпилирован без ошибок
- [x] Frontend собран без ошибок
- [x] Shared пакет собран
- [x] Миграционные скрипты созданы
- [x] Dev БД обновлена (таблица work_sessions создана)
- [x] Документация готова

---

## 🧪 Тестирование на DEV (ОБЯЗАТЕЛЬНО!)

### Запустить локально:

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend  
cd frontend
ng serve
```

### Протестировать функционал:

- [ ] Открыть http://localhost:4200
- [ ] Войти в систему
- [ ] Создать тестовый заказ
- [ ] Назначить инженера на заказ
- [ ] Открыть заказ → вкладка "Рабочие сессии"
- [ ] Создать первую рабочую сессию:
  - [ ] Дата: сегодня
  - [ ] Часы: 4 обычных + 0 переработки
  - [ ] Оплата за машину: 2000₽
  - [ ] Примечания: "Тест 1"
  - [ ] Сохранить
- [ ] Проверить, что сессия отобразилась в списке
- [ ] Проверить сводку (должна показать: 1 выезд, 4 часа, сумма оплаты)
- [ ] Создать вторую сессию с датой на следующий месяц
- [ ] Проверить, что обе сессии видны
- [ ] Проверить API напрямую:
  ```bash
  curl http://localhost:3000/api/orders/1/work-sessions \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```

---

## 🚀 Деплой на Production

### Вариант A: Автоматический деплой (рекомендуется)

```bash
./deploy-migration.sh
```

Скрипт автоматически:
1. Загрузит миграции на VPS
2. Запустит миграцию БД (с backup!)
3. Задеплоит новый код
4. Перезапустит backend

**Checklist автоматического деплоя:**
- [ ] Скрипт запущен: `./deploy-migration.sh`
- [ ] Подтверждено начало деплоя
- [ ] Backup создан успешно
- [ ] Миграция выполнена (таблица создана)
- [ ] Данные мигрированы
- [ ] Backend перезапущен
- [ ] Нет ошибок в логах

### Вариант B: Ручной деплой

#### 1. Подключение к VPS:
```bash
ssh user@your-vps-ip
cd /path/to/coffee-admin
```

#### 2. Backup БД:
```bash
cd backend
mkdir -p backups
mysqldump -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE \
  > backups/backup-$(date +%Y-%m-%d-%H-%M-%S).sql
```

#### 3. Загрузить миграции:
```bash
# С локального компьютера
scp backend/migrations/*.sql user@vps:/path/to/backend/migrations/
scp backend/migrations/run-migration.sh user@vps:/path/to/backend/migrations/
```

#### 4. Запустить миграцию:
```bash
# На VPS
cd backend/migrations
chmod +x run-migration.sh
source ../.env
./run-migration.sh
```

#### 5. Деплой кода:
```bash
# С локального компьютера
cd backend
npm run build
# Загрузить на VPS...

# На VPS
pm2 restart coffee-backend
```

**Checklist ручного деплоя:**
- [ ] SSH подключение установлено
- [ ] Backup БД создан
- [ ] Миграционные файлы загружены на VPS
- [ ] Скрипт миграции выполнен успешно
- [ ] Таблица work_sessions создана
- [ ] Данные мигрированы (если были)
- [ ] Новый код backend загружен
- [ ] Backend перезапущен
- [ ] Логи проверены (нет ошибок)

---

## ✅ Проверка после деплоя

### На VPS (через SSH):

```bash
# Проверить логи backend
pm2 logs coffee-backend --lines 50

# Проверить таблицу work_sessions
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE \
  -e "SELECT COUNT(*) AS sessions FROM work_sessions;"

# Проверить индексы
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE \
  -e "SHOW INDEXES FROM work_sessions;"
```

### В браузере:

- [ ] Открыть production URL
- [ ] Войти в систему
- [ ] Открыть любой заказ
- [ ] Проверить наличие вкладки "Рабочие сессии"
- [ ] Создать тестовую сессию
- [ ] Проверить, что сессия сохранилась
- [ ] Проверить сводку по сессиям

---

## 🆘 Если что-то пошло не так

### Откат миграции БД:

```bash
# На VPS
cd backend/backups
ls -lht backup-*.sql | head -1  # Найти последний backup

mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE \
  < backup-YYYY-MM-DD-HH-MM-SS.sql

pm2 restart coffee-backend
```

### Откат кода:

```bash
# На VPS
cd /path/to/coffee-admin
git reset --hard HEAD~1  # Откатить на предыдущий коммит
cd backend
npm run build
pm2 restart coffee-backend
```

---

## 📞 Поддержка

- 📖 Полная документация в `docs/PRODUCTION_MIGRATION_GUIDE.md`
- 📋 Быстрый старт в `MIGRATION_QUICK_START.md`
- 🎯 Архитектура в `docs/WORK_SESSIONS_PROPOSAL.md`

---

## 🎊 Готово!

После успешного деплоя система будет поддерживать:
- ✅ Учёт множественных выездов по одному заказу
- ✅ Корректное распределение работ по месяцам
- ✅ Детальную историю каждого выезда
- ✅ Правильный расчёт зарплаты

**Удачного деплоя!** 🚀

