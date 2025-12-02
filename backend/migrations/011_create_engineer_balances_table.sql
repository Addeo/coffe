-- Migration: Create engineer_balances table
-- Purpose: Track accumulated earnings, payments, and balances for engineers
-- Date: 2025-12-02

CREATE TABLE IF NOT EXISTS engineer_balances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  engineer_id INT UNIQUE NOT NULL,
  total_accrued DECIMAL(12, 2) DEFAULT 0 COMMENT 'Total amount accrued to engineer',
  total_paid DECIMAL(12, 2) DEFAULT 0 COMMENT 'Total amount paid to engineer',
  balance DECIMAL(12, 2) DEFAULT 0 COMMENT 'Current balance (positive = owed to engineer, negative = overpayment)',
  last_accrual_date DATE NULL COMMENT 'Date of last accrual',
  last_payment_date DATE NULL COMMENT 'Date of last payment',
  last_calculated_at DATETIME NULL COMMENT 'Last time balance was recalculated',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_engineer_balance_engineer
    FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE,
  
  INDEX idx_engineer_id (engineer_id),
  INDEX idx_last_calculated (last_calculated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks engineer payment balances and history';
