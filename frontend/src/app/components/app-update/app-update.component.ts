import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

interface VersionInfo {
  version: string;
  downloadUrl: string;
  required: boolean;
  releaseNotes?: string;
}

@Component({
  selector: 'app-app-update',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>
          <mat-icon color="primary">system_update_alt</mat-icon>
          Доступно обновление!
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>
          Новая версия приложения <strong>{{ data.version }}</strong> доступна.
        </p>
        <p *ngIf="data.required" class="required-note">
          <mat-icon color="warn">warning</mat-icon>
          Это обязательное обновление.
        </p>
        <div *ngIf="data.releaseNotes" class="release-notes">
          <h4>Что нового:</h4>
          <pre>{{ data.releaseNotes }}</pre>
        </div>
      </mat-card-content>
      <mat-card-actions align="end">
        <button mat-button (click)="onCancel()" *ngIf="!data.required">
          Напомнить позже
        </button>
        <button mat-raised-button color="primary" (click)="onUpdate()">
          <mat-icon>download</mat-icon>
          Обновить
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    mat-card {
      max-width: 500px;
    }
    
    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .required-note {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      font-weight: 500;
      margin-top: 16px;
    }
    
    .release-notes {
      margin-top: 16px;
    }
    
    .release-notes h4 {
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
    }
    
    pre {
      white-space: pre-wrap;
      background-color: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
      font-size: 13px;
      line-height: 1.5;
    }
    
    mat-card-actions {
      padding: 16px;
    }
  `],
})
export class AppUpdateComponent {
  constructor(
    public dialogRef: MatDialogRef<AppUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VersionInfo
  ) {}

  onUpdate(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

