-- Migration: Add user agreements system
-- Description: Creates tables for tracking user agreement acceptance
-- Date: 2024-11-18

-- Create agreements table (stores agreement versions)
CREATE TABLE IF NOT EXISTS `agreements` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('terms_of_service', 'privacy_policy', 'data_processing') NOT NULL,
  `version` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_mandatory` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_by_id` INT NULL,
  `published_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_agreements_type_version` (`type`, `version`),
  INDEX `idx_agreements_is_active` (`is_active`),
  CONSTRAINT `fk_agreements_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_agreements table (tracks user acceptance)
CREATE TABLE IF NOT EXISTS `user_agreements` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `agreement_type` ENUM('terms_of_service', 'privacy_policy', 'data_processing') NOT NULL,
  `version` VARCHAR(50) NOT NULL,
  `is_accepted` BOOLEAN NOT NULL DEFAULT FALSE,
  `accepted_at` DATETIME NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  UNIQUE KEY `unique_user_agreement_version` (`user_id`, `agreement_type`, `version`),
  INDEX `idx_user_agreements_user_type` (`user_id`, `agreement_type`),
  INDEX `idx_user_agreements_type_version` (`agreement_type`, `version`),
  CONSTRAINT `fk_user_agreements_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add fields to users table
ALTER TABLE `users`
  ADD COLUMN `has_accepted_agreements` BOOLEAN NOT NULL DEFAULT FALSE AFTER `is_active`,
  ADD COLUMN `agreements_accepted_at` DATETIME NULL AFTER `has_accepted_agreements`;

-- Insert default agreements (example)
INSERT INTO `agreements` (`type`, `version`, `title`, `content`, `is_active`, `is_mandatory`, `published_at`) VALUES
('terms_of_service', '1.0', 'Пользовательское соглашение', '# Пользовательское соглашение\n\nТекст пользовательского соглашения...', TRUE, TRUE, NOW()),
('privacy_policy', '1.0', 'Политика конфиденциальности', '# Политика конфиденциальности\n\nТекст политики конфиденциальности...', TRUE, TRUE, NOW()),
('data_processing', '1.0', 'Согласие на обработку персональных данных', '# Согласие на обработку персональных данных\n\nТекст согласия...', TRUE, TRUE, NOW());

-- Note: Update the content field with actual agreement text in production

