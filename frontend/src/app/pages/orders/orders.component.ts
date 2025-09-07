import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatPaginatorModule,
    MatCardModule
  ],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
  displayedColumns: string[] = ['id', 'customer', 'items', 'total', 'status', 'date', 'actions'];
  orders = signal<any[]>([]);

  ngOnInit() {
    this.loadOrders();
  }

  private loadOrders() {
    // TODO: Load orders from API service
    this.orders.set([
      {
        id: 1,
        customer: 'John Doe',
        items: 'Espresso, Cappuccino',
        total: 8.00,
        status: 'Completed',
        date: '2024-01-15'
      },
      {
        id: 2,
        customer: 'Jane Smith',
        items: 'Latte',
        total: 5.50,
        status: 'Pending',
        date: '2024-01-15'
      },
    ]);
  }

  onViewOrder(order: any) {
    console.log('View order:', order);
  }

  onUpdateStatus(order: any) {
    console.log('Update status:', order);
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'cancelled':
        return 'warn';
      default:
        return '';
    }
  }
}
