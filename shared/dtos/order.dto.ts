import { OrderStatus, TerritoryType, OrderSource } from '../interfaces/order.interface';
import { FileResponseDto } from './file.dto';

export enum WorkResult {
  COMPLETED = 'completed',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled',
}

export interface WorkReportDto {
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
  startTime: Date;
  endTime: Date;
  totalHours: number;
  isOvertime: boolean;
  workResult: WorkResult;
  distanceKm?: number;
  territoryType?: TerritoryType;
  photoUrl?: string;
  notes?: string;
  calculatedAmount: number;
  carUsageAmount: number;
  organizationPayment: number; // Сумма, которую платит организация
  submittedAt: Date;
}

export interface CreateOrderDto {
  organizationId: number;
  title: string;
  description?: string;
  location: string;
  distanceKm?: number;
  territoryType?: TerritoryType;
  source?: OrderSource;
  plannedStartDate?: Date;
  files?: string[]; // Array of file IDs to attach
}

export interface UpdateOrderDto {
  organizationId?: number;
  title?: string;
  description?: string;
  location?: string;
  distanceKm?: number;
  territoryType?: TerritoryType;
  status?: OrderStatus;
  source?: OrderSource;
  plannedStartDate?: Date;
  actualStartDate?: Date;
  completionDate?: Date;
  assignedEngineerId?: number;
  assignedById?: number;
  files?: string[]; // Array of file IDs to attach
  // Work details
  regularHours?: number;
  overtimeHours?: number;
  calculatedAmount?: number;
  carUsageAmount?: number;
  organizationPayment?: number;
  workNotes?: string;
  workPhotoUrl?: string;
}

export interface AssignEngineerDto {
  engineerId: number;
}

export interface OrderDto {
  id: number;
  organizationId: number;
  organization?: {
    id: number;
    name: string;
  };
  assignedEngineerId?: number;
  assignedEngineer?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdById: number;
  createdBy: {
    id: number;
    firstName: string;
    lastName: string;
  };
  assignedById?: number;
  assignedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  title: string;
  description?: string;
  location: string;
  distanceKm?: number;
  territoryType?: TerritoryType;
  status: OrderStatus;
  source: OrderSource;
  plannedStartDate?: Date;
  actualStartDate?: Date;
  completionDate?: Date;
  // Work details
  regularHours?: number;
  overtimeHours?: number;
  calculatedAmount?: number;
  carUsageAmount?: number;
  organizationPayment?: number;
  workNotes?: string;
  workPhotoUrl?: string;
  files?: FileResponseDto[];
  workReports?: WorkReportDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrdersQueryDto {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  organizationId?: number;
  engineerId?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  source?: OrderSource;
  createdById?: number;
  search?: string; // search by title, description, or location
  territoryType?: TerritoryType;
  minDistanceKm?: number;
  maxDistanceKm?: number;
  plannedStartDateFrom?: Date;
  plannedStartDateTo?: Date;
  actualStartDateFrom?: Date;
  actualStartDateTo?: Date;
  completionDateFrom?: Date;
  completionDateTo?: Date;
  assignedById?: number;
}
