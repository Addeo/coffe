-- Initial database setup for Coffee Admin Panel
CREATE DATABASE IF NOT EXISTS coffee_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE coffee_admin;

-- Users table structure (matching User entity)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci UNIQUE NOT NULL,
  password VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  first_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  last_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  role ENUM('admin', 'manager', 'user') DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Organizations table structure (matching Organization entity)
CREATE TABLE IF NOT EXISTS organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci UNIQUE NOT NULL,
  base_rate DECIMAL(10,2) NOT NULL,
  overtime_multiplier DECIMAL(3,1) NULL,
  has_overtime BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default admin user
INSERT INTO users (email, password, first_name, last_name, role) VALUES
('admin@coffee.com', '$2b$10$sLBzpTHEx6GiLNIYaqJ/.Oh2BvarSaGQSJJasnrAhXuzc/ZqAQ.Yi', 'Admin', 'User', 'admin')
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  role = VALUES(role);

-- Insert organizations with their rates and overtime settings
INSERT INTO organizations (name, base_rate, overtime_multiplier, has_overtime, is_active) VALUES
('Вистекс', 900.00, 1.5, TRUE, TRUE),
('РусХолтс', 1100.00, NULL, FALSE, TRUE),
('ТО Франко', 1100.00, NULL, FALSE, TRUE),
('Холод Вистекс', 1200.00, 1.5, TRUE, TRUE),
('Франко', 1210.00, 1.5, TRUE, TRUE),
('Локальный Сервис', 1200.00, 1.5, TRUE, TRUE)
ON DUPLICATE KEY UPDATE
  base_rate = VALUES(base_rate),
  overtime_multiplier = VALUES(overtime_multiplier),
  has_overtime = VALUES(has_overtime),
  is_active = VALUES(is_active);
  

-- =====================================================
-- SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(50) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (`key`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- ENGINEERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS engineers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(20) NOT NULL,
  base_rate DECIMAL(10,2) NOT NULL,
  overtime_rate DECIMAL(10,2) NULL,
  plan_hours_month INT DEFAULT 160,
  home_territory_fixed_amount DECIMAL(10,2) DEFAULT 0,
  fixed_salary DECIMAL(10,2) DEFAULT 0,
  fixed_car_amount DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_id (user_id),
  INDEX idx_is_active (is_active),
  INDEX idx_type (type)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- ENGINEER ORGANIZATION RATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS engineer_organization_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  engineer_id INT NOT NULL,
  organization_id INT NOT NULL,
  custom_base_rate DECIMAL(10,2) NULL,
  custom_overtime_rate DECIMAL(10,2) NULL,
  custom_zone1_extra DECIMAL(10,2) NULL,
  custom_zone2_extra DECIMAL(10,2) NULL,
  custom_zone3_extra DECIMAL(10,2) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY uk_engineer_organization (engineer_id, organization_id),
  INDEX idx_engineer (engineer_id),
  INDEX idx_organization (organization_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  assigned_engineer_id INT NULL,
  created_by INT NOT NULL,
  assigned_by INT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  location VARCHAR(255) NOT NULL,
  distance_km DECIMAL(8,2) NULL,
  territory_type VARCHAR(20) NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  source VARCHAR(20) DEFAULT 'manual',
  planned_start_date DATE NULL,
  actual_start_date DATETIME NULL,
  completion_date DATETIME NULL,
  regular_hours DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  calculated_amount DECIMAL(10,2) DEFAULT 0,
  car_usage_amount DECIMAL(10,2) DEFAULT 0,
  organization_payment DECIMAL(10,2) DEFAULT 0,
  engineer_base_rate DECIMAL(10,2) NULL,
  engineer_overtime_rate DECIMAL(10,2) NULL,
  organization_base_rate DECIMAL(10,2) NULL,
  organization_overtime_multiplier DECIMAL(5,2) NULL,
  regular_payment DECIMAL(10,2) NULL,
  overtime_payment DECIMAL(10,2) NULL,
  organization_regular_payment DECIMAL(10,2) NULL,
  organization_overtime_payment DECIMAL(10,2) NULL,
  profit DECIMAL(10,2) NULL,
  work_notes TEXT NULL,
  work_photo_url VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_engineer_id) REFERENCES engineers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_assigned_engineer_status (assigned_engineer_id, status),
  INDEX idx_created_by_status (created_by, status),
  INDEX idx_status_created (status, created_at),
  INDEX idx_organization (organization_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- FILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS files (
  id VARCHAR(36) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mimetype VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  path VARCHAR(500) NULL,
  file_data LONGBLOB NULL,
  type VARCHAR(20) DEFAULT 'other',
  description TEXT NULL,
  uploaded_by INT NOT NULL,
  order_id INT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_uploaded_by (uploaded_by),
  INDEX idx_order (order_id),
  INDEX idx_type (type)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'unread',
  priority VARCHAR(20) DEFAULT 'medium',
  metadata JSON NULL,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_type (type),
  INDEX idx_created (created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- SALARY CALCULATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS salary_calculations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  engineer_id INT NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  planned_hours INT DEFAULT 160,
  actual_hours DECIMAL(8,2) DEFAULT 0,
  overtime_hours DECIMAL(8,2) DEFAULT 0,
  base_amount DECIMAL(10,2) DEFAULT 0,
  overtime_amount DECIMAL(10,2) DEFAULT 0,
  bonus_amount DECIMAL(10,2) DEFAULT 0,
  car_usage_amount DECIMAL(10,2) DEFAULT 0,
  fixed_salary DECIMAL(10,2) DEFAULT 0,
  fixed_car_amount DECIMAL(10,2) DEFAULT 0,
  additional_earnings DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  client_revenue DECIMAL(12,2) DEFAULT 0,
  profit_margin DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  calculated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE,
  FOREIGN KEY (calculated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uk_engineer_month_year (engineer_id, month, year),
  INDEX idx_month_year (month, year),
  INDEX idx_status (status)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- USER ACTIVITY LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata JSON NULL,
  performed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_activity_created (activity_type, created_at),
  INDEX idx_performed_by (performed_by)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NULL,
  is_active BOOLEAN DEFAULT TRUE,
  stock_quantity INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_category (category),
  INDEX idx_is_active (is_active)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO settings (`key`, value, description) VALUES
('auto_distribution_enabled', 'false', 'Enable automatic order distribution to engineers'),
('max_orders_per_engineer', '10', 'Maximum number of active orders per engineer')
ON DUPLICATE KEY UPDATE
  value = VALUES(value),
  description = VALUES(description);

-- Set database and connection charset
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
