import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EngineerSalaryChartData,
  EngineerHoursChartData,
  ReportsApiResponse,
} from '@shared/dtos/reports.dto';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor() {
    console.log('📊 ReportsService initialized');
  }

  /**
   * Получение данных для графика зарплат инженеров
   */
  getEngineerSalariesChart(
    month?: number,
    year?: number,
    engineerIds?: number[]
  ): Observable<ReportsApiResponse<EngineerSalaryChartData[]>> {
    let params = new HttpParams();

    if (month) params = params.set('month', month.toString());
    if (year) params = params.set('year', year.toString());
    if (engineerIds && engineerIds.length > 0) {
      params = params.set('engineerIds', engineerIds.join(','));
    }

    console.log('📊 Fetching engineer salaries chart:', { month, year, engineerIds });

    return this.http.get<ReportsApiResponse<EngineerSalaryChartData[]>>(
      `${this.apiUrl}/engineer-salaries-chart`,
      { params }
    );
  }

  /**
   * Получение данных для графика отработанных часов инженеров
   */
  getEngineerHoursChart(
    month?: number,
    year?: number,
    engineerIds?: number[]
  ): Observable<ReportsApiResponse<EngineerHoursChartData[]>> {
    let params = new HttpParams();

    if (month) params = params.set('month', month.toString());
    if (year) params = params.set('year', year.toString());
    if (engineerIds && engineerIds.length > 0) {
      params = params.set('engineerIds', engineerIds.join(','));
    }

    console.log('📊 Fetching engineer hours chart:', { month, year, engineerIds });

    return this.http.get<ReportsApiResponse<EngineerHoursChartData[]>>(
      `${this.apiUrl}/engineer-hours-chart`,
      { params }
    );
  }

  /**
   * Получение текущего месяца и года
   */
  getCurrentMonthYear(): { month: number; year: number } {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  }

  /**
   * Получение количества дней в месяце
   */
  getDaysInMonth(month: number, year: number): number {
    return new Date(year, month, 0).getDate();
  }

  /**
   * Форматирование данных для Chart.js
   */
  formatSalaryChartData(chartData: EngineerSalaryChartData[]): any {
    const datasets = chartData.map((engineer, index) => ({
      label: engineer.engineerName,
      data: engineer.data.map(item => ({
        x: item.date,
        y: item.salary,
      })),
      borderColor: this.getChartColor(index),
      backgroundColor: this.getChartColor(index, 0.1),
      fill: false,
      tension: 0.4,
    }));

    return {
      datasets,
    };
  }

  /**
   * Форматирование данных часов для Chart.js
   */
  formatHoursChartData(chartData: EngineerHoursChartData[]): any {
    const datasets = chartData.map((engineer, index) => ({
      label: engineer.engineerName,
      data: engineer.data.map(item => ({
        x: item.date,
        y: item.hours,
      })),
      borderColor: this.getChartColor(index),
      backgroundColor: this.getChartColor(index, 0.1),
      fill: false,
      tension: 0.4,
    }));

    return {
      datasets,
    };
  }

  /**
   * Получение цвета для графика
   */
  private getChartColor(index: number, alpha: number = 1): string {
    const colors = [
      `rgba(255, 99, 132, ${alpha})`, // Красный
      `rgba(54, 162, 235, ${alpha})`, // Синий
      `rgba(255, 205, 86, ${alpha})`, // Желтый
      `rgba(75, 192, 192, ${alpha})`, // Зеленый
      `rgba(153, 102, 255, ${alpha})`, // Фиолетовый
      `rgba(255, 159, 64, ${alpha})`, // Оранжевый
      `rgba(199, 199, 199, ${alpha})`, // Серый
      `rgba(83, 102, 255, ${alpha})`, // Синий темный
      `rgba(255, 99, 255, ${alpha})`, // Розовый
      `rgba(99, 255, 132, ${alpha})`, // Зеленый светлый
    ];

    return colors[index % colors.length];
  }

  /**
   * Настройки графика по умолчанию
   */
  getDefaultChartOptions(title: string, yAxisLabel: string): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context: any) => {
              return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} ${yAxisLabel}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'DD.MM',
            },
          },
          title: {
            display: true,
            text: 'Дата',
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: yAxisLabel,
          },
          ticks: {
            callback: (value: any) => value.toLocaleString(),
          },
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
    };
  }
}
