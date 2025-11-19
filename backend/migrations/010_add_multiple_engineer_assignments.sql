-- Migration: Add multiple engineer assignments to orders
-- Description: Allows assigning multiple engineers to one order
-- Date: 2024-11-18

-- Create order_engineer_assignments table for many-to-many relationship
CREATE TABLE IF NOT EXISTS `order_engineer_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `engineer_id` INT NOT NULL,
  `status` ENUM('pending', 'accepted', 'rejected', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `assigned_by_id` INT NULL,
  `accepted_at` DATETIME NULL,
  `rejected_at` DATETIME NULL,
  `rejection_reason` TEXT NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_order_engineer` (`order_id`, `engineer_id`),
  INDEX `idx_order_status` (`order_id`, `status`),
  INDEX `idx_engineer_status` (`engineer_id`, `status`),
  INDEX `idx_assigned_by` (`assigned_by_id`),
  CONSTRAINT `fk_order_assignments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_assignments_engineer` FOREIGN KEY (`engineer_id`) REFERENCES `engineers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_assignments_assigned_by` FOREIGN KEY (`assigned_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Миграция существующих назначений из orders.assigned_engineer_id
-- Создаем записи для всех существующих назначений
INSERT INTO `order_engineer_assignments` (`order_id`, `engineer_id`, `status`, `assigned_by_id`, `is_primary`, `created_at`)
SELECT 
  o.`id` as `order_id`,
  o.`assigned_engineer_id` as `engineer_id`,
  CASE 
    WHEN o.`status` = 'completed' THEN 'completed'
    WHEN o.`status` = 'paid_to_engineer' THEN 'completed'
    WHEN o.`status` = 'in_progress' THEN 'accepted'
    WHEN o.`status` = 'processing' THEN 'accepted'
    ELSE 'pending'
  END as `status`,
  o.`assigned_by` as `assigned_by_id`,
  TRUE as `is_primary`, -- Существующие назначения - основные
  o.`created_at` as `created_at`
FROM `orders` o
WHERE o.`assigned_engineer_id` IS NOT NULL
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- Note: Поле assigned_engineer_id в orders оставляем для обратной совместимости
-- Но теперь основная логика будет работать через order_engineer_assignments

