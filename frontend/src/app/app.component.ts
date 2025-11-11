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

  ngOnDestroy(): void {
    // Cleanup if needed
  }
}
