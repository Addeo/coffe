import { User } from './user.interface';

export enum OrderStatus {
  WAITING = 'waiting', // в ожидании (не назначен)
  ASSIGNED = 'assigned', // назначен инженеру (ожидает принятия)
  PROCESSING = 'processing', // в обработке
  WORKING = 'working', // в работе (принят инженером)
  REVIEW = 'review', // на проверке
  COMPLETED = 'completed', // законченный
}

export enum OrderStatusLabel {
  WAITING = 'Waiting',
  ASSIGNED = 'Assigned',
  PROCESSING = 'Processing',
  WORKING = 'In Progress',
  REVIEW = 'Under Review',
  COMPLETED = 'Completed',
}

export enum TerritoryType {
  URBAN = 'urban',
  SUBURBAN = 'suburban',
  RURAL = 'rural',
  HOME = 'home', // домашняя территория (≤60 км)
  ZONE_1 = 'zone_1', // 61-199 км (только для удаленного)
  ZONE_2 = 'zone_2', // 200-250 км
  ZONE_3 = 'zone_3', // >250 км
}

export enum EngineerType {
  STAFF = 'staff', // штатный
  CONTRACT = 'contract', // наемный
}

export enum OrderSource {
  MANUAL = 'manual', // создан вручную
  AUTOMATIC = 'automatic', // создан автоматически через интеграцию
  EMAIL = 'email', // создан из email
  API = 'api', // создан через API
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
  source: OrderSource;
  plannedStartDate?: Date;
  actualStartDate?: Date;
  completionDate?: Date;
  
  // Work execution details
  workActNumber?: string; // Номер Акта выполненных работ
  workStartTime?: Date; // Время начала работ
  workEndTime?: Date; // Время окончания работ
  totalWorkHours?: number; // Общее время на объекте (автоматически рассчитывается)
  isOvertimeRate?: boolean; // Внеурочный тариф (флаг)
  isRepairComplete?: boolean; // Ремонт завершен (true = галочка, false = крестик)
  equipmentInfo?: string; // Оборудование (название и серийный номер)
  comments?: string; // Дополнительная информация по заявке
  isIncomplete?: boolean; // Отметка "!" для незавершенных работ
  completionLockedAt?: Date; // Дата блокировки редактирования (24 часа после завершения)
  
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
