-- Migration: Add order work execution fields
-- Description: Adds detailed fields for work execution tracking (act number, times, overtime, completion status)
-- Date: 2025-10-21

-- Add work execution detail columns
ALTER TABLE orders ADD COLUMN work_act_number VARCHAR(100);
ALTER TABLE orders ADD COLUMN work_start_time DATETIME;
ALTER TABLE orders ADD COLUMN work_end_time DATETIME;
ALTER TABLE orders ADD COLUMN total_work_hours DECIMAL(5, 2);
ALTER TABLE orders ADD COLUMN is_overtime_rate BOOLEAN DEFAULT 0;
ALTER TABLE orders ADD COLUMN is_repair_complete BOOLEAN;
ALTER TABLE orders ADD COLUMN equipment_info TEXT;
ALTER TABLE orders ADD COLUMN comments TEXT;
ALTER TABLE orders ADD COLUMN is_incomplete BOOLEAN DEFAULT 0;
ALTER TABLE orders ADD COLUMN completion_locked_at DATETIME;

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

