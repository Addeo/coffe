import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthLoginDto, AuthLoginResponse, AuthUserDto } from '@shared/dtos/user.dto';
import { UserRole, User } from '@shared/interfaces/user.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Reactive state using Angular signals
  private currentUserSignal = signal<AuthUserDto | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);
  private isLoadingSignal = signal<boolean>(false);

  // Public signals for components
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();

  constructor() {
    this.checkAuthStatus();
    console.log('🔐 AuthService initialized');
    console.log('🔐 Current auth state:', {
      isAuthenticated: this.isAuthenticated(),
      currentUser: this.currentUser(),
      token: this.getToken() ? 'present' : 'missing',
    });
  }

  login(credentials: AuthLoginDto): Observable<AuthLoginResponse> {
    this.isLoadingSignal.set(true);

    console.log('🔐 Login attempt:', {
      email: credentials.email,
      password: credentials.password ? '[HIDDEN]' : '',
      apiUrl: `${environment.apiUrl}/auth/login`,
    });

    return this.http.post<AuthLoginResponse>(environment.authUrl, credentials).pipe(
      tap(response => {
        console.log('✅ Login successful:', {
          user: response.user,
          tokenLength: response.access_token.length,
        });
        this.setSession(response);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        console.error('❌ Login failed:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.error?.message || error.message,
          fullError: error,
        });
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private setSession(authResult: AuthLoginResponse): void {
    localStorage.setItem('access_token', authResult.access_token);
    localStorage.setItem('user', JSON.stringify(authResult.user));
    this.currentUserSignal.set(authResult.user);
    this.isAuthenticatedSignal.set(true);
  }

  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
  }

  private checkAuthStatus(): void {
    console.log('🔐 Checking auth status...');
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');

    console.log('🔐 Stored data:', {
      hasToken: !!token,
      hasUser: !!user,
      tokenLength: token?.length,
      userData: user,
    });

    if (token && user) {
      try {
        const userData = JSON.parse(user);
        console.log('🔐 Parsed user data:', userData);
        this.currentUserSignal.set(userData);
        this.isAuthenticatedSignal.set(true);
        console.log('🔐 Auth status set to authenticated');
      } catch (error) {
        console.error('🔐 Failed to parse user data:', error);
        this.clearSession();
      }
    } else {
      console.log('🔐 No stored auth data found');
    }
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  hasRole(role: UserRole): boolean {
    const user = this.currentUserSignal();
    return user?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const user = this.currentUserSignal();
    return user ? roles.includes(user.role) : false;
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  isManager(): boolean {
    return this.hasRole(UserRole.MANAGER);
  }

  isUser(): boolean {
    return this.hasRole(UserRole.USER);
  }
}
