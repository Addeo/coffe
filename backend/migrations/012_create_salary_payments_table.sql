-- Migration: Create salary_payments table
-- Purpose: Track salary payments to engineers
-- Date: 2025-12-02

CREATE TABLE IF NOT EXISTS salary_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  engineer_id INT NOT NULL,
  salary_calculation_id INT NULL,
  month INT NULL COMMENT 'Payment month (1-12) for advances',
  year INT NULL COMMENT 'Payment year for advances',
  amount DECIMAL(10, 2) NOT NULL COMMENT 'Payment amount',
  type VARCHAR(20) DEFAULT 'regular' COMMENT 'Payment type: advance, regular, bonus, adjustment',
  method VARCHAR(20) DEFAULT 'bank_transfer' COMMENT 'Payment method: cash, bank_transfer, card, other',
  status VARCHAR(20) DEFAULT 'completed' COMMENT 'Payment status: pending, completed, cancelled',
  payment_date DATE NOT NULL COMMENT 'Actual payment date',
  notes TEXT NULL COMMENT 'Additional notes',
  paid_by INT NULL COMMENT 'User who made the payment',
  document_number VARCHAR(255) NULL COMMENT 'Document number for accounting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_salary_payment_engineer
    FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE CASCADE,
  
  CONSTRAINT fk_salary_payment_calculation
    FOREIGN KEY (salary_calculation_id) REFERENCES salary_calculations(id) ON DELETE SET NULL,
  
  CONSTRAINT fk_salary_payment_paid_by
    FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_engineer_payment_date (engineer_id, payment_date),
  INDEX idx_payment_date (payment_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tracks salary payments to engineers';
