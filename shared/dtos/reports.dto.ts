export interface EngineerSalaryChartData {
  engineerId: number;
  engineerName: string;
  data: { date: string; salary: number }[];
}

export interface EngineerHoursChartData {
  engineerId: number;
  engineerName: string;
  data: { date: string; hours: number }[];
}

export interface ReportsQueryDto {
  month?: number;
  year?: number;
  engineerIds?: number[];
}

export interface ReportsApiResponse<T> {
  success: boolean;
  data: T;
}

// Statistics DTOs for admin/manager dashboard
export interface AgentEarningsData {
  agentId: number;
  agentName: string;
  totalEarnings: number;
  completedOrders: number;
  averageOrderValue: number;
}

export interface OrganizationEarningsData {
  organizationId: number;
  organizationName: string;
  totalRevenue: number; // Выручка от организации (часы × ставка организации)
  totalCosts: number; // Затраты на инженеров (часы × ставка инженера)
  totalProfit: number; // Прибыль (выручка - затраты)
  profitMargin: number; // Маржа прибыли в процентах
  totalOrders: number;
  totalHours: number;
  averageOrderValue: number;
}

export interface OvertimeStatisticsData {
  agentId: number;
  agentName: string;
  overtimeHours: number;
  regularHours: number;
  totalHours: number;
  overtimePercentage: number;
}

export interface MonthlyStatisticsDto {
  year: number;
  month: number;
  monthName: string;
  agentEarnings: AgentEarningsData[];
  organizationEarnings: OrganizationEarningsData[];
  overtimeStatistics: OvertimeStatisticsData[];
  totalEarnings: number;
  totalOrders: number;
  totalOvertimeHours: number;
}

export interface StatisticsQueryDto {
  year?: number;
  month?: number;
}

// Детальная статистика для инженера
export interface EngineerDetailedStatsDto {
  // Основная информация
  engineerId: number;
  engineerName: string;
  month: number;
  year: number;
  
  // Информация о часах
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  
  // Финансовая информация
  totalEarnings: number;
  baseEarnings: number;  // Обязательная часть (плановые часы * базовая ставка)
  overtimeEarnings: number;
  bonusEarnings: number;
  
  // Дополнительная информация
  completedOrders: number;
  averageHoursPerOrder: number;
  
  // Сравнение с предыдущим месяцем
  previousMonthHours?: number;
  previousMonthEarnings?: number;
  hoursGrowth?: number;  // в процентах
  earningsGrowth?: number;  // в процентах
}
