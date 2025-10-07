export interface CreateEngineerOrganizationRateDto {
  engineerId: number;
  organizationId: number;
  customBaseRate?: number;
  customOvertimeRate?: number;
  customZone1Extra?: number;
  customZone2Extra?: number;
  customZone3Extra?: number;
}

export interface UpdateEngineerOrganizationRateDto {
  customBaseRate?: number;
  customOvertimeRate?: number;
  customZone1Extra?: number;
  customZone2Extra?: number;
  customZone3Extra?: number;
}

export interface EngineerOrganizationRateDto {
  id: number;
  engineerId: number;
  organizationId: number;
  organizationName?: string; // Для удобства отображения
  customBaseRate?: number;
  customOvertimeRate?: number;
  customZone1Extra?: number;
  customZone2Extra?: number;
  customZone3Extra?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EngineerOrganizationRatesQueryDto {
  engineerId?: number;
  organizationId?: number;
  page?: number;
  limit?: number;
}
