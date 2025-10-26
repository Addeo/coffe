-- Rollback Migration: Remove payment tracking fields from orders table
-- Date: 2024-10-26
-- Description: Remove fields that track payment status from organization

-- Drop indexes first
DROP INDEX IF EXISTS idx_orders_received_from_org ON orders;
DROP INDEX IF EXISTS idx_orders_received_from_org_date ON orders;

-- Remove columns from orders table
ALTER TABLE orders 
DROP COLUMN received_from_organization,
DROP COLUMN received_from_organization_date,
DROP COLUMN received_from_organization_notes;
