import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateOrderDto,
  UpdateOrderDto,
  AssignEngineerDto,
  OrdersQueryDto,
  OrderDto,
} from '@shared/dtos/order.dto';
import { PaginatedResponse } from '@shared/types/api.types';
import { OrderStatus } from '@shared/interfaces/order.interface';

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private http = inject(HttpClient);

  createOrder(order: CreateOrderDto): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${environment.apiUrl}/orders`, order);
  }

  getOrders(query: OrdersQueryDto = {}): Observable<PaginatedResponse<OrderDto>> {
    let params = new HttpParams();

    if (query.page !== undefined) {
      params = params.set('page', query.page.toString());
    }

    if (query.limit !== undefined) {
      params = params.set('limit', query.limit.toString());
    }

    if (query.status) {
      params = params.set('status', query.status);
    }

    if (query.organizationId) {
      params = params.set('organizationId', query.organizationId.toString());
    }

    if (query.engineerId) {
      params = params.set('engineerId', query.engineerId.toString());
    }

    if (query.sortBy) {
      params = params.set('sortBy', query.sortBy);
    }

    if (query.sortOrder) {
      params = params.set('sortOrder', query.sortOrder);
    }

    return this.http.get<PaginatedResponse<OrderDto>>(`${environment.apiUrl}/orders`, { params });
  }

  getOrderStats(): Observable<{
    total: number;
    waiting: number;
    processing: number;
    working: number;
    review: number;
    completed: number;
  }> {
    return this.http.get<{
      total: number;
      waiting: number;
      processing: number;
      working: number;
      review: number;
      completed: number;
    }>(`${environment.apiUrl}/orders/stats`);
  }

  getOrder(id: number): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${environment.apiUrl}/orders/${id}`);
  }

  updateOrder(id: number, order: UpdateOrderDto): Observable<OrderDto> {
    return this.http.patch<OrderDto>(`${environment.apiUrl}/orders/${id}`, order);
  }

  assignEngineer(id: number, engineerData: AssignEngineerDto): Observable<OrderDto> {
    return this.http.post<OrderDto>(
      `${environment.apiUrl}/orders/${id}/assign-engineer`,
      engineerData
    );
  }

  deleteOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/orders/${id}`);
  }

  // Convenience methods for status updates
  startOrder(id: number): Observable<OrderDto> {
    return this.updateOrder(id, { status: OrderStatus.WORKING });
  }

  completeOrder(id: number): Observable<OrderDto> {
    return this.updateOrder(id, { status: OrderStatus.COMPLETED });
  }

  // Batch operations
  updateMultipleOrders(orderIds: number[], updates: UpdateOrderDto): Observable<OrderDto[]> {
    return this.http.patch<OrderDto[]>(`${environment.apiUrl}/orders/batch`, {
      ids: orderIds,
      updates,
    });
  }
}
