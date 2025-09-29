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

