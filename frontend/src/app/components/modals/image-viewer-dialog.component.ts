import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface ImageViewerData {
  imageUrl: string;
  title: string;
  fileName?: string;
}

@Component({
  selector: 'app-image-viewer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="image-viewer-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>{{ data.title }}</h2>
        <button mat-icon-button (click)="close()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <div class="image-container">
          <div class="loading-spinner" *ngIf="isLoading">
            <mat-spinner diameter="50"></mat-spinner>
          </div>
          <img
            [src]="data.imageUrl"
            [alt]="data.title"
            (load)="onImageLoad()"
            (error)="onImageError()"
            [class.loaded]="!isLoading"
            [class.error]="hasError"
          />
          <div class="error-message" *ngIf="hasError">
            <mat-icon>error_outline</mat-icon>
            <p>Не удалось загрузить изображение</p>
          </div>
        </div>
        <div class="image-info" *ngIf="data.fileName">
          <mat-icon>info</mat-icon>
          <span>{{ data.fileName }}</span>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Закрыть</button>
        <a mat-raised-button color="primary" [href]="data.imageUrl" download target="_blank">
          <mat-icon>download</mat-icon>
          Скачать
        </a>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .image-viewer-dialog {
        display: flex;
        flex-direction: column;
        min-width: 600px;
        max-width: 90vw;
        max-height: 90vh;
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid #e0e0e0;
      }

      .dialog-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
        color: #1976d2;
        flex: 1;
      }

      .close-button {
        margin-left: 16px;
      }

      mat-dialog-content {
        padding: 0 !important;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .image-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        max-height: 70vh;
        background-color: #f5f5f5;
        overflow: auto;
      }

      .loading-spinner {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1;
      }

      img {
        max-width: 100%;
        max-height: 70vh;
        object-fit: contain;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }

      img.loaded {
        opacity: 1;
      }

      img.error {
        display: none;
      }

      .error-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px;
        color: #666;
      }

      .error-message mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #d32f2f;
      }

      .error-message p {
        margin: 0;
        font-size: 16px;
      }

      .image-info {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        background-color: #f9f9f9;
        border-top: 1px solid #e0e0e0;
        font-size: 14px;
        color: #666;
      }

      .image-info mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        margin: 0;
        border-top: 1px solid #e0e0e0;
        gap: 12px;
      }

      mat-dialog-actions button,
      mat-dialog-actions a {
        min-width: 100px;
      }

      @media (max-width: 768px) {
        .image-viewer-dialog {
          min-width: 100%;
          max-width: 100vw;
        }

        .image-container {
          min-height: 300px;
          max-height: 60vh;
        }

        img {
          max-height: 60vh;
        }
      }
    `,
  ],
})
export class ImageViewerDialogComponent {
  dialogRef = inject(MatDialogRef<ImageViewerDialogComponent>);
  isLoading = true;
  hasError = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: ImageViewerData) {}

  onImageLoad() {
    this.isLoading = false;
    this.hasError = false;
  }

  onImageError() {
    this.isLoading = false;
    this.hasError = true;
  }

  close() {
    this.dialogRef.close();
  }
}
