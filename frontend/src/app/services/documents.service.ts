import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentResponseDto,
  DocumentQueryDto,
} from '@shared/dtos/document.dto';
import { PaginatedResponse } from '@shared/types/api.types';

export enum DocumentCategory {
  RULES = 'rules',
  TERMS = 'terms',
  REGULATIONS = 'regulations',
  OTHER = 'other',
}

@Injectable({
  providedIn: 'root',
})
export class DocumentsService {
  private http = inject(HttpClient);

  private get apiUrl(): string {
    return `${environment.apiUrl}/documents`;
  }

  create(file: File, createDto: CreateDocumentDto): Observable<DocumentResponseDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', createDto.title);
    formData.append('category', createDto.category);
    if (createDto.description) {
      formData.append('description', createDto.description);
    }

    return this.http.post<DocumentResponseDto>(this.apiUrl, formData);
  }

  findAll(query: DocumentQueryDto = {}): Observable<PaginatedResponse<DocumentResponseDto>> {
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<PaginatedResponse<DocumentResponseDto>>(this.apiUrl, { params });
  }

  findByCategory(category: DocumentCategory): Observable<DocumentResponseDto[]> {
    return this.http.get<DocumentResponseDto[]>(`${this.apiUrl}/category/${category}`);
  }

  findOne(id: string): Observable<DocumentResponseDto> {
    return this.http.get<DocumentResponseDto>(`${this.apiUrl}/${id}`);
  }

  update(id: string, updateDto: UpdateDocumentDto): Observable<DocumentResponseDto> {
    return this.http.put<DocumentResponseDto>(`${this.apiUrl}/${id}`, updateDto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getViewUrl(id: string): string {
    return `${this.apiUrl}/${id}/view`;
  }

  getDownloadUrl(id: string): string {
    return `${this.apiUrl}/${id}/download`;
  }
}

