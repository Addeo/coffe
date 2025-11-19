export enum WorkSessionStatus {
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface CreateWorkSessionDto {
  workDate: Date | string;
  regularHours: number;
  overtimeHours: number;
  carPayment: number;
  distanceKm?: number;
  territoryType?: string;
  notes?: string;
  photoUrl?: string;
  canBeInvoiced?: boolean;
}

export interface UpdateWorkSessionDto {
  workDate?: Date | string;
  regularHours?: number;
  overtimeHours?: number;
  carPayment?: number;
  distanceKm?: number;
  territoryType?: string;
  notes?: string;
  photoUrl?: string;
  canBeInvoiced?: boolean;
}

export interface WorkSessionDto {
  id: number;
  orderId: number;
  engineerId: number;
  engineer?: {
    id: number;
    user?: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  workDate: Date | string;
  regularHours: number;
  overtimeHours: number;
  calculatedAmount: number;
  carUsageAmount: number;

  // Ставки (для аудита)
  engineerBaseRate: number;
  engineerOvertimeCoefficient: number; // коэффициент для сверхурочных (например, 1.6)

  // Оплата от организации
  organizationPayment: number;
  organizationBaseRate: number;
  organizationOvertimeCoefficient: number; // коэффициент для сверхурочных от организации

  // Legacy fields - удалить после миграции
  engineerOvertimeRate?: number;
  organizationOvertimeMultiplier?: number;

  // Разбивка оплат
  regularPayment: number;
  overtimePayment: number;
  organizationRegularPayment: number;
  organizationOvertimePayment: number;
  profit: number;

  // Детали работы
  distanceKm?: number;
  territoryType?: string;
  notes?: string;
  photoUrl?: string;

  status: WorkSessionStatus;
  canBeInvoiced: boolean;

  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WorkSessionSummaryDto {
  totalSessions: number;
  totalHours: number; // ВАЖНО: regularHours + (overtimeHours * coefficient)
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalOvertimeCoefficient: number; // средний коэффициент сверхурочных
  totalPayment: number;
  totalCarUsage: number;
}
