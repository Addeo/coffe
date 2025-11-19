export interface CreateEngineerOrganizationRateDto {
  engineerId: number;
  organizationId: number;
  customBaseRate?: number;
  customOvertimeCoefficient?: number; // коэффициент для сверхурочных (например, 1.6)
  customZone1Extra?: number;
  customZone2Extra?: number;
  customZone3Extra?: number;
  // Legacy field - удалить после миграции
  customOvertimeRate?: number;
}

export interface UpdateEngineerOrganizationRateDto {
  customBaseRate?: number;
  customOvertimeCoefficient?: number; // коэффициент для сверхурочных
  customZone1Extra?: number;
  customZone2Extra?: number;
  customZone3Extra?: number;
  // Legacy field - удалить после миграции
  customOvertimeRate?: number;
}

export interface EngineerOrganizationRateDto {
  id: number;
  engineerId: number;
  organizationId: number;
  organizationName?: string; // Для удобства отображения
  customBaseRate?: number;
  customOvertimeCoefficient?: number; // коэффициент для сверхурочных
  customZone1Extra?: number;
  customZone2Extra?: number;
  customZone3Extra?: number;
  createdAt: Date;
  updatedAt: Date;
  // Legacy field - удалить после миграции
  customOvertimeRate?: number;
}

export interface EngineerOrganizationRatesQueryDto {
  engineerId?: number;
  organizationId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
