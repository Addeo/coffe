-- Initial database setup for Coffee Admin Panel
CREATE DATABASE IF NOT EXISTS coffee_admin;
USE coffee_admin;

-- Users table structure (matching User entity)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role ENUM('admin', 'manager', 'user') DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Organizations table structure (matching Organization entity)
CREATE TABLE IF NOT EXISTS organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  base_rate DECIMAL(10,2) NOT NULL,
  overtime_multiplier DECIMAL(3,1) NULL,
  has_overtime BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO users (email, password, first_name, last_name, role) VALUES
('admin@coffee.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin')
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
