import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  OrganizationDto,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationsQueryDto,
} from '@shared/dtos/organization.dto';
import { PaginatedResponse } from '@shared/types/api.types';

@Injectable({
  providedIn: 'root',
})
export class OrganizationsService {
  private http = inject(HttpClient);

  getOrganizations(query?: OrganizationsQueryDto): Observable<PaginatedResponse<OrganizationDto>> {
    let params = new HttpParams();

    if (query?.page !== undefined) {
      params = params.set('page', query.page.toString());
    }

    if (query?.limit !== undefined) {
      params = params.set('limit', query.limit.toString());
    }

    if (query?.search) {
      params = params.set('search', query.search);
    }

    if (query?.isActive !== undefined) {
      params = params.set('isActive', query.isActive.toString());
    }

    if (query?.sortBy) {
      params = params.set('sortBy', query.sortBy);
    }

    if (query?.sortOrder) {
      params = params.set('sortOrder', query.sortOrder);
    }

    return this.http.get<PaginatedResponse<OrganizationDto>>(
      `${environment.apiUrl}/organizations`,
      { params }
    );
  }

  getOrganization(id: number): Observable<OrganizationDto> {
    return this.http.get<OrganizationDto>(`${environment.apiUrl}/organizations/${id}`);
  }

  createOrganization(organization: CreateOrganizationDto): Observable<OrganizationDto> {
    return this.http.post<OrganizationDto>(`${environment.apiUrl}/organizations`, organization);
  }

  updateOrganization(id: number, organization: UpdateOrganizationDto): Observable<OrganizationDto> {
    return this.http.patch<OrganizationDto>(
      `${environment.apiUrl}/organizations/${id}`,
      organization
    );
  }

  deleteOrganization(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/organizations/${id}`);
  }

  toggleOrganizationStatus(id: number): Observable<OrganizationDto> {
    return this.http.patch<OrganizationDto>(
      `${environment.apiUrl}/organizations/${id}/toggle-status`,
      {}
    );
  }
}
