import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent {
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);

  reports = [
    {
      title: 'User Activity Report',
      description: 'Detailed report of user activities and login patterns',
      icon: 'people',
      type: 'activity'
    },
    {
      title: 'Order Statistics',
      description: 'Comprehensive analysis of order data and trends',
      icon: 'shopping_cart',
      type: 'orders'
    },
    {
      title: 'Product Performance',
      description: 'Analysis of product sales and inventory levels',
      icon: 'inventory',
      type: 'products'
    },
    {
      title: 'System Usage Report',
      description: 'Overall system usage statistics and performance metrics',
      icon: 'analytics',
      type: 'system'
    }
  ];

  generateReport(reportType: string) {
    this.isLoading.set(true);

    // TODO: Implement actual report generation
    console.log('Generating report:', reportType);

    // Simulate report generation
    setTimeout(() => {
      this.isLoading.set(false);
      this.snackBar.open('Report generated successfully', 'Close', { duration: 3000 });
    }, 2000);
  }

  exportReport(reportType: string) {
    // TODO: Implement report export functionality
    console.log('Exporting report:', reportType);
    this.snackBar.open('Export functionality coming soon', 'Close', { duration: 2000 });
  }
}
