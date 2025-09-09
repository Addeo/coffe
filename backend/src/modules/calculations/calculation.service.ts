import { Injectable } from '@nestjs/common';
import { Engineer } from '../../entities/engineer.entity';
import { Organization } from '../../entities/organization.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { EngineerType, TerritoryType } from '../../../shared/interfaces/order.interface';

@Injectable()
export class CalculationService {
  /**
   * Calculate work hours with rounding up to 0.25 hours
   */
  calculateWorkHours(startTime: Date, endTime: Date): number {
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.ceil(diffHours * 4) / 4;
  }

  /**
   * Расчет оплаты инженера за работу
   */
  calculateEngineerPayment(
    engineer: Engineer,
    organization: Organization,
    hours: number,
    isOvertime: boolean
  ): number {
    let rate = engineer.baseRate;

    if (isOvertime) {
      switch (engineer.type) {
        case EngineerType.STAFF:
          rate = this.applyStaffOvertimeMultiplier(rate, organization);
          break;
        case EngineerType.REMOTE:
          rate = this.applyRemoteOvertimeMultiplier(rate, organization);
          break;
        case EngineerType.CONTRACT:
          rate = this.getContractOvertimeRate(organization);
          break;
      }
    }

    return hours * rate;
  }

  /**
   * Коэффициенты внеурочного времени для штатного инженера
   */
  private applyStaffOvertimeMultiplier(rate: number, organization: Organization): number {
    const multipliers: { [key: string]: number } = {
      Вистекс: 1.6,
      'Холод Вистекс': 1.8,
      Франко: 1.8,
      'Локальный Сервис': 1.8,
    };

    const multiplier = multipliers[organization.name] || 1;
    return rate * multiplier;
  }

  /**
   * Коэффициенты внеурочного времени для удаленного инженера
   */
  private applyRemoteOvertimeMultiplier(rate: number, organization: Organization): number {
    return this.applyStaffOvertimeMultiplier(rate, organization);
  }

  /**
   * Фиксированные ставки внеурочного времени для наемного инженера
   */
  private getContractOvertimeRate(organization: Organization): number {
    const rates: { [key: string]: number } = {
      Вистекс: 1200,
      'Холод Вистекс': 1400,
      Франко: 1200,
      'Локальный Сервис': 1200,
    };

    return rates[organization.name] || 700; // fallback to base rate
  }

  /**
   * Расчет эксплуатации автомобиля
   */
  calculateCarUsage(engineer: Engineer, distanceKm: number): number {
    if (engineer.type === EngineerType.CONTRACT) {
      // 14 руб/км для наемных инженеров
      return distanceKm * 14;
    }

    // Для штатного и удаленного инженеров
    let amount = engineer.homeTerritoryFixedAmount;

    if (distanceKm <= 60) {
      // Домашняя территория - только фиксированная сумма
      return amount;
    }

    // Дополнительные суммы за зоны
    if (engineer.type === EngineerType.REMOTE) {
      if (distanceKm <= 199) {
        amount += 1000; // Территория 1
      } else if (distanceKm <= 250) {
        amount += 1500; // Территория 2
      } else {
        amount += 2000; // Территория 3
      }
    } else {
      // Штатный инженер
      if (distanceKm <= 250) {
        amount += 1500; // Территория 2
      } else {
        amount += 2000; // Территория 3
      }
    }

    return amount;
  }

  /**
   * Расчет месячной зарплаты инженера
   */
  calculateMonthlySalary(
    engineer: Engineer,
    workReports: WorkReport[],
    plannedHours: number
  ): {
    actualHours: number;
    overtimeHours: number;
    baseAmount: number;
    overtimeAmount: number;
    bonusAmount: number;
    carUsageAmount: number;
    totalAmount: number;
  } {
    let actualHours = 0;
    let overtimeHours = 0;
    let baseAmount = 0;
    let overtimeAmount = 0;
    let carUsageAmount = 0;

    // Расчет по каждому отчету
    for (const report of workReports) {
      actualHours += report.totalHours;

      if (report.isOvertime) {
        overtimeHours += report.totalHours;
        overtimeAmount += report.calculatedAmount;
      } else {
        baseAmount += report.calculatedAmount;
      }

      carUsageAmount += report.carUsageAmount;
    }

    // Расчет премии за переработку (только для штатного и удаленного)
    let bonusAmount = 0;
    if (engineer.type !== EngineerType.CONTRACT && actualHours > plannedHours) {
      const bonusHours = actualHours - plannedHours;
      const bonusRate = engineer.type === EngineerType.STAFF ? 700 : 650;
      bonusAmount = bonusHours * bonusRate;
    }

    const totalAmount = baseAmount + overtimeAmount + bonusAmount + carUsageAmount;

    return {
      actualHours,
      overtimeHours,
      baseAmount,
      overtimeAmount,
      bonusAmount,
      carUsageAmount,
      totalAmount,
    };
  }

  /**
   * Расчет дохода от заказчика
   */
  calculateClientRevenue(organization: Organization, hours: number, isOvertime: boolean): number {
    let rate = organization.baseRate;

    if (isOvertime && organization.hasOvertime) {
      rate *= organization.overtimeMultiplier;
    }

    return hours * rate;
  }

  /**
   * Определение типа территории по расстоянию
   */
  getTerritoryType(distanceKm: number, engineerType: EngineerType): TerritoryType {
    if (distanceKm <= 60) return TerritoryType.HOME;
    if (distanceKm <= 199 && engineerType === EngineerType.REMOTE) return TerritoryType.ZONE_1;
    if (distanceKm <= 250) return TerritoryType.ZONE_2;
    return TerritoryType.ZONE_3;
  }

  /**
   * Определение сверхурочного времени
   */
  isOvertimeWork(startTime: Date, endTime: Date, engineerType: EngineerType): boolean {
    const hours = this.calculateWorkHours(startTime, endTime);
    const dayOfWeek = startTime.getDay(); // 0 = Sunday, 6 = Saturday

    // Работа в выходные всегда считается сверхурочной
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }

    // Для наемных инженеров - любая работа считается по фиксированной ставке
    if (engineerType === EngineerType.CONTRACT) {
      return false; // Наемные всегда работают по фиксированной ставке
    }

    // Сверхурочное время после 8 часов в день
    const dailyHours = this.getDailyHoursWorked(startTime, hours);
    return dailyHours > 8;
  }

  /**
   * Получение часов работы за день (упрощенная версия)
   */
  private getDailyHoursWorked(workDate: Date, hours: number): number {
    // В реальном приложении здесь должен быть запрос к БД
    // для получения всех часов работы инженера за этот день
    // Пока возвращаем переданные часы как базовое значение
    return hours;
  }

  /**
   * Расчет транспорта с учетом типа территории
   */
  calculateTransportByTerritory(engineer: Engineer, territoryType: TerritoryType): number {
    if (engineer.type === EngineerType.CONTRACT) {
      // Для наемных расчет по километражу не нужен - они получают фиксированную ставку
      return 0;
    }

    // Фиксированная сумма за домашнюю территорию
    let amount = engineer.homeTerritoryFixedAmount;

    // Дополнительные суммы за зоны
    switch (territoryType) {
      case TerritoryType.ZONE_1:
        if (engineer.type === EngineerType.REMOTE) {
          amount += 1000;
        }
        break;
      case TerritoryType.ZONE_2:
        amount += 1500;
        break;
      case TerritoryType.ZONE_3:
        amount += 2000;
        break;
      case TerritoryType.HOME:
      default:
        // Только фиксированная сумма
        break;
    }

    return amount;
  }

  /**
   * Расчет полной стоимости работы (включая транспорт)
   */
  calculateWorkReportTotals(
    engineer: Engineer,
    organization: Organization,
    workReport: WorkReport
  ): { calculatedAmount: number; carUsageAmount: number; isOvertime: boolean } {
    // Определение сверхурочного времени
    const isOvertime = this.isOvertimeWork(
      workReport.startTime,
      workReport.endTime,
      engineer.type
    );

    // Расчет оплаты за работу
    const calculatedAmount = this.calculateEngineerPayment(
      engineer,
      organization,
      workReport.totalHours,
      isOvertime
    );

    // Расчет транспорта
    let carUsageAmount = 0;
    if (workReport.distanceKm && workReport.territoryType) {
      if (engineer.type === EngineerType.CONTRACT) {
        // Для наемных - по километражу
        carUsageAmount = workReport.distanceKm * 14;
      } else {
        // Для штатных и удаленных - по зонам
        carUsageAmount = this.calculateTransportByTerritory(engineer, workReport.territoryType);
      }
    }

    return {
      calculatedAmount,
      carUsageAmount,
      isOvertime
    };
  }

  /**
   * Проверка превышения месячной нормы часов
   */
  checkMonthlyOvertime(engineer: Engineer, totalMonthlyHours: number): boolean {
    if (engineer.type === EngineerType.CONTRACT) {
      return false; // Наемные работают без месячной нормы
    }

    return totalMonthlyHours > engineer.planHoursMonth;
  }
}
