import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-files',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatCardModule,
    MatSortModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './files.component.html',
  styleUrls: ['./files.component.scss']
})
export class FilesComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['filename', 'originalName', 'mimetype', 'size', 'type', 'uploadedAt', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  isLoading = signal(false);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    this.loadFiles();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadFiles() {
    this.isLoading.set(true);
    // TODO: Load files from API service
    this.dataSource.data = [
      {
        id: '1',
        filename: 'document.pdf',
        originalName: 'Important Document.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        type: 'document',
        uploadedAt: new Date()
      }
    ];
    this.isLoading.set(false);
  }

  onUploadFile() {
    // TODO: Open file upload dialog
    this.snackBar.open('File upload coming soon', 'Close', { duration: 2000 });
  }

  onDownloadFile(file: any) {
    // TODO: Download file
    console.log('Download file:', file);
    this.snackBar.open('Download functionality coming soon', 'Close', { duration: 2000 });
  }

  onDeleteFile(file: any) {
    // TODO: Delete file
    console.log('Delete file:', file);
    this.snackBar.open('Delete functionality coming soon', 'Close', { duration: 2000 });
  }

  getFileSizeDisplay(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'avatar':
        return 'primary';
      case 'document':
        return 'accent';
      case 'image':
        return 'primary';
      default:
        return 'basic';
    }
  }
}
