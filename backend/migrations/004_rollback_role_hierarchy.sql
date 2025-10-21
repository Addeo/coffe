-- Rollback migration: Remove role hierarchy fields
-- Date: 2025-10-21

-- Drop indexes
DROP INDEX IF EXISTS idx_users_active_role;
DROP INDEX IF EXISTS idx_users_primary_role;

-- Remove columns
ALTER TABLE users DROP COLUMN IF EXISTS active_role;
ALTER TABLE users DROP COLUMN IF EXISTS primary_role;

