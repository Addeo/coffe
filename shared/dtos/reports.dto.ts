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
  earnedAmount?: number; // Оплата за часы (calculatedAmount)
  carPayments?: number; // Оплата за авто (carUsageAmount)
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
  baseEarnings: number; // Обязательная часть (плановые часы * базовая ставка)
  overtimeEarnings: number;
  bonusEarnings: number;

  // Дополнительная информация
  completedOrders: number;
  averageHoursPerOrder: number;

  // Сравнение с предыдущим месяцем
  previousMonthHours?: number;
  previousMonthEarnings?: number;
  hoursGrowth?: number; // в процентах
  earningsGrowth?: number; // в процентах
}

// Новые DTO для расширенной аналитики
export interface TimeBasedDataPoint {
  date: string;
  value: number;
}

export interface EngineerTimeBasedData {
  engineerId: number;
  engineerName: string;
  data: TimeBasedDataPoint[];
}

export interface FinancialBreakdownData {
  engineerId: number;
  engineerName: string;
  fixedSalary: number;
  additionalEarnings: number;
  carPayment: number;
  totalEarnings: number;
}

export interface RankingData {
  engineerId: number;
  engineerName: string;
  value: number;
  rank: number;
}

export interface EfficiencyData {
  engineerId: number;
  engineerName: string;
  totalEarnings: number;
  totalHours: number;
  efficiency: number; // earnings per hour
}

export interface ForecastData {
  currentWorkPace: number; // per day
  monthEndForecast: number;
  growthPotential: number;
  actualData: TimeBasedDataPoint[];
  forecastData: TimeBasedDataPoint[];
}

// Комплексная статистика - все данные в одном ответе
export interface ComprehensiveStatisticsDto {
  // Базовая статистика
  year: number;
  month: number;
  monthName: string;
  agentEarnings: AgentEarningsData[];
  organizationEarnings: OrganizationEarningsData[];
  overtimeStatistics: OvertimeStatisticsData[];
  totalEarnings: number;
  totalOrders: number;
  totalOvertimeHours: number;

  // Временная аналитика
  timeBasedAnalytics?: {
    salaryChart: EngineerTimeBasedData[];
    hoursChart: EngineerTimeBasedData[];
  };

  // Детальная финансовая аналитика
  financialAnalytics?: {
    breakdown: FinancialBreakdownData[];
    monthlyComparison: {
      currentMonth: AgentEarningsData[];
      previousMonth: AgentEarningsData[];
    };
  };

  // Рейтинги и производительность
  rankings?: {
    topEarners: RankingData[];
    topByHours: RankingData[];
    efficiency: EfficiencyData[];
  };

  // Прогнозная аналитика
  forecast?: ForecastData;
}

export interface ComprehensiveStatisticsOptions {
  includeTimeBased: boolean;
  includeFinancial: boolean;
  includeRankings: boolean;
  includeForecast: boolean;
}
