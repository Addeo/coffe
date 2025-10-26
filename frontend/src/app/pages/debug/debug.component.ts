import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface LogEntry {
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

@Component({
  selector: 'app-debug',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="debug-container">
      <mat-card>
        <mat-card-header>
          <h2>🔍 Debug Panel - Логи и API</h2>
        </mat-card-header>

        <mat-card-content>
          <!-- API Testing Section -->
          <mat-expansion-panel [expanded]="true">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>api</mat-icon>
                Тестирование API
              </mat-panel-title>
            </mat-expansion-panel-header>

            <div class="api-test-section">
              <mat-form-field appearance="outline">
                <mat-label>Endpoint</mat-label>
                <input matInput [(ngModel)]="apiEndpoint" placeholder="/api/orders/test" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Метод</mat-label>
                <mat-select [(ngModel)]="apiMethod">
                  <mat-option value="GET">GET</mat-option>
                  <mat-option value="POST">POST</mat-option>
                  <mat-option value="PATCH">PATCH</mat-option>
                  <mat-option value="DELETE">DELETE</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Body (JSON)</mat-label>
                <textarea matInput rows="5" [(ngModel)]="apiBody" placeholder='{"key": "value"}'></textarea>
              </mat-form-field>

              <button mat-raised-button color="primary" (click)="testApi()" [disabled]="isTestingApi()">
                <mat-icon>send</mat-icon>
                Отправить запрос
                @if (isTestingApi()) {
                  <mat-spinner diameter="20"></mat-spinner>
                }
              </button>

              @if (apiResponse()) {
                <div class="response-section">
                  <h3>Ответ:</h3>
                  <pre>{{ apiResponse() | json }}</pre>
                </div>
              }
            </div>
          </mat-expansion-panel>

          <!-- Console Logs Section -->
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>terminal</mat-icon>
                Логи консоли ({{ logs().length }})
              </mat-panel-title>
            </mat-expansion-panel-header>

            <div class="logs-section">
              <div class="logs-controls">
                <button mat-button (click)="clearLogs()">
                  <mat-icon>clear</mat-icon>
                  Очистить
                </button>
                <button mat-button (click)="exportLogs()">
                  <mat-icon>download</mat-icon>
                  Экспорт
                </button>
              </div>

              <div class="logs-list">
                @for (log of logs(); track log.timestamp) {
                  <div class="log-entry" [class]="'log-' + log.level">
                    <span class="timestamp">{{ log.timestamp | date: 'HH:mm:ss.SSS' }}</span>
                    <span class="level">{{ log.level.toUpperCase() }}</span>
                    <span class="message">{{ log.message }}</span>
                    @if (log.data) {
                      <button mat-icon-button (click)="toggleData(log)" matTooltip="Показать/скрыть данные">
                        <mat-icon>info</mat-icon>
                      </button>
                    }
                  </div>
                  @if (log.showData && log.data) {
                    <div class="log-data">
                      <pre>{{ log.data | json }}</pre>
                    </div>
                  }
                }
              </div>
            </div>
          </mat-expansion-panel>

          <!-- Backend Logs Section -->
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>storage</mat-icon>
                Логи Backend
              </mat-panel-title>
            </mat-expansion-panel-header>

            <div class="backend-logs-section">
              <p class="info-text">
                <mat-icon>info</mat-icon>
                Для просмотра логов backend используйте скрипт: ./check-production-logs.sh
              </p>
              <button mat-raised-button color="accent" (click)="openBackendLogsGuide()">
                <mat-icon>help</mat-icon>
                Как проверить логи backend
              </button>
            </div>
          </mat-expansion-panel>

          <!-- Network Monitor Section -->
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>network_check</mat-icon>
                Мониторинг запросов
              </mat-panel-title>
            </mat-expansion-panel-header>

            <div class="network-section">
              <div class="network-stats">
                <div class="stat-item">
                  <span class="stat-label">Всего запросов:</span>
                  <span class="stat-value">{{ networkRequests().length }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Успешных:</span>
                  <span class="stat-value success">{{ getSuccessfulRequests() }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Ошибок:</span>
                  <span class="stat-value error">{{ getErrorRequests() }}</span>
                </div>
              </div>

              <div class="requests-list">
                @for (request of networkRequests().slice(-10); track request.id) {
                  <div class="request-entry" [class]="'request-' + request.status">
                    <div class="request-header">
                      <span class="method">{{ request.method }}</span>
                      <span class="url">{{ request.url }}</span>
                      <span class="status">{{ request.status }}</span>
                      <span class="timestamp">{{ request.timestamp | date: 'HH:mm:ss' }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </mat-expansion-panel>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .debug-container {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }

      mat-card {
        margin-bottom: 20px;
      }

      mat-card-header h2 {
        margin: 0;
        font-size: 24px;
      }

      .api-test-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      mat-form-field {
        width: 100%;
      }

      .full-width {
        width: 100%;
      }

      .response-section {
        margin-top: 20px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 4px;
      }

      .response-section pre {
        background-color: #fff;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
      }

      .logs-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .logs-controls {
        display: flex;
        gap: 8px;
      }

      .logs-list {
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 8px;
      }

      .log-entry {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        border-radius: 4px;
        margin-bottom: 4px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
      }

      .log-entry.log-log {
        background-color: #f5f5f5;
      }

      .log-entry.log-info {
        background-color: #e3f2fd;
      }

      .log-entry.log-warn {
        background-color: #fff3e0;
      }

      .log-entry.log-error {
        background-color: #ffebee;
      }

      .timestamp {
        color: #666;
        min-width: 90px;
      }

      .level {
        font-weight: bold;
        min-width: 50px;
      }

      .message {
        flex: 1;
      }

      .log-data {
        margin-left: 120px;
        margin-bottom: 8px;
        padding: 8px;
        background-color: #fafafa;
        border-left: 3px solid #2196f3;
      }

      .log-data pre {
        margin: 0;
        font-size: 11px;
      }

      .network-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .network-stats {
        display: flex;
        gap: 24px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 4px;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .stat-label {
        font-size: 12px;
        color: #666;
      }

      .stat-value {
        font-size: 24px;
        font-weight: bold;
      }

      .stat-value.success {
        color: #4caf50;
      }

      .stat-value.error {
        color: #f44336;
      }

      .requests-list {
        max-height: 300px;
        overflow-y: auto;
      }

      .request-entry {
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 8px;
        border-left: 3px solid #ccc;
      }

      .request-entry.request-success {
        background-color: #e8f5e9;
        border-left-color: #4caf50;
      }

      .request-entry.request-error {
        background-color: #ffebee;
        border-left-color: #f44336;
      }

      .request-header {
        display: flex;
        gap: 12px;
        align-items: center;
        font-family: 'Courier New', monospace;
        font-size: 12px;
      }

      .method {
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 3px;
        background-color: #2196f3;
        color: white;
      }

      .url {
        flex: 1;
      }

      .status {
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: bold;
      }

      .request-success .status {
        background-color: #4caf50;
        color: white;
      }

      .request-error .status {
        background-color: #f44336;
        color: white;
      }

      .info-text {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background-color: #e3f2fd;
        border-radius: 4px;
        margin-bottom: 16px;
      }

      mat-icon {
        vertical-align: middle;
      }
    `,
  ],
})
export class DebugComponent implements OnInit {
  logs = signal<LogEntry[]>([]);
  apiEndpoint = signal<string>('/api/orders/test');
  apiMethod = signal<string>('GET');
  apiBody = signal<string>('{}');
  apiResponse = signal<any>(null);
  isTestingApi = signal(false);
  networkRequests = signal<any[]>([]);

  private logInterceptors: any[] = [];

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.interceptConsoleLogs();
    this.interceptNetworkRequests();
  }

  private interceptConsoleLogs() {
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      this.addLog('log', args);
      originalLog.apply(console, args);
    };

    console.info = (...args: any[]) => {
      this.addLog('info', args);
      originalInfo.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.addLog('warn', args);
      originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.addLog('error', args);
      originalError.apply(console, args);
    };

    this.logInterceptors.push({ originalLog, originalInfo, originalWarn, originalError });
  }

  private addLog(level: 'log' | 'info' | 'warn' | 'error', args: any[]) {
    const message = args
      .map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      )
      .join(' ');

    const data =
      args.length > 1 && typeof args[1] === 'object' ? args[1] : args.length === 1 && typeof args[0] === 'object' ? args[0] : null;

    this.logs.update(logs => [
      ...logs,
      {
        timestamp: new Date(),
        level,
        message,
        data,
        showData: false,
      },
    ]);
  }

  private interceptNetworkRequests() {
    // In a real implementation, you would use Angular's HTTP Interceptor
    // For now, this is a placeholder
  }

  testApi() {
    this.isTestingApi.set(true);
    this.apiResponse.set(null);

    const url = `${environment.apiUrl}${this.apiEndpoint()}`;
    let body = null;
    let obs;

    try {
      body = JSON.parse(this.apiBody());
    } catch (e) {
      this.snackBar.open('Неверный JSON в body', 'Закрыть', { duration: 3000 });
      this.isTestingApi.set(false);
      return;
    }

    switch (this.apiMethod()) {
      case 'GET':
        obs = this.http.get(url);
        break;
      case 'POST':
        obs = this.http.post(url, body);
        break;
      case 'PATCH':
        obs = this.http.patch(url, body);
        break;
      case 'DELETE':
        obs = this.http.delete(url);
        break;
      default:
        obs = this.http.get(url);
    }

    obs.subscribe({
      next: response => {
        this.apiResponse.set(response);
        this.snackBar.open('Запрос успешен', 'Закрыть', { duration: 2000 });
        this.isTestingApi.set(false);
      },
      error: error => {
        this.apiResponse.set(error.error || { message: error.message });
        this.snackBar.open('Ошибка запроса', 'Закрыть', { duration: 3000 });
        this.isTestingApi.set(false);
      },
    });
  }

  clearLogs() {
    this.logs.set([]);
  }

  exportLogs() {
    const logsStr = this.logs()
      .map(log => `[${log.timestamp.toISOString()}] ${log.level}: ${log.message}`)
      .join('\n');

    const blob = new Blob([logsStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  toggleData(log: any) {
    log.showData = !log.showData;
  }

  getSuccessfulRequests() {
    return this.networkRequests().filter(r => r.status === 200 || r.status === 201).length;
  }

  getErrorRequests() {
    return this.networkRequests().filter(r => r.status >= 400).length;
  }

  openBackendLogsGuide() {
    alert('Для просмотра логов backend:\n\n1. Откройте терминал\n2. Запустите: ./check-production-logs.sh\n\nПодробнее см. CHECK_LOGS_GUIDE.md');
  }
}
