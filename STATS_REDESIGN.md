# 📊 Улучшение дизайна статистики заказов

## 🎨 Вариант 1: Компактная таблица (без графиков)

Объединяем все статистики в одну карточку с таблицей:

```html
<!-- Единая карточка со статистикой -->
<mat-card class="stats-card-unified">
  <mat-card-header>
    <mat-card-title>
      <mat-icon>bar_chart</mat-icon>
      Статистика заказов
    </mat-card-title>
  </mat-card-header>
  
  <mat-card-content>
    <div class="stats-table">
      <!-- Статусы заказов -->
      <div class="stats-section">
        <h3>По статусам</h3>
        <div class="stats-row">
          <div class="stat-item">
            <mat-icon color="primary">assignment</mat-icon>
            <span class="label">Всего:</span>
            <span class="value">{{ orderStats().total }}</span>
          </div>
          <div class="stat-item">
            <mat-icon>schedule</mat-icon>
            <span class="label">Ожидают:</span>
            <span class="value">{{ orderStats().waiting }}</span>
          </div>
          <div class="stat-item">
            <mat-icon>person_add</mat-icon>
            <span class="label">В обработке:</span>
            <span class="value">{{ orderStats().processing }}</span>
          </div>
          <div class="stat-item">
            <mat-icon>build</mat-icon>
            <span class="label">В работе:</span>
            <span class="value">{{ orderStats().working }}</span>
          </div>
          <div class="stat-item">
            <mat-icon>visibility</mat-icon>
            <span class="label">На проверке:</span>
            <span class="value">{{ orderStats().review }}</span>
          </div>
          <div class="stat-item">
            <mat-icon color="primary">check_circle</mat-icon>
            <span class="label">Завершено:</span>
            <span class="value">{{ orderStats().completed }}</span>
          </div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <!-- Источники заказов -->
      <div class="stats-section">
        <h3>По источникам</h3>
        <div class="stats-row">
          <div class="stat-item">
            <mat-icon>touch_app</mat-icon>
            <span class="label">Вручную:</span>
            <span class="value">{{ orderStats().bySource.manual }}</span>
          </div>
          <div class="stat-item">
            <mat-icon>settings</mat-icon>
            <span class="label">Автоматически:</span>
            <span class="value">{{ orderStats().bySource.automatic }}</span>
          </div>
          <div class="stat-item">
            <mat-icon>email</mat-icon>
            <span class="label">Из Email:</span>
            <span class="value">{{ orderStats().bySource.email }}</span>
          </div>
          <div class="stat-item">
            <mat-icon>api</mat-icon>
            <span class="label">Через API:</span>
            <span class="value">{{ orderStats().bySource.api }}</span>
          </div>
        </div>
      </div>
    </div>
  </mat-card-content>
</mat-card>
```

### SCSS для компактного дизайна:

```scss
.stats-card-unified {
  margin-bottom: 24px;

  mat-card-header {
    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      font-weight: 500;
    }
  }

  .stats-table {
    .stats-section {
      padding: 16px 0;

      h3 {
        font-size: 14px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.6);
        margin-bottom: 16px;
      }

      .stats-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;

        .stat-item {
          display: flex;
          align-items: center;
          gap: 8px;

          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
          }

          .label {
            font-size: 14px;
            color: rgba(0, 0, 0, 0.6);
          }

          .value {
            font-size: 18px;
            font-weight: 500;
            margin-left: auto;
          }
        }
      }
    }

    mat-divider {
      margin: 16px 0;
    }
  }
}
```

---

## 🎨 Вариант 2: С графиками (РЕКОМЕНДУЕТСЯ!)

### Установка библиотеки для графиков:

```bash
npm install chart.js ng2-charts --save
```

### HTML с графиками:

```html
<!-- Статистика с графиками -->
<mat-card class="stats-card-charts">
  <mat-card-header>
    <mat-card-title>
      <mat-icon>bar_chart</mat-icon>
      Статистика заказов
    </mat-card-title>
  </mat-card-header>
  
  <mat-card-content>
    <div class="charts-container">
      <!-- График по статусам (Donut Chart) -->
      <div class="chart-section">
        <h3>Распределение по статусам</h3>
        <div class="chart-wrapper">
          <canvas
            baseChart
            [data]="statusChartData"
            [options]="chartOptions"
            [type]="'doughnut'"
            [legend]="true"
          ></canvas>
        </div>
        <div class="chart-stats">
          <div class="stat-badge" *ngFor="let stat of statusStats">
            <span class="badge-color" [style.background-color]="stat.color"></span>
            <span class="badge-label">{{ stat.label }}:</span>
            <span class="badge-value">{{ stat.value }}</span>
          </div>
        </div>
      </div>

      <!-- График по источникам (Bar Chart) -->
      <div class="chart-section">
        <h3>Источники заказов</h3>
        <div class="chart-wrapper">
          <canvas
            baseChart
            [data]="sourceChartData"
            [options]="barChartOptions"
            [type]="'bar'"
          ></canvas>
        </div>
      </div>
    </div>

    <!-- Итоговая статистика -->
    <div class="total-stats">
      <div class="total-item">
        <mat-icon color="primary">assignment</mat-icon>
        <div>
          <div class="total-label">Всего заказов</div>
          <div class="total-value">{{ orderStats().total }}</div>
        </div>
      </div>
      <div class="total-item">
        <mat-icon color="accent">build</mat-icon>
        <div>
          <div class="total-label">В работе</div>
          <div class="total-value">{{ orderStats().working }}</div>
        </div>
      </div>
      <div class="total-item">
        <mat-icon style="color: #4caf50">check_circle</mat-icon>
        <div>
          <div class="total-label">Завершено</div>
          <div class="total-value">{{ orderStats().completed }}</div>
        </div>
      </div>
    </div>
  </mat-card-content>
</mat-card>
```

### TypeScript для графиков:

```typescript
import { Component } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';

export class OrdersComponent {
  // ... существующий код ...

  // Данные для графика статусов (Donut)
  statusChartData: ChartData<'doughnut'> = {
    labels: ['Ожидают', 'В обработке', 'В работе', 'На проверке', 'Завершено'],
    datasets: [{
      data: [
        this.orderStats().waiting,
        this.orderStats().processing,
        this.orderStats().working,
        this.orderStats().review,
        this.orderStats().completed
      ],
      backgroundColor: [
        '#FFA726', // Оранжевый
        '#42A5F5', // Синий
        '#66BB6A', // Зелёный
        '#FFCA28', // Жёлтый
        '#26A69A', // Бирюзовый
      ],
      borderWidth: 0
    }]
  };

  // Данные для графика источников (Bar)
  sourceChartData: ChartData<'bar'> = {
    labels: ['Вручную', 'Автоматически', 'Email', 'API'],
    datasets: [{
      label: 'Количество заказов',
      data: [
        this.orderStats().bySource.manual,
        this.orderStats().bySource.automatic,
        this.orderStats().bySource.email,
        this.orderStats().bySource.api
      ],
      backgroundColor: '#3f51b5',
    }]
  };

  // Опции для графиков
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      }
    }
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  // Статистика для бейджей
  get statusStats() {
    return [
      { label: 'Ожидают', value: this.orderStats().waiting, color: '#FFA726' },
      { label: 'В обработке', value: this.orderStats().processing, color: '#42A5F5' },
      { label: 'В работе', value: this.orderStats().working, color: '#66BB6A' },
      { label: 'На проверке', value: this.orderStats().review, color: '#FFCA28' },
      { label: 'Завершено', value: this.orderStats().completed, color: '#26A69A' },
    ];
  }
}
```

### SCSS для графиков:

```scss
.stats-card-charts {
  margin-bottom: 24px;

  .charts-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-bottom: 24px;

    @media (max-width: 960px) {
      grid-template-columns: 1fr;
    }

    .chart-section {
      h3 {
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 16px;
        color: rgba(0, 0, 0, 0.7);
      }

      .chart-wrapper {
        height: 250px;
        position: relative;
      }

      .chart-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 16px;

        .stat-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;

          .badge-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
          }

          .badge-label {
            color: rgba(0, 0, 0, 0.6);
          }

          .badge-value {
            font-weight: 500;
          }
        }
      }
    }
  }

  .total-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 8px;

    .total-item {
      display: flex;
      align-items: center;
      gap: 12px;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .total-label {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
      }

      .total-value {
        font-size: 24px;
        font-weight: 500;
      }
    }
  }
}
```

---

## 🎨 Вариант 3: Минималистичный с прогресс-барами

```html
<mat-card class="stats-card-progress">
  <mat-card-header>
    <mat-card-title>Статистика заказов</mat-card-title>
  </mat-card-header>
  
  <mat-card-content>
    <!-- Общий счётчик -->
    <div class="total-counter">
      <mat-icon>assignment</mat-icon>
      <div class="counter-text">
        <span class="counter-value">{{ orderStats().total }}</span>
        <span class="counter-label">Всего заказов</span>
      </div>
    </div>

    <mat-divider></mat-divider>

    <!-- Прогресс-бары по статусам -->
    <div class="progress-stats">
      <div class="progress-item">
        <div class="progress-header">
          <span class="progress-label">Ожидают</span>
          <span class="progress-value">{{ orderStats().waiting }}</span>
        </div>
        <mat-progress-bar
          mode="determinate"
          [value]="(orderStats().waiting / orderStats().total) * 100"
          color="warn"
        ></mat-progress-bar>
      </div>

      <div class="progress-item">
        <div class="progress-header">
          <span class="progress-label">В работе</span>
          <span class="progress-value">{{ orderStats().working }}</span>
        </div>
        <mat-progress-bar
          mode="determinate"
          [value]="(orderStats().working / orderStats().total) * 100"
          color="accent"
        ></mat-progress-bar>
      </div>

      <div class="progress-item">
        <div class="progress-header">
          <span class="progress-label">Завершено</span>
          <span class="progress-value">{{ orderStats().completed }}</span>
        </div>
        <mat-progress-bar
          mode="determinate"
          [value]="(orderStats().completed / orderStats().total) * 100"
          color="primary"
        ></mat-progress-bar>
      </div>
    </div>
  </mat-card-content>
</mat-card>
```

---

## 📊 Рекомендуемые библиотеки для графиков:

### 1. **ng2-charts** (на базе Chart.js) - РЕКОМЕНДУЕТСЯ!
```bash
npm install chart.js ng2-charts
```
✅ Простая интеграция с Angular  
✅ Много типов графиков (line, bar, pie, doughnut, radar)  
✅ Responsive  
✅ Хорошая документация  

### 2. **ngx-charts** (от Swimlane)
```bash
npm install @swimlane/ngx-charts
```
✅ Красивые SVG графики  
✅ Анимации  
✅ Angular-native  

### 3. **ApexCharts**
```bash
npm install apexcharts ng-apexcharts
```
✅ Современный дизайн  
✅ Интерактивные графики  
✅ Много опций кастомизации  

---

## 🎯 Что я рекомендую:

1. **Для desktop:** Вариант 2 с графиками (ng2-charts)
2. **Для mobile:** Компактная таблица (Вариант 1)
3. **Типы графиков:**
   - Статусы заказов → Donut Chart (кольцевая диаграмма)
   - Источники → Bar Chart (столбчатая диаграмма)
   - Тренды по времени → Line Chart (линейный график)

Хотите, чтобы я реализовал один из вариантов?

