# 🔐 Database Backup & Restore - Best Practices

Полное руководство по резервному копированию и восстановлению базы данных Coffee Admin Panel с применением лучших практик.

## 📋 Содержание

1. [Обзор системы бэкапов](#1-обзор-системы-бэкапов)
2. [API Endpoints](#2-api-endpoints)
3. [Автоматизация](#3-автоматизация)
4. [Лучшие практики](#4-лучшие-практики)
5. [Примеры использования](#5-примеры-использования)
6. [Безопасность](#6-безопасность)
7. [Мониторинг и алерты](#7-мониторинг-и-алерты)

---

## 1. Обзор системы бэкапов

### Архитектура

```
┌─────────────────────────────────────────────────────┐
│              Coffee Admin Panel                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Development (SQLite)     Production (MySQL)         │
│  ├── Backup: Copy file    ├── Backup: mysqldump     │
│  └── Restore: Copy file   └── Restore: mysql import │
│                                                      │
├─────────────────────────────────────────────────────┤
│           Backup Storage (backups/)                  │
│  ├── backup-mysql-*.sql (Production)                │
│  ├── backup-sqlite-*.sqlite (Development)           │
│  └── uploaded-*.sql (Uploaded backups)              │
├─────────────────────────────────────────────────────┤
│           Automated Tasks                            │
│  ├── Monthly backup (1st day, 2:00 AM)              │
│  └── Cleanup old backups (180+ days)                │
└─────────────────────────────────────────────────────┘
```

### Ключевые возможности

✅ **Создание бэкапов**
- Автоматические ежемесячные бэкапы
- Ручное создание через API
- Поддержка MySQL (production) и SQLite (development)

✅ **Загрузка бэкапов**
- Загрузка .sql и .sqlite файлов через API
- Валидация размера (макс 100MB)
- Санитизация имен файлов

✅ **Восстановление**
- Восстановление из локальных бэкапов
- Восстановление из загруженных файлов
- Автоматический rollback при ошибках (SQLite)

✅ **Управление**
- Список всех бэкапов с метаданными
- Скачивание бэкапов
- Удаление старых бэкапов
- Автоматическая очистка (30+ дней)

---

## 2. API Endpoints

### Базовый URL
```
Production:  http://your-domain.com:3001/api/backup
Development: http://localhost:3001/api/backup
```

### 🔐 Аутентификация
Все endpoints требуют:
- JWT токен в заголовке: `Authorization: Bearer <token>`
- Роль пользователя: `ADMIN`

---

### 2.1. Создание бэкапа

**POST** `/api/backup/create`

Создает новый бэкап базы данных.

**Response:**
```json
{
  "message": "Database backup created successfully",
  "backupPath": "/path/to/backups/backup-mysql-coffee_admin-2025-01-15T14-30-00.sql"
}
```

**Пример (curl):**
```bash
curl -X POST http://localhost:3001/api/backup/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 2.2. Список бэкапов

**GET** `/api/backup/list`

Возвращает список всех доступных бэкапов с метаданными.

**Response:**
```json
{
  "backups": [
    {
      "name": "backup-mysql-coffee_admin-2025-01-15T14-30-00.sql",
      "path": "/path/to/backups/...",
      "size": 5242880,
      "sizeFormatted": "5.00 MB",
      "createdAt": "2025-01-15T14:30:00.000Z",
      "type": "mysql"
    }
  ]
}
```

**Пример (curl):**
```bash
curl -X GET http://localhost:3001/api/backup/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 2.3. Загрузка бэкапа (NEW!)

**POST** `/api/backup/upload`

Загружает файл бэкапа на сервер.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: файл бэкапа (.sql или .sqlite)

**Ограничения:**
- Максимальный размер: 100MB
- Разрешенные форматы: `.sql`, `.sqlite`

**Response:**
```json
{
  "success": true,
  "message": "Backup file uploaded successfully",
  "fileName": "uploaded-2025-01-15T14-30-00-my_backup.sql",
  "size": 5242880,
  "originalName": "my_backup.sql"
}
```

**Пример (curl):**
```bash
curl -X POST http://localhost:3001/api/backup/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/backup.sql"
```

**Пример (JavaScript/TypeScript):**
```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:3001/api/backup/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
console.log('Uploaded:', result.fileName);
```

---

### 2.4. Восстановление бэкапа

**POST** `/api/backup/restore/:fileName`

Восстанавливает базу данных из указанного бэкапа.

⚠️ **ВНИМАНИЕ:** Эта операция перезапишет текущую базу данных!

**Response:**
```json
{
  "success": true,
  "message": "Database restored successfully from backup-mysql-coffee_admin-2025-01-15T14-30-00.sql"
}
```

**Пример (curl):**
```bash
curl -X POST http://localhost:3001/api/backup/restore/backup-mysql-coffee_admin-2025-01-15T14-30-00.sql \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 2.5. Скачивание бэкапа

**GET** `/api/backup/download/:fileName`

Скачивает файл бэкапа.

**Response:** Бинарный файл (application/sql)

**Пример (curl):**
```bash
curl -X GET http://localhost:3001/api/backup/download/backup-mysql-coffee_admin-2025-01-15T14-30-00.sql \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o downloaded_backup.sql
```

---

### 2.6. Удаление бэкапа (NEW!)

**DELETE** `/api/backup/:fileName`

Удаляет файл бэкапа.

**Response:**
```json
{
  "success": true,
  "message": "Backup file deleted: backup-mysql-coffee_admin-2025-01-15T14-30-00.sql"
}
```

**Пример (curl):**
```bash
curl -X DELETE http://localhost:3001/api/backup/backup-mysql-coffee_admin-2025-01-15T14-30-00.sql \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 2.7. Очистка старых бэкапов

**DELETE** `/api/backup/cleanup?keepDays=30`

Удаляет бэкапы старше указанного количества дней.

**Query Parameters:**
- `keepDays`: количество дней для хранения (по умолчанию: 30)

**Response:**
```json
{
  "message": "Cleaned up 5 old backup files",
  "deletedCount": 5
}
```

**Пример (curl):**
```bash
curl -X DELETE "http://localhost:3001/api/backup/cleanup?keepDays=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 3. Автоматизация

### 3.1. Планировщик задач (Cron)

Система автоматически выполняет следующие задачи:

**Ежемесячный бэкап** (1-го числа каждого месяца в 2:00):
```typescript
@Cron('0 2 1 * *')
async handleMonthlyBackup() {
  // Создает бэкап
  // Очищает старые бэкапы (180+ дней)
}
```

### 3.2. Shell скрипты для VM

**Создание бэкапа на VM:**
```bash
~/scripts/create-backup.sh
```

**Автоматическая настройка:**
```bash
./vm-backup-setup.sh <vm_ip> <ssh_key>
```

**Скачивание бэкапов с VM:**
```bash
./download-backups.sh <vm_ip> <ssh_key> <local_dir>
```

---

## 4. Лучшие практики

### 4.1. Частота бэкапов

**Рекомендации по частоте:**

| Окружение | Частота | Метод |
|-----------|---------|-------|
| **Development** | Перед важными изменениями | Ручной |
| **Staging** | Ежедневно | Автоматический |
| **Production** | Ежедневно (2:00 AM) | Автоматический |

**Важно:**
- 📅 **Production**: Ежедневные бэкапы обязательны
- 🔄 **Перед обновлениями**: Всегда создавайте бэкап
- 🧪 **Перед тестами**: Бэкап перед тестированием миграций

### 4.2. Хранение бэкапов

**Стратегия хранения (3-2-1 rule):**
- 3 копии данных
- 2 разных типа носителей
- 1 копия вне офиса

**Для Coffee Admin Panel:**
```
├── Local VM:     30 дней (автоочистка)
├── Dev Machine:  7 дней (еженедельная загрузка)
└── Cloud:        180 дней (месячные архивы)
```

**Сроки хранения:**
```typescript
// В коде
const RETENTION_POLICY = {
  daily: 30,      // 30 дней для ежедневных
  monthly: 180,   // 6 месяцев для ежемесячных
  yearly: 2190,   // 6 лет для годовых (если требуется)
};
```

### 4.3. Тестирование восстановления

**Регулярное тестирование:**
1. Создайте тестовую среду
2. Восстановите последний бэкап
3. Проверьте целостность данных
4. Документируйте результаты

**Пример теста восстановления:**
```bash
#!/bin/bash
# test-restore.sh

echo "🧪 Testing backup restore..."

# 1. Скачать последний бэкап
LATEST_BACKUP=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/backup/list | jq -r '.backups[0].name')

echo "📦 Testing with: $LATEST_BACKUP"

# 2. Создать тестовую базу
mysql -u root -p -e "CREATE DATABASE coffee_admin_test;"

# 3. Восстановить бэкап
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/backup/restore/$LATEST_BACKUP

# 4. Проверить таблицы
mysql -u root -p coffee_admin_test -e "SHOW TABLES;"

echo "✅ Restore test completed"
```

### 4.4. Мониторинг размера бэкапов

**Следите за ростом:**
```bash
# Проверка размера бэкапов
du -sh ~/backups/

# Анализ роста за последний месяц
ls -lh ~/backups/ | tail -30
```

**Алерты при превышении:**
- Если размер бэкапа > 100MB: проверить таблицы
- Если рост > 50% за месяц: оптимизировать БД

### 4.5. Безопасное восстановление

**Чеклист перед восстановлением:**

```bash
# 1. Создайте бэкап текущего состояния
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/backup/create

# 2. Остановите приложение (если критично)
docker-compose stop backend

# 3. Восстановите из бэкапа
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/backup/restore/backup-file.sql

# 4. Проверьте целостность
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/test

# 5. Запустите приложение
docker-compose start backend
```

---

## 5. Примеры использования

### 5.1. Workflow: Создание и загрузка бэкапа

**Сценарий:** Перенос данных с production на staging

```bash
#!/bin/bash
# migrate-prod-to-staging.sh

PROD_URL="https://prod.example.com:3001/api/backup"
STAGING_URL="https://staging.example.com:3001/api/backup"
PROD_TOKEN="<prod_admin_token>"
STAGING_TOKEN="<staging_admin_token>"

echo "📦 Step 1: Create backup on Production"
RESPONSE=$(curl -X POST "$PROD_URL/create" \
  -H "Authorization: Bearer $PROD_TOKEN")

BACKUP_NAME=$(echo $RESPONSE | jq -r '.backupPath' | xargs basename)
echo "✅ Created: $BACKUP_NAME"

echo "📥 Step 2: Download backup from Production"
curl -X GET "$PROD_URL/download/$BACKUP_NAME" \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -o "/tmp/$BACKUP_NAME"

echo "📤 Step 3: Upload backup to Staging"
curl -X POST "$STAGING_URL/upload" \
  -H "Authorization: Bearer $STAGING_TOKEN" \
  -F "file=@/tmp/$BACKUP_NAME"

echo "🔄 Step 4: Restore on Staging"
curl -X POST "$STAGING_URL/restore/uploaded-*-$BACKUP_NAME" \
  -H "Authorization: Bearer $STAGING_TOKEN"

echo "🧹 Step 5: Cleanup"
rm "/tmp/$BACKUP_NAME"

echo "✅ Migration completed!"
```

### 5.2. Workflow: Scheduled backups с уведомлениями

**Создайте скрипт для cron:**

```bash
#!/bin/bash
# daily-backup-with-notification.sh

API_URL="http://localhost:3001/api/backup"
ADMIN_TOKEN="<your_admin_token>"
WEBHOOK_URL="<your_slack_webhook_url>"

# Создать бэкап
RESPONSE=$(curl -X POST "$API_URL/create" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -s)

if [ $? -eq 0 ]; then
  BACKUP_PATH=$(echo $RESPONSE | jq -r '.backupPath')
  BACKUP_NAME=$(basename $BACKUP_PATH)
  BACKUP_SIZE=$(du -h $BACKUP_PATH | cut -f1)
  
  # Успешное уведомление
  curl -X POST $WEBHOOK_URL \
    -H 'Content-Type: application/json' \
    -d "{
      \"text\": \"✅ Daily backup completed\",
      \"attachments\": [{
        \"fields\": [
          {\"title\": \"Backup\", \"value\": \"$BACKUP_NAME\"},
          {\"title\": \"Size\", \"value\": \"$BACKUP_SIZE\"},
          {\"title\": \"Time\", \"value\": \"$(date)\"}
        ]
      }]
    }"
else
  # Уведомление об ошибке
  curl -X POST $WEBHOOK_URL \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"❌ Daily backup FAILED at $(date)\"}"
fi
```

**Добавьте в crontab:**
```bash
0 2 * * * /path/to/daily-backup-with-notification.sh
```

### 5.3. TypeScript: Angular Service для бэкапов

```typescript
// backup.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

interface BackupMetadata {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  createdAt: Date;
  type: 'mysql' | 'sqlite';
}

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/backup`;

  createBackup(): Observable<{ message: string; backupPath: string }> {
    return this.http.post<any>(`${this.apiUrl}/create`, {});
  }

  listBackups(): Observable<{ backups: BackupMetadata[] }> {
    return this.http.get<any>(`${this.apiUrl}/list`);
  }

  uploadBackup(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  restoreBackup(fileName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/restore/${fileName}`, {});
  }

  downloadBackup(fileName: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/download/${fileName}`, {
      responseType: 'blob'
    });
  }

  deleteBackup(fileName: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${fileName}`);
  }

  cleanupOldBackups(keepDays: number = 30): Observable<any> {
    return this.http.delete(`${this.apiUrl}/cleanup?keepDays=${keepDays}`);
  }
}
```

### 5.4. Angular Component: Backup Management

```typescript
// backup-management.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { BackupService } from '@app/services/backup.service';

@Component({
  selector: 'app-backup-management',
  templateUrl: './backup-management.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BackupManagementComponent implements OnInit {
  private backupService = inject(BackupService);
  
  backups$ = signal<BackupMetadata[]>([]);
  loading$ = signal(false);
  uploadProgress$ = signal(0);

  ngOnInit() {
    this.loadBackups();
  }

  loadBackups() {
    this.loading$.set(true);
    this.backupService.listBackups().subscribe({
      next: (data) => {
        this.backups$.set(data.backups);
        this.loading$.set(false);
      },
      error: (err) => {
        console.error('Failed to load backups', err);
        this.loading$.set(false);
      }
    });
  }

  createBackup() {
    if (!confirm('Create a new backup?')) return;
    
    this.backupService.createBackup().subscribe({
      next: (result) => {
        alert(`Backup created: ${result.backupPath}`);
        this.loadBackups();
      },
      error: (err) => alert(`Failed to create backup: ${err.message}`)
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    
    // Проверка размера
    if (file.size > 100 * 1024 * 1024) {
      alert('File size exceeds 100MB limit');
      return;
    }

    // Проверка расширения
    if (!file.name.endsWith('.sql') && !file.name.endsWith('.sqlite')) {
      alert('Only .sql and .sqlite files are allowed');
      return;
    }

    this.uploadBackup(file);
  }

  uploadBackup(file: File) {
    this.loading$.set(true);
    
    this.backupService.uploadBackup(file).subscribe({
      next: (result) => {
        alert(`Backup uploaded: ${result.fileName}`);
        this.loadBackups();
      },
      error: (err) => {
        alert(`Upload failed: ${err.message}`);
        this.loading$.set(false);
      }
    });
  }

  restoreBackup(fileName: string) {
    const confirmed = confirm(
      `⚠️ WARNING: This will overwrite the current database!\n\n` +
      `Are you sure you want to restore from: ${fileName}?`
    );
    
    if (!confirmed) return;

    this.backupService.restoreBackup(fileName).subscribe({
      next: () => {
        alert('Database restored successfully! Please refresh the page.');
        setTimeout(() => window.location.reload(), 2000);
      },
      error: (err) => alert(`Restore failed: ${err.message}`)
    });
  }

  downloadBackup(fileName: string) {
    this.backupService.downloadBackup(fileName).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => alert(`Download failed: ${err.message}`)
    });
  }

  deleteBackup(fileName: string) {
    if (!confirm(`Delete backup: ${fileName}?`)) return;

    this.backupService.deleteBackup(fileName).subscribe({
      next: () => {
        alert('Backup deleted');
        this.loadBackups();
      },
      error: (err) => alert(`Delete failed: ${err.message}`)
    });
  }
}
```

---

## 6. Безопасность

### 6.1. Контроль доступа

**Только администраторы:**
```typescript
@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)  // ✅ Только ADMIN
export class BackupController {
  // ...
}
```

### 6.2. Валидация файлов

**Проверки при загрузке:**
- ✅ Расширение файла (только .sql, .sqlite)
- ✅ Размер файла (макс 100MB)
- ✅ Санитизация имени файла
- ✅ MIME-type проверка

### 6.3. Логирование

Все операции логируются:
```typescript
this.logger.log('Database backup created', {
  action: 'backup_created',
  resource: 'database',
  metadata: { fileName, fileSize, filePath }
});
```

---

## 7. Мониторинг и алерты

### 7.1. Что мониторить

**Ключевые метрики:**
- ✅ Успешность бэкапов (>99%)
- ✅ Время создания бэкапа (<5 минут)
- ✅ Размер бэкапов (тренд роста)
- ✅ Доступное дисковое пространство (>20%)

### 7.2. Алерты

**Настройте уведомления при:**
- ❌ Бэкап не создан в течение 25 часов
- ❌ Размер бэкапа вырос на >50%
- ❌ Свободное место <10%
- ❌ Ошибка при восстановлении

### 7.3. Health Check

```bash
#!/bin/bash
# backup-health-check.sh

LAST_BACKUP=$(ls -t ~/backups/*.sql 2>/dev/null | head -1)
LAST_MODIFIED=$(stat -c %Y "$LAST_BACKUP" 2>/dev/null)
CURRENT_TIME=$(date +%s)
HOURS_DIFF=$(( ($CURRENT_TIME - $LAST_MODIFIED) / 3600 ))

if [ $HOURS_DIFF -gt 25 ]; then
  echo "⚠️ WARNING: Last backup is $HOURS_DIFF hours old"
  # Отправить алерт
else
  echo "✅ Backup is fresh ($HOURS_DIFF hours ago)"
fi
```

---

## 📚 Дополнительные ресурсы

- [VM Management Guide](./VM_MANAGEMENT_BACKUP_README.md)
- [Deployment Guide](./SBERCLOUD_DEPLOY_README.md)
- [API Documentation](../backend/AUTH_API_README.md)

---

## 🤝 Поддержка

При проблемах с бэкапами:
1. Проверьте логи: `docker-compose logs backend`
2. Проверьте место на диске: `df -h`
3. Проверьте права доступа: `ls -la backups/`

**Критичные ситуации:**
- Немедленно создайте ручной бэкап
- Скачайте бэкап на локальную машину
- Обратитесь к команде поддержки

---

**✅ Следуя этим практикам, вы обеспечите надежное резервное копирование и быстрое восстановление данных Coffee Admin Panel!**

