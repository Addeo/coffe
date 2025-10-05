export interface CreateEngineerOrganizationRateDto {
  engineerId: number;
  organizationId: number;
  customBaseRate?: number;
  customOvertimeRate?: number;
  customOvertimeMultiplier?: number;
  customFixedSalary?: number;
  customFixedCarAmount?: number;
  customCarKmRate?: number;
  customZone1Extra?: number;
  customZone2Extra?: number;
  customZone3Extra?: number;
}

export interface UpdateEngineerOrganizationRateDto {
  customBaseRate?: number;
  customOvertimeRate?: number;
  customOvertimeMultiplier?: number;
  customFixedSalary?: number;
  customFixedCarAmount?: number;
  customCarKmRate?: number;
  customZone1Extra?: number;
  customZone2Extra?: number;
  customZone3Extra?: number;
  isActive?: boolean;
}

export interface EngineerOrganizationRateDto {
  id: number;
  engineerId: number;
  organizationId: number;
  organizationName?: string; // Для удобства отображения
  customBaseRate?: number;
  customOvertimeRate?: number;
  customOvertimeMultiplier?: number;
  customFixedSalary?: number;
  customFixedCarAmount?: number;
  customCarKmRate?: number;
  customZone1Extra?: number;
  customZone2Extra?: number;
  customZone3Extra?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EngineerOrganizationRatesQueryDto {
  engineerId?: number;
  organizationId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

