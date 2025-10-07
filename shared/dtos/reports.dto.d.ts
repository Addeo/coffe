export interface EngineerSalaryChartData {
    engineerId: number;
    engineerName: string;
    data: {
        date: string;
        salary: number;
    }[];
}
export interface EngineerHoursChartData {
    engineerId: number;
    engineerName: string;
    data: {
        date: string;
        hours: number;
    }[];
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
    totalEarnings: number;
    totalOrders: number;
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
