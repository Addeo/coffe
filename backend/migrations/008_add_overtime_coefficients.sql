-- Migration: Add overtime coefficients
-- Description: Replaces overtime_rate with overtime_coefficient for calculation logic
-- Date: 2024-11-18
-- IMPORTANT: This changes the logic from fixed rate to coefficient multiplier

-- Add overtime coefficient columns to work_sessions
ALTER TABLE `work_sessions`
  ADD COLUMN `engineer_overtime_coefficient` DECIMAL(5,2) NULL DEFAULT 1.6 AFTER `engineer_base_rate`,
  ADD COLUMN `organization_overtime_coefficient` DECIMAL(5,2) NULL DEFAULT 1.5 AFTER `organization_base_rate`;

-- Migrate existing data: convert overtime_rate to coefficient
-- Formula: coefficient = overtime_rate / base_rate (if both exist and base_rate > 0)
UPDATE `work_sessions` ws
SET `engineer_overtime_coefficient` = CASE
  WHEN ws.`engineer_overtime_rate` IS NOT NULL 
    AND ws.`engineer_base_rate` IS NOT NULL 
    AND ws.`engineer_base_rate` > 0
  THEN ROUND(ws.`engineer_overtime_rate` / ws.`engineer_base_rate`, 2)
  ELSE 1.6 -- Default coefficient
END
WHERE ws.`engineer_overtime_coefficient` IS NULL;

-- For organization coefficient, use existing multiplier or default
UPDATE `work_sessions` ws
SET `organization_overtime_coefficient` = CASE
  WHEN ws.`organization_overtime_multiplier` IS NOT NULL 
    AND ws.`organization_overtime_multiplier` > 0
  THEN ws.`organization_overtime_multiplier`
  ELSE 1.5 -- Default coefficient
END
WHERE ws.`organization_overtime_coefficient` IS NULL;

-- Add overtime coefficient to engineers table
ALTER TABLE `engineers`
  ADD COLUMN `overtime_coefficient` DECIMAL(5,2) NULL DEFAULT 1.6 AFTER `base_rate`;

-- Migrate existing engineer data
UPDATE `engineers` e
SET `overtime_coefficient` = CASE
  WHEN e.`overtime_rate` IS NOT NULL 
    AND e.`base_rate` IS NOT NULL 
    AND e.`base_rate` > 0
  THEN ROUND(e.`overtime_rate` / e.`base_rate`, 2)
  ELSE 1.6 -- Default coefficient
END
WHERE e.`overtime_coefficient` IS NULL;

-- Add overtime coefficient to engineer_organization_rates
ALTER TABLE `engineer_organization_rates`
  ADD COLUMN `custom_overtime_coefficient` DECIMAL(5,2) NULL AFTER `custom_base_rate`;

-- Migrate existing custom rates (need base rate from engineer or custom_base_rate)
UPDATE `engineer_organization_rates` eor
INNER JOIN `engineers` e ON eor.`engineer_id` = e.`id`
SET `custom_overtime_coefficient` = CASE
  WHEN eor.`custom_overtime_rate` IS NOT NULL THEN
    CASE
      WHEN eor.`custom_base_rate` IS NOT NULL AND eor.`custom_base_rate` > 0
      THEN ROUND(eor.`custom_overtime_rate` / eor.`custom_base_rate`, 2)
      WHEN e.`base_rate` IS NOT NULL AND e.`base_rate` > 0
      THEN ROUND(eor.`custom_overtime_rate` / e.`base_rate`, 2)
      ELSE NULL
    END
  ELSE NULL
END
WHERE `custom_overtime_coefficient` IS NULL;

-- Add indexes for performance
CREATE INDEX `idx_work_sessions_overtime_coeff` ON `work_sessions`(`engineer_overtime_coefficient`);
CREATE INDEX `idx_engineers_overtime_coeff` ON `engineers`(`overtime_coefficient`);
CREATE INDEX `idx_engineer_org_rates_overtime_coeff` ON `engineer_organization_rates`(`custom_overtime_coefficient`);

-- Note: Old fields (engineer_overtime_rate, custom_overtime_rate, organization_overtime_multiplier)
-- are kept for backward compatibility and data audit purposes.
-- They will be removed in a future migration after verifying all data is correctly migrated.

