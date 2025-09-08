export enum OrderStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TerritoryType {
  URBAN = 'urban',
  SUBURBAN = 'suburban',
  RURAL = 'rural',
  HOME = 'home',        // домашняя территория (≤60 км)
  ZONE_1 = 'zone_1',    // 61-199 км (только для удаленного)
  ZONE_2 = 'zone_2',    // 200-250 км
  ZONE_3 = 'zone_3'     // >250 км
}

export enum EngineerType {
  STAFF = 'staff',      // штатный
  REMOTE = 'remote',    // удаленный
  CONTRACT = 'contract' // наемный
}

export interface Order {
  id: number;
  organizationId: number;
  organization?: Organization;
  assignedEngineerId?: number;
  assignedEngineer?: Engineer;
  createdById: number;
  createdBy: User;
  assignedById?: number;
  assignedBy?: User;
  title: string;
  description?: string;
  location: string;
  distanceKm?: number;
  territoryType?: TerritoryType;
  status: OrderStatus;
  plannedStartDate?: Date;
  actualStartDate?: Date;
  completionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: number;
  name: string;
  address?: string;
  phone?: string;
}

export interface Engineer {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string;
  specialization?: string;
  isActive: boolean;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}
