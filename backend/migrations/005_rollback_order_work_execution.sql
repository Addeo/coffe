-- Rollback migration: Remove order work execution fields
-- Date: 2025-10-21

-- Drop indexes
DROP INDEX IF EXISTS idx_orders_completion_locked;
DROP INDEX IF EXISTS idx_orders_is_incomplete;

-- Remove columns
ALTER TABLE orders DROP COLUMN IF EXISTS completion_locked_at;
ALTER TABLE orders DROP COLUMN IF EXISTS is_incomplete;
ALTER TABLE orders DROP COLUMN IF EXISTS comments;
ALTER TABLE orders DROP COLUMN IF EXISTS equipment_info;
ALTER TABLE orders DROP COLUMN IF EXISTS is_repair_complete;
ALTER TABLE orders DROP COLUMN IF EXISTS is_overtime_rate;
ALTER TABLE orders DROP COLUMN IF EXISTS total_work_hours;
ALTER TABLE orders DROP COLUMN IF EXISTS work_end_time;
ALTER TABLE orders DROP COLUMN IF EXISTS work_start_time;
ALTER TABLE orders DROP COLUMN IF EXISTS work_act_number;

