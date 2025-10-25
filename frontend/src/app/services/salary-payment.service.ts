import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SalaryPaymentDto,
  CreateSalaryPaymentDto,
  UpdateSalaryPaymentDto,
  EngineerBalanceDto,
  EngineerBalanceDetailDto,
  PaymentType,
} from '../../../../shared/dtos/salary-payment.dto';

@Injectable({
  providedIn: 'root',
})
export class SalaryPaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/salary-payments`;

  /**
   * Create a new payment
   */
  createPayment(payment: CreateSalaryPaymentDto): Observable<SalaryPaymentDto> {
    return this.http.post<SalaryPaymentDto>(this.apiUrl, payment);
  }

  /**
   * Get all payments for an engineer
   */
  getEngineerPayments(
    engineerId: number,
    options?: {
      year?: number;
      month?: number;
      type?: PaymentType;
      limit?: number;
    }
  ): Observable<SalaryPaymentDto[]> {
    let params: any = {};
    if (options?.year) params.year = options.year.toString();
    if (options?.month) params.month = options.month.toString();
    if (options?.type) params.type = options.type;
    if (options?.limit) params.limit = options.limit.toString();

    return this.http.get<SalaryPaymentDto[]>(`${this.apiUrl}/engineer/${engineerId}`, { params });
  }

  /**
   * Get payments for a salary calculation
   */
  getPaymentsByCalculation(calculationId: number): Observable<SalaryPaymentDto[]> {
    return this.http.get<SalaryPaymentDto[]>(`${this.apiUrl}/calculation/${calculationId}`);
  }

  /**
   * Update a payment
   */
  updatePayment(id: number, payment: UpdateSalaryPaymentDto): Observable<SalaryPaymentDto> {
    return this.http.put<SalaryPaymentDto>(`${this.apiUrl}/${id}`, payment);
  }

  /**
   * Delete a payment
   */
  deletePayment(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get engineer balance
   */
  getEngineerBalance(engineerId: number): Observable<EngineerBalanceDto> {
    return this.http.get<EngineerBalanceDto>(`${this.apiUrl}/balance/${engineerId}`);
  }

  /**
   * Get detailed engineer balance
   */
  getEngineerBalanceDetail(engineerId: number): Observable<EngineerBalanceDetailDto> {
    return this.http.get<EngineerBalanceDetailDto>(`${this.apiUrl}/balance/${engineerId}/detail`);
  }

  /**
   * Get all engineers balances
   */
  getAllEngineersBalances(): Observable<EngineerBalanceDto[]> {
    return this.http.get<EngineerBalanceDto[]>(`${this.apiUrl}/balances`);
  }
}
