import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SalaryCalculation } from '../../entities/salary-calculation.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { Engineer } from '../../entities/engineer.entity';

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

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(SalaryCalculation)
    private salaryCalculationRepository: Repository<SalaryCalculation>,
    @InjectRepository(WorkReport)
    private workReportRepository: Repository<WorkReport>,
    @InjectRepository(Engineer)
    private engineerRepository: Repository<Engineer>,
  ) {}

  /**
   * Получение данных для графика зарплат инженеров за месяц
   */
  async getEngineerSalariesChart(
    month?: number,
    year?: number,
    engineerIds?: number[]
  ): Promise<EngineerSalaryChartData[]> {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    // Получить всех активных инженеров или только выбранных
    const engineersQuery = this.engineerRepository.createQueryBuilder('engineer')
      .leftJoinAndSelect('engineer.user', 'user')
      .where('engineer.isActive = :isActive', { isActive: true });

    if (engineerIds && engineerIds.length > 0) {
      engineersQuery.andWhere('engineer.id IN (:...engineerIds)', { engineerIds });
    }

    const engineers = await engineersQuery.getMany();

    const result: EngineerSalaryChartData[] = [];

    for (const engineer of engineers) {
      const chartData = await this.getEngineerSalaryChartData(engineer, targetMonth, targetYear);
      if (chartData.data.length > 0) {
        result.push(chartData);
      }
    }

    return result;
  }

  /**
   * Получение данных для графика часов инженеров за месяц
   */
  async getEngineerHoursChart(
    month?: number,
    year?: number,
    engineerIds?: number[]
  ): Promise<EngineerHoursChartData[]> {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    // Получить всех активных инженеров или только выбранных
    const engineersQuery = this.engineerRepository.createQueryBuilder('engineer')
      .leftJoinAndSelect('engineer.user', 'user')
      .where('engineer.isActive = :isActive', { isActive: true });

    if (engineerIds && engineerIds.length > 0) {
      engineersQuery.andWhere('engineer.id IN (:...engineerIds)', { engineerIds });
    }

    const engineers = await engineersQuery.getMany();

    const result: EngineerHoursChartData[] = [];

    for (const engineer of engineers) {
      const chartData = await this.getEngineerHoursChartData(engineer, targetMonth, targetYear);
      if (chartData.data.length > 0) {
        result.push(chartData);
      }
    }

    return result;
  }

  /**
   * Получение данных зарплат для одного инженера
   */
  private async getEngineerSalaryChartData(
    engineer: Engineer,
    month: number,
    year: number
  ): Promise<EngineerSalaryChartData> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Получить все расчеты зарплат за месяц
    const calculations = await this.salaryCalculationRepository.find({
      where: {
        engineerId: engineer.id,
        month,
        year,
      },
      order: { createdAt: 'ASC' },
    });

    // Создать карту дат для накопления
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyData = new Map<string, number>();

    // Инициализировать все дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      dailyData.set(dateStr, 0);
    }

    // Накопительно суммировать зарплату
    let accumulatedSalary = 0;
    calculations.forEach(calculation => {
      accumulatedSalary += Number(calculation.totalAmount);
      const dateStr = calculation.createdAt.toISOString().split('T')[0];
      if (dailyData.has(dateStr)) {
        dailyData.set(dateStr, accumulatedSalary);
      }
    });

    // Заполнить пропущенные дни последним значением
    let lastValue = 0;
    const data: { date: string; salary: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const currentValue = dailyData.get(dateStr) || lastValue;
      data.push({
        date: dateStr,
        salary: currentValue,
      });
      lastValue = currentValue;
    }

    return {
      engineerId: engineer.id,
      engineerName: engineer.user ? `${engineer.user.firstName} ${engineer.user.lastName}` : 'Unknown',
      data,
    };
  }

  /**
   * Получение данных часов для одного инженера
   */
  private async getEngineerHoursChartData(
    engineer: Engineer,
    month: number,
    year: number
  ): Promise<EngineerHoursChartData> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Получить все work reports за месяц
    const workReports = await this.workReportRepository
      .createQueryBuilder('workReport')
      .where('workReport.engineerId = :engineerId', { engineerId: engineer.id })
      .andWhere('workReport.startTime >= :startDate', { startDate })
      .andWhere('workReport.startTime < :endDate', { endDate })
      .orderBy('workReport.startTime', 'ASC')
      .getMany();

    // Создать карту дат для накопления
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyData = new Map<string, number>();

    // Инициализировать все дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      dailyData.set(dateStr, 0);
    }

    // Накопительно суммировать часы
    let accumulatedHours = 0;
    workReports.forEach(report => {
      accumulatedHours += Number(report.totalHours);
      const dateStr = report.startTime.toISOString().split('T')[0];
      if (dailyData.has(dateStr)) {
        dailyData.set(dateStr, accumulatedHours);
      }
    });

    // Заполнить пропущенные дни последним значением
    let lastValue = 0;
    const data: { date: string; hours: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const currentValue = dailyData.get(dateStr) || lastValue;
      data.push({
        date: dateStr,
        hours: currentValue,
      });
      lastValue = currentValue;
    }

    return {
      engineerId: engineer.id,
      engineerName: engineer.user ? `${engineer.user.firstName} ${engineer.user.lastName}` : 'Unknown',
      data,
    };
  }
}

