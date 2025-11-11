-- Migration: Add order work execution fields
-- Description: Adds detailed fields for work execution tracking (act number, times, overtime, completion status)
-- Date: 2025-10-21

-- Helper function to add column only if it doesn't exist
-- work_act_number
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'work_act_number');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE orders ADD COLUMN work_act_number VARCHAR(100)', 'SELECT ''Column work_act_number already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- work_start_time
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'work_start_time');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE orders ADD COLUMN work_start_time DATETIME', 'SELECT ''Column work_start_time already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- work_end_time
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'work_end_time');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE orders ADD COLUMN work_end_time DATETIME', 'SELECT ''Column work_end_time already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- total_work_hours
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'total_work_hours');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE orders ADD COLUMN total_work_hours DECIMAL(5, 2)', 'SELECT ''Column total_work_hours already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- is_overtime_rate
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'is_overtime_rate');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE orders ADD COLUMN is_overtime_rate BOOLEAN DEFAULT 0', 'SELECT ''Column is_overtime_rate already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- is_repair_complete
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'is_repair_complete');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE orders ADD COLUMN is_repair_complete BOOLEAN', 'SELECT ''Column is_repair_complete already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- equipment_info
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'equipment_info');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE orders ADD COLUMN equipment_info TEXT', 'SELECT ''Column equipment_info already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- comments
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'comments');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE orders ADD COLUMN comments TEXT', 'SELECT ''Column comments already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- is_incomplete
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'is_incomplete');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE orders ADD COLUMN is_incomplete BOOLEAN DEFAULT 0', 'SELECT ''Column is_incomplete already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- completion_locked_at
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'completion_locked_at');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE orders ADD COLUMN completion_locked_at DATETIME', 'SELECT ''Column completion_locked_at already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_is_incomplete ON orders(is_incomplete);
CREATE INDEX IF NOT EXISTS idx_orders_completion_locked ON orders(completion_locked_at);

-- Add comments for documentation
COMMENT ON COLUMN orders.work_act_number IS 'Номер Акта выполненных работ';
COMMENT ON COLUMN orders.work_start_time IS 'Время начала работ';
COMMENT ON COLUMN orders.work_end_time IS 'Время окончания работ';
COMMENT ON COLUMN orders.total_work_hours IS 'Общее время на объекте (рассчитывается автоматически)';
COMMENT ON COLUMN orders.is_overtime_rate IS 'Внеурочный тариф применен';
COMMENT ON COLUMN orders.is_repair_complete IS 'Ремонт завершен (true = да, false = нет, null = не указано)';
COMMENT ON COLUMN orders.equipment_info IS 'Информация об оборудовании (название и серийный номер)';
COMMENT ON COLUMN orders.comments IS 'Дополнительная информация по заявке';
COMMENT ON COLUMN orders.is_incomplete IS 'Отметка незавершенных работ (отображается как "!")';
COMMENT ON COLUMN orders.completion_locked_at IS 'Дата блокировки редактирования (24 часа после завершения)';

