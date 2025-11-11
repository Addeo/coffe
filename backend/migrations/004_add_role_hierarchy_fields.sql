-- Migration: Add role hierarchy fields
-- Description: Adds primaryRole and activeRole fields to support hierarchical role system
-- Date: 2025-10-21

-- Add new columns (only if they don't exist)
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'primary_role');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE users ADD COLUMN primary_role VARCHAR(20) DEFAULT ''user''', 'SELECT ''Column primary_role already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'active_role');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE users ADD COLUMN active_role VARCHAR(20)', 'SELECT ''Column active_role already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migrate existing data: set primaryRole from existing role field
UPDATE users SET primary_role = role WHERE (primary_role IS NULL OR primary_role = '') AND role IS NOT NULL;

-- Create index for better query performance (MySQL doesn't support IF NOT EXISTS for indexes, use stored procedure workaround)
SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_primary_role');
SET @sqlstmt := IF(@exist = 0, 'CREATE INDEX idx_users_primary_role ON users(primary_role)', 'SELECT ''Index idx_users_primary_role already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_active_role');
SET @sqlstmt := IF(@exist = 0, 'CREATE INDEX idx_users_active_role ON users(active_role)', 'SELECT ''Index idx_users_active_role already exists''');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

