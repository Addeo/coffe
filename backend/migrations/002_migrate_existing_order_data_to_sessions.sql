-- ============================================
-- Migration: Migrate existing order work data to work_sessions
-- Date: 2025-10-13
-- Description: Convert existing order work data into work_sessions records
-- ============================================

-- ВАЖНО: Запускать ТОЛЬКО после успешного выполнения 001_add_work_sessions_table.sql

-- Создаём рабочие сессии из существующих завершённых заказов
INSERT INTO `work_sessions` (
  `order_id`,
  `engineer_id`,
  `work_date`,
  `regular_hours`,
  `overtime_hours`,
  `calculated_amount`,
  `car_usage_amount`,
  `engineer_base_rate`,
  `engineer_overtime_rate`,
  `organization_payment`,
  `organization_base_rate`,
  `organization_overtime_multiplier`,
  `regular_payment`,
  `overtime_payment`,
  `organization_regular_payment`,
  `organization_overtime_payment`,
  `profit`,
  `distance_km`,
  `territory_type`,
  `notes`,
  `photo_url`,
  `status`,
  `can_be_invoiced`,
  `created_at`,
  `updated_at`
)
SELECT
  o.id AS order_id,
  o.assigned_engineer_id AS engineer_id,
  -- Используем completion_date как work_date (или actual_start_date, или created_at)
  COALESCE(DATE(o.completion_date), DATE(o.actual_start_date), DATE(o.created_at)) AS work_date,
  COALESCE(o.regular_hours, 0) AS regular_hours,
  COALESCE(o.overtime_hours, 0) AS overtime_hours,
  COALESCE(o.calculated_amount, 0) AS calculated_amount,
  COALESCE(o.car_usage_amount, 0) AS car_usage_amount,
  COALESCE(o.engineer_base_rate, 0) AS engineer_base_rate,
  o.engineer_overtime_rate,
  COALESCE(o.organization_payment, 0) AS organization_payment,
  COALESCE(o.organization_base_rate, 0) AS organization_base_rate,
  o.organization_overtime_multiplier,
  COALESCE(o.regular_payment, 0) AS regular_payment,
  COALESCE(o.overtime_payment, 0) AS overtime_payment,
  COALESCE(o.organization_regular_payment, 0) AS organization_regular_payment,
  COALESCE(o.organization_overtime_payment, 0) AS organization_overtime_payment,
  COALESCE(o.profit, 0) AS profit,
  o.distance_km,
  o.territory_type,
  o.work_notes AS notes,
  o.work_photo_url AS photo_url,
  'completed' AS status,
  TRUE AS can_be_invoiced,
  o.created_at,
  o.updated_at
FROM `orders` o
WHERE o.status = 'completed'
  AND o.assigned_engineer_id IS NOT NULL
  AND (
    COALESCE(o.regular_hours, 0) > 0 
    OR COALESCE(o.overtime_hours, 0) > 0
    OR COALESCE(o.calculated_amount, 0) > 0
  );

-- ============================================
-- Verification queries
-- ============================================

-- Проверить количество мигрированных сессий
SELECT 
  COUNT(*) AS total_sessions,
  COUNT(DISTINCT order_id) AS unique_orders,
  SUM(regular_hours + overtime_hours) AS total_hours,
  SUM(calculated_amount + car_usage_amount) AS total_amount
FROM work_sessions;

-- Проверить сессии по месяцам
SELECT 
  YEAR(work_date) AS year,
  MONTH(work_date) AS month,
  COUNT(*) AS sessions_count,
  SUM(regular_hours + overtime_hours) AS total_hours,
  SUM(calculated_amount + car_usage_amount) AS total_amount
FROM work_sessions
GROUP BY YEAR(work_date), MONTH(work_date)
ORDER BY year DESC, month DESC;

-- Проверить сессии по инженерам
SELECT 
  e.id AS engineer_id,
  u.first_name,
  u.last_name,
  COUNT(ws.id) AS sessions_count,
  SUM(ws.regular_hours + ws.overtime_hours) AS total_hours
FROM work_sessions ws
JOIN engineers e ON ws.engineer_id = e.id
JOIN users u ON e.user_id = u.id
GROUP BY e.id, u.first_name, u.last_name
ORDER BY sessions_count DESC;

-- ============================================
-- Rollback script (if needed)
-- ============================================
-- DELETE FROM `work_sessions`;

