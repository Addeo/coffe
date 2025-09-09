import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from './services/auth.service';
import { NavigationComponent } from './components/navigation/navigation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavigationComponent],
  template: `
    <div class="app-container">
      <!-- Navigation bar (only show when authenticated) -->
      <app-navigation *ngIf="isAuthenticated() && !isLoginRoute()"></app-navigation>

      <!-- Main content -->
      <main class="main-content" [class.with-nav]="isAuthenticated() && !isLoginRoute()">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .app-container {
        min-height: 100vh;
        background-color: #fafafa;
        font-family: 'Roboto', 'Helvetica Neue', sans-serif;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .main-content {
        transition: all 0.3s ease;
        position: relative;

        &.with-nav {
          margin-top: 64px; // Height of the toolbar
          min-height: calc(100vh - 64px);
        }

        // Ensure smooth transitions for content
        ::ng-deep * {
          transition: inherit;
        }
      }

      // Ensure login page takes full height
      ::ng-deep router-outlet + * {
        display: block;
        height: 100%;
        width: 100%;
      }

      // Global loading state styling
      ::ng-deep .mat-mdc-progress-spinner {
        circle {
          stroke: #1976d2;
        }
      }
    `,
  ],
})
export class AppComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  title = 'coffee-admin';

  // Reactive computed values
  isAuthenticated = this.authService.isAuthenticated;

  // Check if current route is login
  isLoginRoute = computed(() => {
    return this.router.url === '/login';
  });
}
