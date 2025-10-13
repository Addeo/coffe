-- ============================================
-- Migration: Add work_sessions table
-- Date: 2025-10-13
-- Description: Create work_sessions table to track multiple work visits per order
-- ============================================

-- 1. Create work_sessions table
CREATE TABLE IF NOT EXISTS `work_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `engineer_id` INT NOT NULL,
  `work_date` DATE NOT NULL COMMENT 'Дата работы - определяет месяц для расчёта зарплаты',
  
  -- Время работы
  `regular_hours` DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT 'Обычные часы работы',
  `overtime_hours` DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT 'Часы переработки',
  
  -- Оплата инженеру
  `calculated_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Рассчитанная оплата инженеру за работу',
  `car_usage_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Доплата за использование машины',
  
  -- Ставки (для аудита)
  `engineer_base_rate` DECIMAL(10,2) NOT NULL COMMENT 'Базовая ставка инженера (₽/час)',
  `engineer_overtime_rate` DECIMAL(10,2) DEFAULT NULL COMMENT 'Ставка переработки инженера (₽/час)',
  
  -- Оплата от организации
  `organization_payment` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Сумма, которую платит организация',
  `organization_base_rate` DECIMAL(10,2) NOT NULL COMMENT 'Базовая ставка организации (₽/час)',
  `organization_overtime_multiplier` DECIMAL(5,2) DEFAULT NULL COMMENT 'Коэффициент переработки организации',
  
  -- Разбивка оплат (для отчётности)
  `regular_payment` DECIMAL(10,2) DEFAULT NULL COMMENT 'Оплата за обычные часы (инженеру)',
  `overtime_payment` DECIMAL(10,2) DEFAULT NULL COMMENT 'Оплата за переработку (инженеру)',
  `organization_regular_payment` DECIMAL(10,2) DEFAULT NULL COMMENT 'Оплата за обычные часы (от организации)',
  `organization_overtime_payment` DECIMAL(10,2) DEFAULT NULL COMMENT 'Оплата за переработку (от организации)',
  `profit` DECIMAL(10,2) DEFAULT NULL COMMENT 'Прибыль (organizationPayment - calculatedAmount)',
  
  -- Детали работы
  `distance_km` DECIMAL(8,2) DEFAULT NULL COMMENT 'Расстояние до объекта',
  `territory_type` VARCHAR(20) DEFAULT NULL COMMENT 'Тип территории',
  `notes` TEXT DEFAULT NULL COMMENT 'Примечания о выполненной работе',
  `photo_url` VARCHAR(255) DEFAULT NULL COMMENT 'Фото выполненной работы',
  
  -- Статус и флаги
  `status` VARCHAR(20) NOT NULL DEFAULT 'completed' COMMENT 'Статус сессии',
  `can_be_invoiced` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Можно ли выставить счёт (учитывать в оплате)',
  
  -- Timestamps
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT `fk_work_sessions_order` 
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_work_sessions_engineer` 
    FOREIGN KEY (`engineer_id`) REFERENCES `engineers`(`id`) ON DELETE CASCADE,
    
  -- Indexes
  INDEX `idx_work_sessions_work_date` (`work_date`),
  INDEX `idx_work_sessions_engineer_work_date` (`engineer_id`, `work_date`),
  INDEX `idx_work_sessions_order_id` (`order_id`),
  INDEX `idx_work_sessions_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Рабочие сессии (выезды) по заказам';

-- ============================================
-- Verification queries
-- ============================================

-- Check that table was created
SELECT 
  TABLE_NAME, 
  TABLE_ROWS, 
  CREATE_TIME 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'work_sessions';

-- Check indexes
SHOW INDEXES FROM work_sessions;

-- ============================================
-- Rollback script (if needed)
-- ============================================
-- DROP TABLE IF EXISTS `work_sessions`;

