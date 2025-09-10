import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ProductDto,
  CreateProductDto,
  UpdateProductDto,
  ProductsQueryDto,
} from '../../../../../shared/dtos/product.dto';
import { PaginatedResponse } from '../../../../../shared/types/api.types';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private http = inject(HttpClient);

  getProducts(query?: ProductsQueryDto): Observable<PaginatedResponse<ProductDto>> {
    let params = new HttpParams();

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<ProductDto>>(
      `${environment.apiUrl}/products`,
      { params }
    );
  }

  getProduct(id: number): Observable<ProductDto> {
    return this.http.get<ProductDto>(`${environment.apiUrl}/products/${id}`);
  }

  createProduct(product: CreateProductDto): Observable<ProductDto> {
    return this.http.post<ProductDto>(`${environment.apiUrl}/products`, product);
  }

  updateProduct(id: number, product: UpdateProductDto): Observable<ProductDto> {
    return this.http.patch<ProductDto>(
      `${environment.apiUrl}/products/${id}`,
      product
    );
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/products/${id}`);
  }

  getProductStats(): Observable<{
    total: number;
    active: number;
    inactive: number;
    totalValue: number;
    averagePrice: number;
  }> {
    return this.http.get<{
      total: number;
      active: number;
      inactive: number;
      totalValue: number;
      averagePrice: number;
    }>(`${environment.apiUrl}/products/stats`);
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/products/categories`);
  }

  updateStock(id: number, quantity: number): Observable<ProductDto> {
    return this.http.patch<ProductDto>(
      `${environment.apiUrl}/products/${id}/stock`,
      { quantity }
    );
  }

  bulkUpdateStatus(productIds: number[], isActive: boolean): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/products/bulk/status`, {
      ids: productIds,
      isActive,
    });
  }
}

