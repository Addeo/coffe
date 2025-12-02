import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import {
  AuthLoginDto,
  AuthLoginResponse,
  AuthUserDto,
  SwitchRoleDto,
  SwitchRoleResponse,
} from '@shared/dtos/user.dto';
import {
  UserRole,
  User,
  getAvailableRoles,
  hasRoleAccess,
} from '@shared/interfaces/user.interface';
import { environment } from '../../environments/environment';
import { ErrorHandlerUtil } from '../utils/error-handler.util';
import { AgreementsService, AgreementsStatus } from './agreements.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private agreementsService = inject(AgreementsService);

  // Статус принятия соглашений
  private agreementsStatusSignal = signal<AgreementsStatus | null>(null);
  readonly agreementsStatus = this.agreementsStatusSignal.asReadonly();

  // Reactive state using Angular signals
  private currentUserSignal = signal<AuthUserDto | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);
  private isLoadingSignal = signal<boolean>(false);

  // Public signals for components
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();

  // Computed signals for role management
  readonly primaryRole = computed(() => {
    const user = this.currentUser();
    const role = user?.primaryRole || user?.role;
    console.log('🔐 primaryRole computed:', { user, role });
    return role;
  });
  readonly activeRole = computed(() => {
    const user = this.currentUser();
    const active = user?.activeRole || this.primaryRole();
    console.log('🔐 activeRole computed:', { user, active, primaryRole: this.primaryRole() });
    return active;
  });
  readonly availableRoles = computed(() => {
    const primary = this.primaryRole();
    const roles = primary ? getAvailableRoles(primary) : [];
    console.log('🔐 availableRoles computed:', { primary, roles });
    return roles;
  });
  readonly canSwitchRoles = computed(() => this.availableRoles().length > 1);

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

    let authUrl = environment.authUrl;
    const apiUrl = environment.apiUrl;

    // Проверяем, что authUrl абсолютный, а не относительный
    if (authUrl.startsWith('/')) {
      console.warn('⚠️ WARNING: authUrl is relative! Converting to absolute URL.');
      // Если authUrl относительный, формируем абсолютный на основе apiUrl
      if (authUrl.startsWith('/api')) {
        // Если начинается с /api, убираем /api из apiUrl и добавляем authUrl
        const baseUrl = apiUrl.replace('/api', '');
        authUrl = `${baseUrl}${authUrl}`;
      } else {
        // Иначе просто добавляем к apiUrl
        authUrl = `${apiUrl}${authUrl}`;
      }
      console.log('🔧 Converted authUrl to:', authUrl);
    }

    console.log('🔐 Login attempt:', {
      email: credentials.email,
      password: credentials.password ? '[HIDDEN]' : '',
      authUrl,
      apiUrl,
      production: environment.production,
    });

    return this.http.post<AuthLoginResponse & { agreements?: any }>(authUrl, credentials).pipe(
      tap(response => {
        console.log('✅ Login successful:', {
          user: response.user,
          tokenLength: response.access_token.length,
          agreements: response.agreements,
        });
        this.setSession(response);
        // Сохраняем статус соглашений
        if (response.agreements) {
          this.agreementsStatusSignal.set(response.agreements);
        }
        this.isLoadingSignal.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        const errorDetails = ErrorHandlerUtil.getErrorDetails(error);
        console.error('❌ Login failed:', errorDetails);
        this.isLoadingSignal.set(false);
        // Create a new error with user-friendly message
        const userFriendlyError = new HttpErrorResponse({
          error: { message: ErrorHandlerUtil.getErrorMessage(error) },
          status: error.status,
          statusText: error.statusText,
          url: error.url ?? undefined,
        });
        return throwError(() => userFriendlyError);
      })
    );
  }

  logout(): void {
    // Сбросить роль на primaryRole перед выходом
    // Это гарантирует, что при следующем входе пользователь будет с основной ролью
    if (this.isAuthenticated() && this.currentUser()) {
      const primaryRole = this.primaryRole();
      const activeRole = this.activeRole();

      // Если активная роль отличается от основной, сбросить её на бэкенде
      if (activeRole !== primaryRole) {
        console.log('🔄 Resetting role to primary before logout:', {
          currentActive: activeRole,
          primary: primaryRole,
        });

        // Вызываем API для сброса роли на бэкенде (не блокируем выход)
        this.resetRole().subscribe({
          next: () => {
            console.log('✅ Role reset successfully on backend before logout');
          },
          error: error => {
            // Логируем ошибку, но не блокируем выход
            console.warn('⚠️ Failed to reset role on backend before logout (non-blocking):', error);
          },
        });
      }
    }

    // Очищаем сессию и перенаправляем на логин (не ждем завершения resetRole)
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /**
   * Проверить статус принятия соглашений
   */
  checkAgreementsStatus(): Observable<AgreementsStatus> {
    return this.agreementsService.checkUserAgreements().pipe(
      tap(status => {
        this.agreementsStatusSignal.set(status);
      })
    );
  }

  /**
   * Проверить, нужно ли показать диалог принятия соглашений
   */
  needsAgreementAcceptance(): boolean {
    const status = this.agreementsStatusSignal();
    return status ? !status.hasAcceptedAll : false;
  }

  private setSession(authResult: AuthLoginResponse & { agreements?: any }): void {
    console.log('🔐 Setting session:', authResult);
    console.log('🔐 User role data:', {
      role: authResult.user?.role,
      primaryRole: authResult.user?.primaryRole,
      activeRole: authResult.user?.activeRole,
    });

    // Store in localStorage
    localStorage.setItem('access_token', authResult.access_token);
    localStorage.setItem('user', JSON.stringify(authResult.user));

    // Update signals immediately with proper change detection
    this.currentUserSignal.set(authResult.user);
    this.isAuthenticatedSignal.set(true);

    // Log computed role values
    console.log('🔐 Session set, computed roles:', {
      primaryRole: this.primaryRole(),
      activeRole: this.activeRole(),
      availableRoles: this.availableRoles(),
      canSwitchRoles: this.canSwitchRoles(),
    });

    console.log('🔐 Session set, auth state:', {
      isAuthenticated: this.isAuthenticatedSignal(),
      currentUser: this.currentUserSignal(),
    });

    // Force change detection using Angular's change detection
    setTimeout(() => {
      // Trigger change detection by updating signals again
      this.currentUserSignal.update(user => user);
      this.isAuthenticatedSignal.update(auth => auth);
      console.log('🔐 Change detection triggered');
    }, 0);
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
        console.log('🔐 User role fields:', {
          role: userData.role,
          primaryRole: userData.primaryRole,
          activeRole: userData.activeRole,
        });
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

  /**
   * Force refresh auth state - useful after login to ensure UI updates
   */
  refreshAuthState(): void {
    console.log('🔐 Forcing auth state refresh');
    this.checkAuthStatus();

    // Force change detection after state update
    setTimeout(() => {
      this.currentUserSignal.update(user => user);
      this.isAuthenticatedSignal.update(auth => auth);
      console.log('🔐 Auth state refresh completed with change detection');
    }, 0);
  }

  /**
   * Retry authentication check - validates current session without API call
   */
  retryAuthCheck(): Observable<boolean> {
    console.log('🔐 Retrying authentication check...');

    // Simply re-check the stored data and update signals
    const token = this.getToken();
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      console.log('🔐 No token or user data found, setting unauthenticated');
      this.isAuthenticatedSignal.set(false);
      this.currentUserSignal.set(null);
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    try {
      const user = JSON.parse(userData);
      console.log('✅ Token and user data found, setting authenticated');
      this.currentUserSignal.set(user);
      this.isAuthenticatedSignal.set(true);

      return new Observable(observer => {
        observer.next(true);
        observer.complete();
      });
    } catch (error) {
      console.error('❌ Failed to parse user data:', error);
      this.clearSession();
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }
  }

  /**
   * Check if current active role matches the specified role
   */
  hasRole(role: UserRole): boolean {
    return this.activeRole() === role;
  }

  /**
   * Check if current active role is one of the specified roles
   * IMPORTANT: Checks ACTIVE role, not primary role
   * This allows admin to switch to manager/user and have restricted access
   */
  hasAnyRole(roles: UserRole[]): boolean {
    const active = this.activeRole();
    const primary = this.primaryRole();

    // Check if active role is in the required roles list
    const result = active ? roles.includes(active) : false;

    console.log('🔐 AuthService.hasAnyRole:', {
      activeRole: active,
      primaryRole: primary,
      requiredRoles: roles,
      result,
    });

    return result;
  }

  /**
   * Check if user has access to a specific role (based on hierarchy)
   */
  hasAccessToRole(requiredRole: UserRole): boolean {
    const primary = this.primaryRole();
    return primary ? hasRoleAccess(primary, requiredRole) : false;
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

  /**
   * Switch to a different role within user's hierarchy
   */
  switchRole(newRole: UserRole): Observable<SwitchRoleResponse> {
    this.isLoadingSignal.set(true);

    console.log('🔄 Switching role to:', newRole);

    return this.http
      .post<SwitchRoleResponse>(`${environment.apiUrl}/auth/switch-role`, { newRole })
      .pipe(
        tap(response => {
          console.log('✅ Role switched successfully:', response);

          // Update token
          if (response.access_token) {
            localStorage.setItem('access_token', response.access_token);
          }

          // Update user with new active role
          if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
            this.currentUserSignal.set(response.user);
          }

          this.isLoadingSignal.set(false);
        }),
        catchError((error: HttpErrorResponse) => {
          const errorDetails = ErrorHandlerUtil.getErrorDetails(error);
          console.error('❌ Failed to switch role:', errorDetails);
          this.isLoadingSignal.set(false);
          const userFriendlyError = new HttpErrorResponse({
            error: { message: ErrorHandlerUtil.getErrorMessage(error) },
            status: error.status,
            statusText: error.statusText,
            url: error.url ?? undefined,
          });
          return throwError(() => userFriendlyError);
        })
      );
  }

  /**
   * Reset to primary role
   */
  resetRole(): Observable<SwitchRoleResponse> {
    this.isLoadingSignal.set(true);

    console.log('🔄 Resetting to primary role');

    return this.http.post<SwitchRoleResponse>(`${environment.apiUrl}/auth/reset-role`, {}).pipe(
      tap(response => {
        console.log('✅ Role reset successfully:', response);

        // Update token
        if (response.access_token) {
          localStorage.setItem('access_token', response.access_token);
        }

        // Update user
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          this.currentUserSignal.set(response.user);
        }

        this.isLoadingSignal.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        const errorDetails = ErrorHandlerUtil.getErrorDetails(error);
        console.error('❌ Failed to reset role:', errorDetails);
        this.isLoadingSignal.set(false);
        const userFriendlyError = new HttpErrorResponse({
          error: { message: ErrorHandlerUtil.getErrorMessage(error) },
          status: error.status,
          statusText: error.statusText,
          url: error.url ?? undefined,
        });
        return throwError(() => userFriendlyError);
      })
    );
  }

  /**
   * Get display name for a role
   */
  getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'Руководитель';
      case UserRole.MANAGER:
        return 'логист';
      case UserRole.USER:
        return 'Инженер';
      default:
        return 'Пользователь';
    }
  }

  /**
   * Get icon for a role
   */
  getRoleIcon(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'admin_panel_settings';
      case UserRole.MANAGER:
        return 'manage_accounts';
      case UserRole.USER:
        return 'engineering';
      default:
        return 'person';
    }
  }
}
