import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FileUploadDto,
  FileResponseDto,
  FileQueryDto,
  FileType,
  UploadFileDto
} from '@shared/dtos/file.dto';
import { PaginatedResponse } from '@shared/types/api.types';

@Injectable({
  providedIn: 'root',
})
export class FilesService {
  private http = inject(HttpClient);

  uploadFile(file: File, type?: FileType, description?: string): Observable<FileResponseDto> {
    const formData = new FormData();
    formData.append('file', file);
    if (type) {
      formData.append('type', type);
    }
    if (description) {
      formData.append('description', description);
    }

    return this.http.post<FileResponseDto>(`${environment.apiUrl}/files/upload`, formData);
  }

  uploadAvatar(file: File): Observable<FileResponseDto> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<FileResponseDto>(`${environment.apiUrl}/files/upload/avatar`, formData);
  }

  getFiles(query: FileQueryDto = {}): Observable<PaginatedResponse<FileResponseDto>> {
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

    return this.http.get<PaginatedResponse<FileResponseDto>>(`${environment.apiUrl}/files`, { params });
  }

  getMyFiles(query: FileQueryDto = {}): Observable<PaginatedResponse<FileResponseDto>> {
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

    return this.http.get<PaginatedResponse<FileResponseDto>>(`${environment.apiUrl}/files/my-files`, { params });
  }

  getFileStats(): Observable<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
  }> {
    return this.http.get<{
      totalFiles: number;
      totalSize: number;
      filesByType: Record<string, number>;
    }>(`${environment.apiUrl}/files/stats`);
  }

  getFilesByOrderId(orderId: number): Observable<FileResponseDto[]> {
    return this.http.get<FileResponseDto[]>(`${environment.apiUrl}/files/get-order-files/${orderId}`);
  }

  getFile(fileId: string): Observable<FileResponseDto> {
    return this.http.get<FileResponseDto>(`${environment.apiUrl}/files/file/${fileId}`);
  }

  updateFile(fileId: string, description?: string, type?: FileType): Observable<FileResponseDto> {
    return this.http.post<FileResponseDto>(`${environment.apiUrl}/files/file/${fileId}`, {
      description,
      type,
    });
  }

  deleteFile(fileId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/files/file/${fileId}`);
  }

  downloadFile(fileId: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/files/${fileId}/download`, {
      responseType: 'blob',
    });
  }

  viewFile(fileId: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/files/${fileId}/view`, {
      responseType: 'blob',
    });
  }

  getFilesByType(type: FileType, query: FileQueryDto = {}): Observable<PaginatedResponse<FileResponseDto>> {
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

    return this.http.get<PaginatedResponse<FileResponseDto>>(`${environment.apiUrl}/files/type/${type}`, { params });
  }

  // Метод для прикрепления файла к заказу
  attachFileToOrder(orderId: number, fileId: string): Observable<FileResponseDto> {
    return this.http.post<FileResponseDto>(`${environment.apiUrl}/files/file/${fileId}/attach-to-order`, {
      orderId,
    });
  }

  // Метод для открепления файла от заказа
  detachFileFromOrder(fileId: string): Observable<FileResponseDto> {
    return this.http.post<FileResponseDto>(`${environment.apiUrl}/files/file/${fileId}/detach-from-order`, {});
  }
}
