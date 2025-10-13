export enum PaymentType {
  ADVANCE = 'advance',
  REGULAR = 'regular',
  BONUS = 'bonus',
  ADJUSTMENT = 'adjustment',
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
  OTHER = 'other',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface SalaryPaymentDto {
  id: number;
  engineerId: number;
  engineerName?: string;
  salaryCalculationId: number | null;
  month: number | null;
  year: number | null;
  amount: number;
  type: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  notes: string | null;
  paidById: number | null;
  paidByName?: string;
  documentNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalaryPaymentDto {
  engineerId: number;
  salaryCalculationId?: number | null;
  month?: number | null;
  year?: number | null;
  amount: number;
  type: PaymentType;
  method: PaymentMethod;
  paymentDate: string;
  notes?: string;
  documentNumber?: string;
}

export interface UpdateSalaryPaymentDto {
  amount?: number;
  type?: PaymentType;
  method?: PaymentMethod;
  paymentDate?: string;
  notes?: string;
  documentNumber?: string;
  status?: PaymentStatus;
}

export interface EngineerBalanceDto {
  id: number;
  engineerId: number;
  engineerName?: string;
  totalAccrued: number;
  totalPaid: number;
  balance: number;
  lastAccrualDate: string | null;
  lastPaymentDate: string | null;
  lastCalculatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EngineerBalanceDetailDto extends EngineerBalanceDto {
  recentPayments: SalaryPaymentDto[];
  recentCalculations: {
    id: number;
    month: number;
    year: number;
    totalAmount: number;
    status: string;
    paidAmount: number;
    remainingAmount: number;
  }[];
}

