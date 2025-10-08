-- Add rate fields to orders table for audit trail
-- These fields store the rates that were used for calculations

-- Engineer rates (already exist, just documenting)
-- ALTER TABLE orders ADD COLUMN engineerBaseRate DECIMAL(10,2);
-- ALTER TABLE orders ADD COLUMN engineerOvertimeRate DECIMAL(10,2);

-- Organization rates (already exist, just documenting) 
-- ALTER TABLE orders ADD COLUMN organizationBaseRate DECIMAL(10,2);
-- ALTER TABLE orders ADD COLUMN organizationOvertimeMultiplier DECIMAL(5,2);

-- Optional: Update existing completed orders with rates from organizations
-- UPDATE orders o
-- SET 
--   organizationBaseRate = (SELECT baseRate FROM organizations WHERE id = o.organizationId),
--   organizationOvertimeMultiplier = (SELECT overtimeMultiplier FROM organizations WHERE id = o.organizationId)
-- WHERE o.status = 'completed' AND o.organizationId IS NOT NULL;

-- Note: Engineer rates are set individually per engineer-organization pair
-- and will be populated when new work is completed via the API

