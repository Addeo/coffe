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

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (value instanceof Date) {
          params = params.set(key, value.toISOString());
        } else {
          params = params.set(key, value.toString());
        }
      }
    });

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

  // Work Report Methods
  createWorkReport(
    orderId: number,
    workReportData: {
      regularHours: number;
      overtimeHours: number;
      carPayment: number;
      distanceKm?: number;
      territoryType?: string;
      notes?: string;
    }
  ): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/orders/${orderId}/work-reports`,
      workReportData
    );
  }

  getWorkReports(orderId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/orders/${orderId}/work-reports`);
  }
}
