-- Migration: Add documents table
-- Description: Creates documents table for company documents management
-- Date: 2024-11-17

-- Create documents table
CREATE TABLE IF NOT EXISTS `documents` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `category` ENUM('rules', 'terms', 'regulations', 'other') NOT NULL DEFAULT 'other',
  `file_id` VARCHAR(36) NOT NULL,
  `created_by` INT NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_documents_category` (`category`),
  INDEX `idx_documents_file_id` (`file_id`),
  INDEX `idx_documents_created_by` (`created_by`),
  INDEX `idx_documents_created_at` (`created_at`),
  CONSTRAINT `fk_documents_file` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_documents_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

