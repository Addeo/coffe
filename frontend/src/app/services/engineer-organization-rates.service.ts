import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  EngineerOrganizationRateDto,
  CreateEngineerOrganizationRateDto,
  UpdateEngineerOrganizationRateDto,
  EngineerOrganizationRatesQueryDto,
} from '@shared/dtos/engineer-organization-rate.dto';

@Injectable({
  providedIn: 'root',
})
export class EngineerOrganizationRatesService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/api/engineer-organization-rates';

  getRates(query: EngineerOrganizationRatesQueryDto = {}): Observable<EngineerOrganizationRateDto[]> {
    let params = new HttpParams();

    if (query.engineerId) {
      params = params.set('engineerId', query.engineerId.toString());
    }
    if (query.organizationId) {
      params = params.set('organizationId', query.organizationId.toString());
    }
    if (query.isActive !== undefined) {
      params = params.set('isActive', query.isActive.toString());
    }
    if (query.page) {
      params = params.set('page', query.page.toString());
    }
    if (query.limit) {
      params = params.set('limit', query.limit.toString());
    }

    return this.http.get<EngineerOrganizationRateDto[]>(this.apiUrl, { params });
  }

  getRate(id: number): Observable<EngineerOrganizationRateDto> {
    return this.http.get<EngineerOrganizationRateDto>(`${this.apiUrl}/${id}`);
  }

  getRateByEngineerAndOrganization(
    engineerId: number,
    organizationId: number
  ): Observable<EngineerOrganizationRateDto | null> {
    return this.http
      .get<EngineerOrganizationRateDto>(
        `${this.apiUrl}/engineer/${engineerId}/organization/${organizationId}`
      )
      .pipe(
        map(rate => rate || null)
      );
  }

  createRate(rate: CreateEngineerOrganizationRateDto): Observable<EngineerOrganizationRateDto> {
    return this.http.post<EngineerOrganizationRateDto>(this.apiUrl, rate);
  }

  updateRate(id: number, rate: UpdateEngineerOrganizationRateDto): Observable<EngineerOrganizationRateDto> {
    return this.http.patch<EngineerOrganizationRateDto>(`${this.apiUrl}/${id}`, rate);
  }

  deleteRate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Bulk operations
  bulkUpdateRates(updates: { id: number; data: UpdateEngineerOrganizationRateDto }[]): Observable<EngineerOrganizationRateDto[]> {
    return this.http.patch<EngineerOrganizationRateDto[]>(`${this.apiUrl}/bulk`, { updates });
  }

  // Helper methods
  getActiveRatesForEngineer(engineerId: number): Observable<EngineerOrganizationRateDto[]> {
    return this.getRates({ engineerId, isActive: true });
  }

  getActiveRatesForOrganization(organizationId: number): Observable<EngineerOrganizationRateDto[]> {
    return this.getRates({ organizationId, isActive: true });
  }
}
