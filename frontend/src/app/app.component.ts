import {
  Component,
  inject,
  computed,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { StartupService } from './services/startup.service';
import { NavigationComponent } from './components/navigation/navigation.component';
import { OrderSidebarComponent } from './components/sidebars/order-sidebar.component';
import { MatDialog } from '@angular/material/dialog';
import { AgreementsService, Agreement } from './services/agreements.service';
import { AgreementAcceptanceDialogComponent } from './components/agreement-acceptance-dialog/agreement-acceptance-dialog.component';
import { effect } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavigationComponent],
  template: `
    <div class="app-container">
      <!-- Skip to main content link for accessibility -->
      <a href="#main-content" class="skip-to-main">Skip to main content</a>

      <!-- Navigation bar (only show when authenticated) -->
      <app-navigation *ngIf="shouldShowNav()"></app-navigation>

      <!-- Main content -->
      <main
        id="main-content"
        class="main-content"
        [class.with-nav]="shouldShowNav()"
        role="main"
        tabindex="-1"
      >
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .app-container {
        min-height: 100vh;
        background-color: var(--bg-primary);
        color: var(--text-primary);
        font-family: 'Roboto', 'Helvetica Neue', sans-serif;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        transition:
          background-color 0.3s ease,
          color 0.3s ease;
      }

      .main-content {
        transition: all 0.3s ease;
        position: relative;

        &.with-nav {
          margin-top: 64px;
          min-height: calc(100vh - 64px);
        }

        /* Ensure smooth transitions for content */
        ::ng-deep * {
          transition: inherit;
        }
      }

      /* Ensure login page takes full height */
      ::ng-deep router-outlet + * {
        display: block;
        height: 100%;
        width: 100%;
      }

      /* Global loading state styling */
      ::ng-deep .mat-mdc-progress-spinner {
        circle {
          stroke: var(--color-accent);
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private startupService = inject(StartupService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private agreementsService = inject(AgreementsService);

  private agreementDialogShown = false; // Флаг, чтобы не показывать диалог повторно

  title = 'coffee-admin';

  /* Reactive computed values */
  isAuthenticated = this.authService.isAuthenticated;
  private readonly routerUrl = signal(this.router.url);

  /* Check if current route is login */
  private readonly publicRoutes = ['/login', '/company'];

  isPublicRoute = computed(() => {
    const currentUrl = this.routerUrl();
    const sanitizedUrl = currentUrl.split('?')[0]?.split('#')[0]?.split(';')[0] ?? currentUrl;
    const normalizedUrl = sanitizedUrl !== '/' && sanitizedUrl.endsWith('/')
      ? sanitizedUrl.replace(/\/+$/, '')
      : sanitizedUrl;
    const urlToCheck = normalizedUrl.toLowerCase();

    return this.publicRoutes.some(route => {
      const normalizedRoute = route.toLowerCase();
      return urlToCheck === normalizedRoute || urlToCheck.startsWith(`${normalizedRoute}/`);
    });
  });

  /* Computed values for template */
  shouldShowNav = computed(() => {
    return this.isAuthenticated() && !this.isPublicRoute();
  });

  constructor() {
    console.log('🏠 AppComponent initialized');
    console.log('🏠 Initial auth state:', this.isAuthenticated());
    console.log('🏠 Current route:', this.router.url);
    console.log('🎨 Theme service initialized:', this.themeService.currentTheme());
  }

  ngOnInit(): void {
    // Проверяем наличие обновлений при старте приложения
    this.startupService.checkForUpdates();

    // Следим за изменением статуса аутентификации
    effect(() => {
      const isAuth = this.isAuthenticated();
      const status = this.authService.agreementsStatus();
      
      // Если пользователь авторизован и диалог еще не был показан
      if (isAuth && !this.agreementDialogShown) {
        // Проверяем статус соглашений
        if (status && !status.hasAcceptedAll && status.missingAgreements.length > 0) {
          this.showAgreementDialog(status.missingAgreements);
          this.agreementDialogShown = true;
        } else if (!status) {
          // Если статус не загружен, загружаем его
          this.authService.checkAgreementsStatus().subscribe(result => {
            if (!result.hasAcceptedAll && result.missingAgreements.length > 0) {
              this.showAgreementDialog(result.missingAgreements);
              this.agreementDialogShown = true;
            }
          });
        }
      } else if (!isAuth) {
        // При выходе сбрасываем флаг
        this.agreementDialogShown = false;
      }
    });

    // Auth state is reactive and managed by signals - no need to refresh on navigation
    // Signals will automatically update UI when auth state changes
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      const navigationEnd = event as NavigationEnd;
      const latestUrl = navigationEnd.urlAfterRedirects ?? navigationEnd.url;
      this.routerUrl.set(latestUrl);
      console.log('🏠 Navigation ended:', latestUrl);
      // No need to refresh auth state - it's already reactive via signals
    });
  }

  /**
   * Показать диалог принятия соглашений
   */
  private async showAgreementDialog(missingAgreements: any[]): Promise<void> {
    // Загружаем полные данные соглашений
    const agreements: Agreement[] = [];
    
    try {
      for (const missing of missingAgreements) {
        const agreement = await this.agreementsService.getAgreementById(missing.id).toPromise();
        if (agreement) {
          agreements.push(agreement);
        }
      }

      if (agreements.length > 0) {
        const dialogRef = this.dialog.open(AgreementAcceptanceDialogComponent, {
          width: '900px',
          maxWidth: '95vw',
          disableClose: true, // Нельзя закрыть без принятия обязательных соглашений
          data: {
            agreements,
            missingAgreements,
            canClose: false, // Нельзя закрыть без принятия
          },
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result && result.accepted) {
            console.log('✅ Соглашения приняты');
            // Обновляем статус
            this.authService.checkAgreementsStatus().subscribe();
          } else {
            // Если не приняты, выходим из системы
            console.log('❌ Соглашения не приняты, выход из системы');
            this.authService.logout();
          }
        });
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки соглашений:', error);
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }
}
