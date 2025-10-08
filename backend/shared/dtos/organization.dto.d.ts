export interface OrganizationDto {
  id: number;
  name: string;
  baseRate: number;
  overtimeMultiplier?: number;
  hasOvertime: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface CreateOrganizationDto {
  name: string;
  baseRate: number;
  overtimeMultiplier?: number;
  hasOvertime?: boolean;
}
export interface UpdateOrganizationDto {
  name?: string;
  baseRate?: number;
  overtimeMultiplier?: number;
  hasOvertime?: boolean;
  isActive?: boolean;
}
export interface OrganizationsQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  hasOvertime?: boolean;
  minBaseRate?: number;
  maxBaseRate?: number;
  minOvertimeMultiplier?: number;
  maxOvertimeMultiplier?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
