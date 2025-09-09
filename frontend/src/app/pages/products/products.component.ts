import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnInit {
  products = signal<any[]>([]);

  ngOnInit() {
    this.loadProducts();
  }

  private loadProducts() {
    // TODO: Load products from API service
    this.products.set([
      {
        id: 1,
        name: 'Espresso',
        price: 3.5,
        category: 'Coffee',
        status: 'Available',
        image: '/assets/images/espresso.jpg',
      },
      {
        id: 2,
        name: 'Cappuccino',
        price: 4.5,
        category: 'Coffee',
        status: 'Available',
        image: '/assets/images/cappuccino.jpg',
      },
    ]);
  }

  onEditProduct(product: any) {
    console.log('Edit product:', product);
  }

  onDeleteProduct(product: any) {
    console.log('Delete product:', product);
  }
}
