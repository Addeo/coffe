-- ============================================
-- Rollback Script for work_sessions migration
-- Date: 2025-10-13
-- Description: Safely remove work_sessions table and data
-- ============================================

-- WARNING: This will delete all work_sessions data!
-- Make sure you have a backup before running this!

-- Show what will be deleted
SELECT 
  'Work sessions to be deleted:' AS info,
  COUNT(*) AS count,
  SUM(regular_hours + overtime_hours) AS total_hours,
  SUM(calculated_amount + car_usage_amount) AS total_amount
FROM work_sessions;

-- Uncomment to execute rollback
-- DROP TABLE IF EXISTS `work_sessions`;

-- Verify table is dropped
-- SELECT TABLE_NAME 
-- FROM information_schema.TABLES 
-- WHERE TABLE_SCHEMA = DATABASE() 
--   AND TABLE_NAME = 'work_sessions';

