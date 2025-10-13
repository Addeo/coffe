-- Migration: Create salary payments and balances tables
-- Date: 2025-10-12
-- Description: Adds tables for tracking salary payments and engineer balances

-- =============================================
-- Table: salary_payments
-- =============================================
CREATE TABLE IF NOT EXISTS salary_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- References
  engineer_id INT NOT NULL,
  salary_calculation_id INT NULL,
  
  -- Period
  month INT NULL,
  year INT NULL,
  
  -- Payment info
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'regular',
  method VARCHAR(20) NOT NULL DEFAULT 'bank_transfer',
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  payment_date DATE NOT NULL,
  
  -- Additional info
  notes TEXT NULL,
  document_number VARCHAR(100) NULL,
  
  -- Audit
  paid_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE,
  FOREIGN KEY (salary_calculation_id) REFERENCES salary_calculations(id) ON DELETE SET NULL,
  FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_engineer_payment_date (engineer_id, payment_date),
  INDEX idx_payment_date (payment_date),
  INDEX idx_status (status),
  INDEX idx_calculation (salary_calculation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: engineer_balances
-- =============================================
CREATE TABLE IF NOT EXISTS engineer_balances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Reference (unique per engineer)
  engineer_id INT NOT NULL UNIQUE,
  
  -- Balance info
  total_accrued DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Last activity dates
  last_accrual_date DATE NULL,
  last_payment_date DATE NULL,
  last_calculated_at DATETIME NULL,
  
  -- Audit
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_engineer (engineer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SQLite version (for development)
-- =============================================
-- If running on SQLite, use this instead:

/*
CREATE TABLE IF NOT EXISTS salary_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  engineer_id INTEGER NOT NULL,
  salary_calculation_id INTEGER NULL,
  month INTEGER NULL,
  year INTEGER NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'regular',
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  status TEXT NOT NULL DEFAULT 'completed',
  payment_date TEXT NOT NULL,
  notes TEXT NULL,
  document_number TEXT NULL,
  paid_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE,
  FOREIGN KEY (salary_calculation_id) REFERENCES salary_calculations(id) ON DELETE SET NULL,
  FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sp_engineer_payment_date ON salary_payments(engineer_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_sp_payment_date ON salary_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_sp_status ON salary_payments(status);
CREATE INDEX IF NOT EXISTS idx_sp_calculation ON salary_payments(salary_calculation_id);

CREATE TABLE IF NOT EXISTS engineer_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  engineer_id INTEGER NOT NULL UNIQUE,
  total_accrued REAL NOT NULL DEFAULT 0,
  total_paid REAL NOT NULL DEFAULT 0,
  balance REAL NOT NULL DEFAULT 0,
  last_accrual_date TEXT NULL,
  last_payment_date TEXT NULL,
  last_calculated_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eb_engineer ON engineer_balances(engineer_id);
*/

