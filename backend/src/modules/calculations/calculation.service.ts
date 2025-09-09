import { Injectable } from '@nestjs/common';
import { Engineer } from '../../entities/engineer.entity';
import { Organization } from '../../entities/organization.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { EngineerType } from '../../../shared/interfaces/order.interface';

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
  getTerritoryType(distanceKm: number, engineerType: EngineerType): string {
    if (distanceKm <= 60) return 'home';
    if (distanceKm <= 199 && engineerType === EngineerType.REMOTE) return 'zone_1';
    if (distanceKm <= 250) return 'zone_2';
    return 'zone_3';
  }
}
