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
      <app-navigation *ngIf="isAuthenticated() && !isLoginRoute()"></app-navigation>

      <!-- Main content -->
      <main
        id="main-content"
        class="main-content"
        [class.with-nav]="isAuthenticated() && !isLoginRoute()"
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
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  title = 'coffee-admin';

  /* Reactive computed values */
  isAuthenticated = this.authService.isAuthenticated;

  /* Check if current route is login */
  isLoginRoute = computed(() => {
    return this.router.url === '/login';
  });

  constructor() {
    console.log('🏠 AppComponent initialized');
    console.log('🏠 Initial auth state:', this.isAuthenticated());
    console.log('🏠 Current route:', this.router.url);
    console.log('🎨 Theme service initialized:', this.themeService.currentTheme());
  }

  ngOnInit(): void {
    // Listen for navigation events to ensure auth state is properly updated
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      const navigationEnd = event as NavigationEnd;
      console.log('🏠 Navigation ended:', navigationEnd.url);

      // Force auth state refresh after navigation
      setTimeout(() => {
        console.log('🏠 Auth state after navigation:', this.isAuthenticated());
        this.authService.refreshAuthState();

        // Force change detection using Angular's ChangeDetectorRef
        this.cdr.detectChanges();

        // Additional change detection trigger
        setTimeout(() => {
          this.cdr.markForCheck();
          console.log('🏠 Change detection completed');
        }, 50);
      }, 100);
    });
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }
}
