#!/bin/bash

# =============================================================================
# СОЗДАНИЕ ДАМПА БАЗЫ ДАННЫХ ДЛЯ ПРОДАКШЕНА
# =============================================================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Настройки
DB_PATH="./backend/database.sqlite"
OUTPUT_DIR="./production-dump"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="$OUTPUT_DIR/production_dump_$TIMESTAMP.sql"
SEED_FILE="$OUTPUT_DIR/production_seed_$TIMESTAMP.sql"

# Функции для логирования
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Создание директории для дампа
create_output_dir() {
    log "Создание директории для дампа..."
    
    if [ ! -d "$OUTPUT_DIR" ]; then
        mkdir -p "$OUTPUT_DIR"
        log_success "Директория создана: $OUTPUT_DIR"
    else
        log_info "Директория уже существует: $OUTPUT_DIR"
    fi
}

# Проверка существования базы данных
check_database() {
    log "Проверка существования базы данных..."
    
    if [ ! -f "$DB_PATH" ]; then
        log_error "База данных не найдена: $DB_PATH"
        log_info "Убедитесь, что backend запущен и база данных создана"
        return 1
    fi
    
    log_success "База данных найдена: $DB_PATH"
    return 0
}

# Создание дампа структуры базы данных
dump_schema() {
    log "Создание дампа структуры базы данных..."
    
    echo "-- =============================================================================" > "$DUMP_FILE"
    echo "-- ДАМП БАЗЫ ДАННЫХ ДЛЯ ПРОДАКШЕНА" >> "$DUMP_FILE"
    echo "-- Создан: $(date)" >> "$DUMP_FILE"
    echo "-- Версия: $(sqlite3 --version)" >> "$DUMP_FILE"
    echo "-- =============================================================================" >> "$DUMP_FILE"
    echo "" >> "$DUMP_FILE"
    
    # Схема базы данных
    sqlite3 "$DB_PATH" ".schema" >> "$DUMP_FILE"
    
    log_success "Схема базы данных экспортирована"
}

# Создание дампа данных
dump_data() {
    log "Создание дампа данных..."
    
    echo "" >> "$DUMP_FILE"
    echo "-- =============================================================================" >> "$DUMP_FILE"
    echo "-- ДАННЫЕ" >> "$DUMP_FILE"
    echo "-- =============================================================================" >> "$DUMP_FILE"
    echo "" >> "$DUMP_FILE"
    
    # Получаем список таблиц
    tables=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
    
    for table in $tables; do
        log_info "Экспорт таблицы: $table"
        
        # Проверяем, есть ли данные в таблице
        count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;")
        
        if [ "$count" -gt 0 ]; then
            echo "-- Данные таблицы: $table" >> "$DUMP_FILE"
            sqlite3 "$DB_PATH" ".mode insert $table" ".output /dev/stdout" "SELECT * FROM $table;" >> "$DUMP_FILE"
            echo "" >> "$DUMP_FILE"
            log_success "  Экспортировано $count записей"
        else
            echo "-- Таблица $table пуста" >> "$DUMP_FILE"
            log_warning "  Таблица пуста"
        fi
    done
    
    log_success "Данные экспортированы"
}

# Создание seed файла для продакшена
create_production_seed() {
    log "Создание seed файла для продакшена..."
    
    cat > "$SEED_FILE" << 'EOF'
-- =============================================================================
-- PRODUCTION SEED DATA
-- =============================================================================
-- Этот файл содержит базовые данные для продакшена
-- Включает: пользователей, организации, настройки

-- Отключение внешних ключей для вставки данных
PRAGMA foreign_keys=OFF;

-- =============================================================================
-- ПОЛЬЗОВАТЕЛИ
-- =============================================================================

-- Администратор (пароль: admin123)
INSERT OR IGNORE INTO users (id, email, password, first_name, last_name, role, is_active, created_at, updated_at) 
VALUES (1, 'admin@coffee.com', '$2b$10$sLBzpTHEx6GiLNIYaqJ/.Oh2BvarSaGQSJJasnrAhXuzc/ZqAQ.Yi', 'Admin', 'User', 'admin', 1, datetime('now'), datetime('now'));

-- Менеджер (пароль: manager123)
INSERT OR IGNORE INTO users (id, email, password, first_name, last_name, role, is_active, created_at, updated_at) 
VALUES (2, 'manager@coffee.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Manager', 'User', 'manager', 1, datetime('now'), datetime('now'));

-- Инженер 1 (пароль: engineer123)
INSERT OR IGNORE INTO users (id, email, password, first_name, last_name, role, is_active, created_at, updated_at) 
VALUES (3, 'engineer1@coffee.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Иван', 'Инженеров', 'user', 1, datetime('now'), datetime('now'));

-- Инженер 2 (пароль: engineer123)
INSERT OR IGNORE INTO users (id, email, password, first_name, last_name, role, is_active, created_at, updated_at) 
VALUES (4, 'engineer2@coffee.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Петр', 'Мастеров', 'user', 1, datetime('now'), datetime('now'));

-- =============================================================================
-- ИНЖЕНЕРЫ
-- =============================================================================

-- Профили инженеров
INSERT OR IGNORE INTO engineers (id, user_id, base_rate, overtime_rate, is_active, created_at, updated_at)
VALUES (1, 3, 800, 1200, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO engineers (id, user_id, base_rate, overtime_rate, is_active, created_at, updated_at)
VALUES (2, 4, 850, 1275, 1, datetime('now'), datetime('now'));

-- =============================================================================
-- ОРГАНИЗАЦИИ
-- =============================================================================

INSERT OR IGNORE INTO organizations (id, name, base_rate, overtime_multiplier, has_overtime, is_active, created_at, updated_at)
VALUES (1, 'Вистекс', 900, 1.5, 1, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO organizations (id, name, base_rate, overtime_multiplier, has_overtime, is_active, created_at, updated_at)
VALUES (2, 'РусХолтс', 1100, NULL, 0, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO organizations (id, name, base_rate, overtime_multiplier, has_overtime, is_active, created_at, updated_at)
VALUES (3, 'ТО Франко', 1100, NULL, 0, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO organizations (id, name, base_rate, overtime_multiplier, has_overtime, is_active, created_at, updated_at)
VALUES (4, 'Холод Вистекс', 1200, 1.5, 1, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO organizations (id, name, base_rate, overtime_multiplier, has_overtime, is_active, created_at, updated_at)
VALUES (5, 'Франко', 1210, 1.5, 1, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO organizations (id, name, base_rate, overtime_multiplier, has_overtime, is_active, created_at, updated_at)
VALUES (6, 'Локальный Сервис', 1200, 1.5, 1, 1, datetime('now'), datetime('now'));

-- =============================================================================
-- СТАВКИ ИНЖЕНЕРОВ ДЛЯ ОРГАНИЗАЦИЙ
-- =============================================================================

-- Ставки для инженера 1
INSERT OR IGNORE INTO engineer_organization_rates (id, engineer_id, organization_id, base_rate, overtime_rate, is_active, created_at, updated_at)
VALUES (1, 1, 1, 800, 1200, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO engineer_organization_rates (id, engineer_id, organization_id, base_rate, overtime_rate, is_active, created_at, updated_at)
VALUES (2, 1, 2, 850, 1275, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO engineer_organization_rates (id, engineer_id, organization_id, base_rate, overtime_rate, is_active, created_at, updated_at)
VALUES (3, 1, 3, 850, 1275, 1, datetime('now'), datetime('now'));

-- Ставки для инженера 2
INSERT OR IGNORE INTO engineer_organization_rates (id, engineer_id, organization_id, base_rate, overtime_rate, is_active, created_at, updated_at)
VALUES (4, 2, 4, 900, 1350, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO engineer_organization_rates (id, engineer_id, organization_id, base_rate, overtime_rate, is_active, created_at, updated_at)
VALUES (5, 2, 5, 950, 1425, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO engineer_organization_rates (id, engineer_id, organization_id, base_rate, overtime_rate, is_active, created_at, updated_at)
VALUES (6, 2, 6, 900, 1350, 1, datetime('now'), datetime('now'));

-- =============================================================================
-- НАСТРОЙКИ СИСТЕМЫ
-- =============================================================================

INSERT OR IGNORE INTO settings (id, key, value, description, created_at, updated_at)
VALUES (1, 'auto_distribution_enabled', 'false', 'Enable automatic order distribution', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO settings (id, key, value, description, created_at, updated_at)
VALUES (2, 'max_orders_per_engineer', '10', 'Maximum orders per engineer', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO settings (id, key, value, description, created_at, updated_at)
VALUES (3, 'default_base_rate', '800', 'Default base rate for engineers', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO settings (id, key, value, description, created_at, updated_at)
VALUES (4, 'default_overtime_multiplier', '1.5', 'Default overtime multiplier', datetime('now'), datetime('now'));

-- =============================================================================
-- ПРИМЕРЫ ЗАКАЗОВ
-- =============================================================================

-- Заказ 1 - Ожидает назначения
INSERT OR IGNORE INTO orders (id, organization_id, assigned_engineer_id, created_by, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, created_at, updated_at)
VALUES (1, 1, NULL, 1, NULL, 'ТО кофемашины в офисе', 'Плановое техническое обслуживание кофемашины', 'ул. Ленина, 10', 5.0, 'city', 'waiting', 'manual', date('now', '+1 day'), datetime('now'), datetime('now'));

-- Заказ 2 - Назначен инженеру
INSERT OR IGNORE INTO orders (id, organization_id, assigned_engineer_id, created_by, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, created_at, updated_at)
VALUES (2, 2, 1, 1, 1, 'Ремонт холодильника', 'Диагностика и ремонт холодильного оборудования', 'пр. Победы, 25', 12.0, 'city', 'assigned', 'manual', date('now', '+2 days'), datetime('now'), datetime('now'));

-- Заказ 3 - В работе
INSERT OR IGNORE INTO orders (id, organization_id, assigned_engineer_id, created_by, assigned_by, title, description, location, distance_km, territory_type, status, source, planned_start_date, actual_start_date, created_at, updated_at)
VALUES (3, 3, 2, 1, 1, 'Установка оборудования', 'Установка нового холодильного оборудования', 'ул. Мира, 15', 8.0, 'city', 'working', 'manual', date('now'), datetime('now'), datetime('now'), datetime('now'));

-- =============================================================================
-- БАЛАНСЫ ИНЖЕНЕРОВ
-- =============================================================================

INSERT OR IGNORE INTO engineer_balances (id, engineer_id, balance, last_calculation_date, created_at, updated_at)
VALUES (1, 1, 0.00, NULL, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO engineer_balances (id, engineer_id, balance, last_calculation_date, created_at, updated_at)
VALUES (2, 2, 0.00, NULL, datetime('now'), datetime('now'));

-- Включение внешних ключей
PRAGMA foreign_keys=ON;

-- =============================================================================
-- КОММЕНТАРИИ
-- =============================================================================

-- Пароли пользователей:
-- admin@coffee.com: admin123
-- manager@coffee.com: manager123  
-- engineer1@coffee.com: engineer123
-- engineer2@coffee.com: engineer123

-- Для смены паролей используйте bcrypt с cost factor 10
-- Пример: $2b$10$sLBzpTHEx6GiLNIYaqJ/.Oh2BvarSaGQSJJasnrAhXuzc/ZqAQ.Yi

EOF

    log_success "Seed файл создан: $SEED_FILE"
}

# Создание README файла
create_readme() {
    log "Создание README файла..."
    
    cat > "$OUTPUT_DIR/README.md" << EOF
# Production Database Dump

## Описание
Этот дамп содержит структуру и данные базы данных для продакшена Coffee Admin System.

## Файлы

- \`production_dump_$TIMESTAMP.sql\` - Полный дамп базы данных (структура + данные)
- \`production_seed_$TIMESTAMP.sql\` - Только базовые данные для продакшена
- \`README.md\` - Этот файл

## Установка

### Вариант 1: Полный дамп
\`\`\`bash
# Создание новой базы данных
sqlite3 production.db < production_dump_$TIMESTAMP.sql
\`\`\`

### Вариант 2: Только базовые данные
\`\`\`bash
# Создание новой базы данных с базовыми данными
sqlite3 production.db < production_seed_$TIMESTAMP.sql
\`\`\`

## Пользователи по умолчанию

| Email | Пароль | Роль |
|-------|--------|------|
| admin@coffee.com | admin123 | Администратор |
| manager@coffee.com | manager123 | Менеджер |
| engineer1@coffee.com | engineer123 | Инженер |
| engineer2@coffee.com | engineer123 | Инженер |

## Организации

- Вистекс (900₽/час, переработка 1.5x)
- РусХолтс (1100₽/час, без переработки)
- ТО Франко (1100₽/час, без переработки)
- Холод Вистекс (1200₽/час, переработка 1.5x)
- Франко (1210₽/час, переработка 1.5x)
- Локальный Сервис (1200₽/час, переработка 1.5x)

## Настройки

- \`auto_distribution_enabled\`: false
- \`max_orders_per_engineer\`: 10
- \`default_base_rate\`: 800
- \`default_overtime_multiplier\`: 1.5

## Важные замечания

1. **Смените пароли** после установки на продакшене
2. **Обновите настройки** под ваши требования
3. **Проверьте ставки** инженеров для организаций
4. **Создайте резервную копию** перед применением

## Создано

Дата: $(date)
Версия SQLite: $(sqlite3 --version)
EOF

    log_success "README файл создан"
}

# Создание архива
create_archive() {
    log "Создание архива..."
    
    cd "$OUTPUT_DIR"
    tar -czf "production_dump_$TIMESTAMP.tar.gz" *.sql *.md
    cd - > /dev/null
    
    log_success "Архив создан: $OUTPUT_DIR/production_dump_$TIMESTAMP.tar.gz"
}

# Вывод статистики
show_statistics() {
    log_info "=== СТАТИСТИКА БАЗЫ ДАННЫХ ==="
    
    echo "Таблицы и количество записей:"
    sqlite3 "$DB_PATH" "
    SELECT 
        name as 'Таблица',
        (SELECT COUNT(*) FROM sqlite_master sm2 WHERE sm2.name = sm.name AND sm2.type = 'table') as 'Записей'
    FROM sqlite_master sm 
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name;
    " | while read line; do
        echo "  $line"
    done
    
    echo ""
    echo "Размер базы данных: $(du -h "$DB_PATH" | cut -f1)"
    echo "Размер дампа: $(du -h "$DUMP_FILE" | cut -f1)"
    echo "Размер архива: $(du -h "$OUTPUT_DIR/production_dump_$TIMESTAMP.tar.gz" | cut -f1)"
}

# Основная функция
main() {
    echo -e "${PURPLE}=================================================================================="
    echo -e "                    СОЗДАНИЕ ДАМПА БАЗЫ ДАННЫХ ДЛЯ ПРОДАКШЕНА"
    echo -e "==================================================================================${NC}"
    
    # Проверки
    if ! check_database; then
        exit 1
    fi
    
    # Создание дампа
    create_output_dir
    dump_schema
    dump_data
    create_production_seed
    create_readme
    create_archive
    show_statistics
    
    echo ""
    echo -e "${GREEN}🎉 ДАМП УСПЕШНО СОЗДАН!${NC}"
    echo -e "${CYAN}Файлы находятся в директории: $OUTPUT_DIR${NC}"
    echo -e "${YELLOW}💡 Для установки на продакшене используйте: sqlite3 production.db < production_dump_$TIMESTAMP.sql${NC}"
}

# Запуск основной функции
main "$@"
