-- Migration: Add role hierarchy fields
-- Description: Adds primaryRole and activeRole fields to support hierarchical role system
-- Date: 2025-10-21

-- Add new columns
ALTER TABLE users ADD COLUMN primary_role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN active_role VARCHAR(20);

-- Migrate existing data: set primaryRole from existing role field
UPDATE users SET primary_role = role WHERE primary_role IS NULL OR primary_role = '';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_primary_role ON users(primary_role);
CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(active_role);

-- Add comment for documentation
COMMENT ON COLUMN users.primary_role IS 'Highest role assigned to user in hierarchy (ADMIN > MANAGER > USER)';
COMMENT ON COLUMN users.active_role IS 'Currently active role in session. If NULL, primaryRole is used';

