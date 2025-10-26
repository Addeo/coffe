-- Migration: Add payment tracking fields to orders table
-- Date: 2024-10-26
-- Description: Add fields to track payment status from organization and engineer payment status

-- Add new fields to orders table
ALTER TABLE orders 
ADD COLUMN received_from_organization BOOLEAN DEFAULT FALSE COMMENT 'Получены ли деньги от организации',
ADD COLUMN received_from_organization_date DATETIME NULL COMMENT 'Дата получения денег от организации',
ADD COLUMN received_from_organization_notes TEXT NULL COMMENT 'Примечания о получении денег от организации';

-- Add index for better query performance
CREATE INDEX idx_orders_received_from_org ON orders(received_from_organization);
CREATE INDEX idx_orders_received_from_org_date ON orders(received_from_organization_date);

-- Update existing orders to have default values
UPDATE orders SET received_from_organization = FALSE WHERE received_from_organization IS NULL;
