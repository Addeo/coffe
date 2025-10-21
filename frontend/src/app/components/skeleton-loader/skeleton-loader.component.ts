import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonType = 'text' | 'circle' | 'rectangle' | 'card' | 'table-row' | 'stat-card';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-loader" [ngClass]="['skeleton-' + type, customClass]" [style.height.px]="height" [style.width]="width">
      <!-- Text skeleton -->
      <ng-container *ngIf="type === 'text'">
        <div class="skeleton-line" *ngFor="let line of lines; let i = index" [style.width]="getLineWidth(i)"></div>
      </ng-container>

      <!-- Circle skeleton (for avatars) -->
      <ng-container *ngIf="type === 'circle'">
        <div class="skeleton-circle"></div>
      </ng-container>

      <!-- Rectangle skeleton -->
      <ng-container *ngIf="type === 'rectangle'">
        <div class="skeleton-rectangle"></div>
      </ng-container>

      <!-- Card skeleton -->
      <ng-container *ngIf="type === 'card'">
        <div class="skeleton-card">
          <div class="skeleton-card-header"></div>
          <div class="skeleton-card-content">
            <div class="skeleton-line" *ngFor="let line of lines"></div>
          </div>
        </div>
      </ng-container>

      <!-- Table row skeleton -->
      <ng-container *ngIf="type === 'table-row'">
        <div class="skeleton-table-row">
          <div class="skeleton-cell" *ngFor="let col of columns"></div>
        </div>
      </ng-container>

      <!-- Stat card skeleton -->
      <ng-container *ngIf="type === 'stat-card'">
        <div class="skeleton-stat-card">
          <div class="skeleton-stat-icon"></div>
          <div class="skeleton-stat-content">
            <div class="skeleton-stat-label"></div>
            <div class="skeleton-stat-value"></div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .skeleton-loader {
        animation: skeleton-pulse 1.5s ease-in-out infinite;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        border-radius: 4px;
      }

      @keyframes skeleton-pulse {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      /* Dark theme support */
      :host-context(.dark-theme) .skeleton-loader {
        background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
        background-size: 200% 100%;
      }

      /* Text skeleton */
      .skeleton-text {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .skeleton-line {
        height: 16px;
        background: inherit;
        border-radius: 4px;
      }

      /* Circle skeleton */
      .skeleton-circle {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: inherit;
      }

      /* Rectangle skeleton */
      .skeleton-rectangle {
        width: 100%;
        height: 100%;
        background: inherit;
        border-radius: 8px;
      }

      /* Card skeleton */
      .skeleton-card {
        padding: 16px;
        border-radius: 12px;
        background: inherit;
      }

      .skeleton-card-header {
        height: 24px;
        width: 60%;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 4px;
        margin-bottom: 16px;
      }

      .skeleton-card-content {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .skeleton-line {
          background: rgba(255, 255, 255, 0.5);
        }
      }

      /* Table row skeleton */
      .skeleton-table-row {
        display: flex;
        gap: 16px;
        padding: 12px;
        background: inherit;
        border-radius: 4px;
      }

      .skeleton-cell {
        flex: 1;
        height: 20px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 4px;
      }

      /* Stat card skeleton */
      .skeleton-stat-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: inherit;
        border-radius: 12px;
      }

      .skeleton-stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        flex-shrink: 0;
      }

      .skeleton-stat-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .skeleton-stat-label {
        height: 16px;
        width: 70%;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 4px;
      }

      .skeleton-stat-value {
        height: 28px;
        width: 50%;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 4px;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .skeleton-stat-card {
          padding: 16px;
        }

        .skeleton-stat-icon {
          width: 40px;
          height: 40px;
        }
      }
    `,
  ],
})
export class SkeletonLoaderComponent {
  @Input() type: SkeletonType = 'text';
  @Input() height?: number;
  @Input() width: string = '100%';
  @Input() lines: number = 3;
  @Input() columns: number = 4;
  @Input() customClass: string = '';

  getLineWidth(index: number): string {
    // Make last line shorter for more natural look
    if (index === this.lines - 1) {
      return '70%';
    }
    return '100%';
  }
}

