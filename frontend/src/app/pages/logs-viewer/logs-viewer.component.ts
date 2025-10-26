import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { environment } from '../../../environments/environment';
import { interval, Subscription } from 'rxjs';

interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  emoji: string;
  message: string;
  raw: string;
}

@Component({
  selector: 'app-logs-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  template: `
    <div class="logs-viewer-container">
      <mat-card>
        <mat-card-header>
          <div class="header-content">
            <h2>
              <mat-icon>list</mat-icon>
              Backend Logs Viewer
            </h2>
            <div class="header-actions">
              <button mat-icon-button (click)="toggleAutoRefresh()" [matTooltip]="autoRefreshEnabled() ? 'Disable auto-refresh' : 'Enable auto-refresh'">
                <mat-icon>{{ autoRefreshEnabled() ? 'sync' : 'sync_disabled' }}</mat-icon>
              </button>
              <button mat-icon-button (click)="loadLogs()" [matTooltip]="'Refresh logs'">
                <mat-icon>refresh</mat-icon>
              </button>
            </div>
          </div>
        </mat-card-header>

        <mat-card-content>
          <!-- Controls -->
          <div class="controls-section">
            <mat-form-field appearance="outline">
              <mat-label>Lines</mat-label>
              <mat-select [(ngModel)]="selectedLines" (selectionChange)="loadLogs()">
                <mat-option value="50">50</mat-option>
                <mat-option value="100">100</mat-option>
                <mat-option value="200">200</mat-option>
                <mat-option value="500">500</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Filter by level</mat-label>
              <mat-select [(ngModel)]="selectedLevel" (selectionChange)="loadLogs()">
                <mat-option value="">All</mat-option>
                <mat-option value="error">Errors only</mat-option>
                <mat-option value="orders">Orders only</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search</mat-label>
              <input matInput [(ngModel)]="searchQuery" (keyup.enter)="searchLogs()" placeholder="Type to search..." />
              <button mat-icon-button matSuffix (click)="searchLogs()">
                <mat-icon>search</mat-icon>
              </button>
            </mat-form-field>
          </div>

          <!-- Stats -->
          <div class="stats-section" *ngIf="logStats()">
            <mat-chip-set>
              <mat-chip>
                <mat-icon matChipAvatar>info</mat-icon>
                Total: {{ logStats()?.total || 0 }}
              </mat-chip>
              <mat-chip>
                <mat-icon matChipAvatar>filter_list</mat-icon>
                Filtered: {{ logStats()?.filtered || 0 }}
              </mat-chip>
              <mat-chip>
                <mat-icon matChipAvatar>list</mat-icon>
                Showing: {{ logStats()?.returned || 0 }}
              </mat-chip>
            </mat-chip-set>
          </div>

          <!-- Loading -->
          <div class="loading-section" *ngIf="isLoading()">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Loading logs...</p>
          </div>

          <!-- Error -->
          <div class="error-section" *ngIf="error()">
            <mat-icon color="warn">error</mat-icon>
            <p>{{ error() }}</p>
          </div>

          <!-- Logs List -->
          <div class="logs-list" *ngIf="!isLoading() && !error()">
            <div
              *ngFor="let log of logs(); trackBy: trackByLogId"
              class="log-entry"
              [class.log-error]="log.level === 'ERROR'"
              [class.log-warn]="log.level === 'WARN'"
              [class.log-info]="log.level === 'INFO'"
              [class.log-success]="log.emoji === '✅'"
            >
              <div class="log-content">
                <span class="timestamp" *ngIf="log.timestamp">{{ log.timestamp }}</span>
                <span class="emoji" *ngIf="log.emoji">{{ log.emoji }}</span>
                <mat-chip class="level-chip">{{ log.level }}</mat-chip>
                <span class="message">{{ log.message }}</span>
              </div>
              <button mat-icon-button (click)="copyLog(log.raw)" matTooltip="Copy log">
                <mat-icon>content_copy</mat-icon>
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="!isLoading() && !error() && logs().length === 0">
            <mat-icon>inbox</mat-icon>
            <p>No logs found</p>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Auto-refresh indicator -->
      <div class="auto-refresh-indicator" *ngIf="autoRefreshEnabled()">
        <mat-icon>sync</mat-icon>
        <span>Auto-refresh: {{ refreshInterval }}s</span>
      </div>
    </div>
  `,
  styles: [
    `
      .logs-viewer-container {
        padding: 20px;
        max-width: 1400px;
        margin: 0 auto;
      }

      mat-card {
        margin-bottom: 20px;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .header-content h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }

      .controls-section {
        display: flex;
        gap: 16px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }

      mat-form-field {
        min-width: 120px;
      }

      .search-field {
        flex: 1;
        min-width: 250px;
      }

      .stats-section {
        margin-bottom: 20px;
      }

      .loading-section,
      .error-section,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
      }

      .loading-section mat-spinner {
        margin-bottom: 16px;
      }

      .error-section mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }

      .empty-state mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #ccc;
        margin-bottom: 16px;
      }

      .logs-list {
        max-height: 600px;
        overflow-y: auto;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 8px;
      }

      .log-entry {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 8px;
        background-color: #fafafa;
        transition: background-color 0.2s;
      }

      .log-entry:hover {
        background-color: #f5f5f5;
      }

      .log-entry.log-error {
        background-color: #ffebee;
        border-left: 4px solid #f44336;
      }

      .log-entry.log-warn {
        background-color: #fff3e0;
        border-left: 4px solid #ff9800;
      }

      .log-entry.log-info {
        background-color: #e3f2fd;
        border-left: 4px solid #2196f3;
      }

      .log-entry.log-success {
        background-color: #e8f5e9;
        border-left: 4px solid #4caf50;
      }

      .log-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        overflow-x: auto;
      }

      .timestamp {
        color: #666;
        font-size: 11px;
        min-width: 140px;
      }

      .emoji {
        font-size: 18px;
        min-width: 24px;
      }

      .level-chip {
        font-size: 10px;
        height: 20px;
        min-width: 60px;
      }

      .message {
        flex: 1;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .auto-refresh-indicator {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background-color: #4caf50;
        color: white;
        border-radius: 24px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        font-size: 14px;
        z-index: 1000;
      }

      .auto-refresh-indicator mat-icon {
        animation: spin 2s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LogsViewerComponent implements OnInit, OnDestroy {
  logs = signal<LogEntry[]>([]);
  isLoading = signal(false);
  error = signal<string>('');
  logStats = signal<any>(null);
  autoRefreshEnabled = signal(false);
  selectedLines = '100';
  selectedLevel = '';
  searchQuery = '';
  refreshInterval = 5; // seconds
  private refreshSubscription?: Subscription;

  constructor(private http: HttpClient) {
    // Auto-save scroll position
    effect(() => {
      if (this.logs().length > 0) {
        this.autoRefreshEnabled();
      }
    });
  }

  ngOnInit() {
    this.loadLogs();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadLogs() {
    this.isLoading.set(true);
    this.error.set('');

    const params: any = {
      lines: this.selectedLines,
    };

    if (this.selectedLevel === 'orders') {
      // Search for order-related logs
      params.level = 'order';
    } else if (this.selectedLevel === 'error') {
      params.level = 'error';
    }

    this.http
      .get(`${environment.apiUrl}/api/logs`, { params })
      .subscribe({
        next: (response: any) => {
          this.logs.set(response.logs || []);
          this.logStats.set(response);
          this.isLoading.set(false);
        },
        error: error => {
          this.error.set('Failed to load logs: ' + error.message);
          this.isLoading.set(false);
        },
      });
  }

  searchLogs() {
    if (!this.searchQuery.trim()) {
      this.loadLogs();
      return;
    }

    this.isLoading.set(true);
    this.http
      .get(`${environment.apiUrl}/api/logs/search`, {
        params: {
          query: this.searchQuery,
          lines: this.selectedLines,
        },
      })
      .subscribe({
        next: (response: any) => {
          this.logs.set(response.logs || []);
          this.logStats.set(response);
          this.isLoading.set(false);
        },
        error: error => {
          this.error.set('Search failed: ' + error.message);
          this.isLoading.set(false);
        },
      });
  }

  toggleAutoRefresh() {
    this.autoRefreshEnabled.update(value => !value);

    if (this.autoRefreshEnabled()) {
      this.refreshSubscription = interval(this.refreshInterval * 1000).subscribe(() => {
        this.loadLogs();
      });
    } else {
      if (this.refreshSubscription) {
        this.refreshSubscription.unsubscribe();
      }
    }
  }

  copyLog(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // You could show a toast notification here
    });
  }

  trackByLogId(index: number, log: LogEntry): number {
    return log.id;
  }
}
