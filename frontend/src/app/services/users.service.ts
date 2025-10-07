import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserDto, CreateUserDto, UpdateUserDto, UsersQueryDto } from '@shared/dtos/user.dto';
import { PaginatedResponse } from '@shared/types/api.types';

export interface UserDeletionCheck {
  canDelete: boolean;
  conflicts?: UserDeletionConflict[];
}

export interface UserDeletionConflict {
  table: string;
  count: number;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private http = inject(HttpClient);

  getUsers(query?: UsersQueryDto): Observable<PaginatedResponse<UserDto>> {
    let params = new HttpParams();

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<UserDto>>(`${environment.apiUrl}/users`, { params });
  }

  getUser(id: number): Observable<UserDto> {
    return this.http.get<UserDto>(`${environment.apiUrl}/users/${id}`);
  }

  createUser(user: CreateUserDto): Observable<UserDto> {
    return this.http.post<UserDto>(`${environment.apiUrl}/users`, user);
  }

  updateUser(id: number, user: UpdateUserDto): Observable<UserDto> {
    return this.http.patch<UserDto>(`${environment.apiUrl}/users/${id}`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/${id}`);
  }

  checkUserDeletion(id: number): Observable<UserDeletionCheck> {
    return this.http.delete<UserDeletionCheck>(`${environment.apiUrl}/users/${id}`);
  }

  forceDeleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/${id}/force`);
  }

  getUserProfile(): Observable<UserDto> {
    return this.http.get<UserDto>(`${environment.apiUrl}/users/profile`);
  }

  updateProfile(user: UpdateUserDto): Observable<UserDto> {
    return this.http.patch<UserDto>(`${environment.apiUrl}/users/profile`, user);
  }
}
