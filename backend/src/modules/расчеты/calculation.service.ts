import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Engineer } from '../../entities/engineer.entity';
import { Organization } from '../../entities/organization.entity';
import { WorkReport } from '../../entities/work-report.entity';
import { EngineerOrganizationRate } from '../../entities/engineer-organization-rate.entity';
import { EngineerType, TerritoryType } from '../../../shared/interfaces/order.interface';

export interface EngineerRates {
  baseRate: number;
  overtimeRate?: number;
  overtimeMultiplier?: number;
  fixedSalary: number;
  fixedCarAmount: number;
  carKmRate?: number;
  zone1Extra?: number;
  zone2Extra?: number;
  zone3Extra?: number;
}

@Injectable()
export class CalculationService {
  constructor(
    @InjectRepository(EngineerOrganizationRate)
    private engineerOrganizationRateRepository: Repository<EngineerOrganizationRate>
  ) {}

  /**
   * Получить ставки инженера для конкретной организации
   * ОБЯЗАТЕЛЬНО должны быть установлены индивидуальные ставки администратором
   * Без индивидуальных ставок расчет невозможен
   */
  async getEngineerRatesForOrganization(
    engineer: Engineer,
    organization: Organization
  ): Promise<EngineerRates> {
    // Ищем индивидуальные ставки для этой пары инженер-организация
    const customRate = await this.engineerOrganizationRateRepository.findOne({
      where: {
        engineerId: engineer.id,
        organizationId: organization.id,
        isActive: true,
      },
    });

    // Если индивидуальные ставки не установлены - выбрасываем ошибку
    // Расчет невозможен без явного указания ставок администратором
    if (!customRate) {
      throw new Error(
        `Individual rates not set for engineer ${engineer.user?.firstName} ${engineer.user?.lastName} ` +
          `and organization ${organization.name}. Please contact administrator to set rates.`
      );
    }

    // Формируем итоговые ставки на основе индивидуальных настроек
    // Некоторые поля могут быть не заполнены (null), что нормально
    const rates: EngineerRates = {
      baseRate: customRate.customBaseRate ?? engineer.baseRate,
      overtimeRate: customRate.customOvertimeRate ?? engineer.overtimeRate,
      overtimeMultiplier: customRate.customOvertimeMultiplier ?? undefined,
      fixedSalary: customRate.customFixedSalary ?? engineer.fixedSalary,
      fixedCarAmount: customRate.customFixedCarAmount ?? engineer.fixedCarAmount,
      carKmRate:
        customRate.customCarKmRate ?? (engineer.type === EngineerType.CONTRACT ? 14 : undefined),
      zone1Extra: customRate.customZone1Extra ?? undefined,
      zone2Extra: customRate.customZone2Extra ?? undefined,
      zone3Extra: customRate.customZone3Extra ?? undefined,
    };

    return rates;
  }

  /**
   * Calculate work hours with rounding up to 0.25 hours
   */
  calculateWorkHours(startTime: Date, endTime: Date): number {
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.ceil(diffHours * 4) / 4;
  }

  /**
   * Расчет оплаты инженера за работу с учетом индивидуальных ставок
   */
  async calculateEngineerPayment(
    engineer: Engineer,
    organization: Organization,
    hours: number,
    isOvertime: boolean
  ): Promise<number> {
    const rates = await this.getEngineerRatesForOrganization(engineer, organization);
    let rate = rates.baseRate;

    if (isOvertime) {
      if (rates.overtimeRate) {
        // Используем индивидуальную ставку переработки
        rate = rates.overtimeRate;
      } else if (rates.overtimeMultiplier) {
        // Используем коэффициент переработки
        rate = rates.baseRate * rates.overtimeMultiplier;
      } else {
        // Используем стандартные коэффициенты по типу инженера
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
   * Расчет эксплуатации автомобиля с учетом индивидуальных ставок
   */
  async calculateCarUsage(
    engineer: Engineer,
    organization: Organization,
    distanceKm: number,
    territoryType: TerritoryType
  ): Promise<number> {
    const rates = await this.getEngineerRatesForOrganization(engineer, organization);

    if (engineer.type === EngineerType.CONTRACT) {
      // Для наемных инженеров - оплата по километражу
      const kmRate = rates.carKmRate ?? 14;
      return distanceKm * kmRate;
    }

    // Для штатного и удаленного инженеров
    let amount = rates.fixedCarAmount;

    // Добавочная стоимость за зоны (если расстояние > 60 км)
    if (distanceKm > 60) {
      switch (territoryType) {
        case TerritoryType.ZONE_1:
          if (rates.zone1Extra) {
            amount += rates.zone1Extra;
          } else if (engineer.type === EngineerType.REMOTE) {
            amount += 1000; // Значение по умолчанию
          }
          break;
        case TerritoryType.ZONE_2:
          if (rates.zone2Extra) {
            amount += rates.zone2Extra;
          } else {
            amount += 1500; // Значение по умолчанию
          }
          break;
        case TerritoryType.ZONE_3:
          if (rates.zone3Extra) {
            amount += rates.zone3Extra;
          } else {
            amount += 2000; // Значение по умолчанию
          }
          break;
        case TerritoryType.HOME:
        default:
          // Только фиксированная сумма
          break;
      }
    }

    return amount;
  }

  /**
   * Расчет месячной зарплаты инженера с новой логикой
   */
  async calculateMonthlySalary(
    engineer: Engineer,
    workReports: WorkReport[],
    plannedHours: number
  ): Promise<{
    actualHours: number;
    overtimeHours: number;
    baseAmount: number;
    overtimeAmount: number;
    bonusAmount: number;
    carUsageAmount: number;
    fixedSalary: number;
    fixedCarAmount: number;
    earnedAmount: number;
    baseSalary: number;
    totalCarAmount: number;
    totalAmount: number;
  }> {
    let actualHours = 0;
    let overtimeHours = 0;
    let baseAmount = 0;
    let overtimeAmount = 0;
    let carUsageAmount = 0;
    let fixedCarAmount = 0;

    // Группируем отчеты по организациям для получения индивидуальных ставок
    const organizationReports = new Map<number, WorkReport[]>();

    for (const report of workReports) {
      actualHours += report.totalHours;

      if (report.isOvertime) {
        overtimeHours += report.totalHours;
        overtimeAmount += report.calculatedAmount;
      } else {
        baseAmount += report.calculatedAmount;
      }

      carUsageAmount += report.carUsageAmount;

      // Группируем по организациям
      if (report.order?.organization?.id) {
        if (!organizationReports.has(report.order.organization.id)) {
          organizationReports.set(report.order.organization.id, []);
        }
        organizationReports.get(report.order.organization.id)!.push(report);
      }
    }

    // Получаем фиксированную оплату за автомобиль (максимальная из индивидуальных ставок)
    // и рассчитываем добавочные платежи за каждый выезд в зоны
    let zoneExtraAmount = 0;
    for (const [organizationId, reports] of organizationReports) {
      if (reports.length > 0) {
        const organization = reports[0].order!.organization!;
        const rates = await this.getEngineerRatesForOrganization(engineer, organization);
        fixedCarAmount = Math.max(fixedCarAmount, rates.fixedCarAmount);

        // Для каждого отчета считаем добавочную стоимость за выезд в зону
        for (const report of reports) {
          if (report.territoryType && report.territoryType !== TerritoryType.HOME) {
            switch (report.territoryType) {
              case TerritoryType.ZONE_1:
                zoneExtraAmount += rates.zone1Extra || 1000;
                break;
              case TerritoryType.ZONE_2:
                zoneExtraAmount += rates.zone2Extra || 1500;
                break;
              case TerritoryType.ZONE_3:
                zoneExtraAmount += rates.zone3Extra || 2000;
                break;
            }
          }
        }
      }
    }

    // Расчет премии за переработку (только для штатного и удаленного)
    let bonusAmount = 0;
    if (engineer.type !== EngineerType.CONTRACT && actualHours > plannedHours) {
      const bonusHours = actualHours - plannedHours;
      const bonusRate = engineer.type === EngineerType.STAFF ? 700 : 650;
      bonusAmount = bonusHours * bonusRate;
    }

    // Новая логика по требованиям:
    // 1. Логика = max(фиксированная зарплата, заработанная сумма)
    // 2. Заработанная сумма = обычные часы + внеурочные часы + премии
    // 3. Оплата за автомобиль = фиксированная + добавочная за каждый выезд в зоны
    const fixedSalary = engineer.fixedSalary;
    const earnedAmount = baseAmount + overtimeAmount + bonusAmount;
    const totalCarAmount = fixedCarAmount + zoneExtraAmount;

    // Основная зарплата = max(фиксированная зарплата, заработанная сумма)
    const baseSalary = Math.max(fixedSalary, earnedAmount);

    // Итоговая сумма = основная зарплата + оплата за автомобиль
    const totalAmount = baseSalary + totalCarAmount;

    return {
      actualHours,
      overtimeHours,
      baseAmount,
      overtimeAmount,
      bonusAmount,
      carUsageAmount,
      fixedSalary,
      fixedCarAmount,
      earnedAmount,
      baseSalary,
      totalCarAmount,
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
   * Расчет полной стоимости работы (включая транспорт) с учетом индивидуальных ставок
   */
  async calculateWorkReportTotals(
    engineer: Engineer,
    organization: Organization,
    workReport: WorkReport
  ): Promise<{ calculatedAmount: number; carUsageAmount: number; isOvertime: boolean }> {
    // Определение сверхурочного времени
    const isOvertime = this.isOvertimeWork(workReport.startTime, workReport.endTime, engineer.type);

    // Расчет оплаты за работу
    const calculatedAmount = await this.calculateEngineerPayment(
      engineer,
      organization,
      workReport.totalHours,
      isOvertime
    );

    // Расчет транспорта
    let carUsageAmount = 0;
    if (workReport.distanceKm && workReport.territoryType) {
      carUsageAmount = await this.calculateCarUsage(
        engineer,
        organization,
        workReport.distanceKm,
        workReport.territoryType
      );
    }

    return {
      calculatedAmount,
      carUsageAmount,
      isOvertime,
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
