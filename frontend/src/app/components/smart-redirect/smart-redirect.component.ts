import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '@shared/interfaces/user.interface';

@Component({
  selector: 'app-smart-redirect',
  standalone: true,
  template: `
    <div class="redirect-container">
      <div class="redirect-content">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Перенаправление...</p>
      </div>
    </div>
  `,
  styles: [
    `
      .redirect-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background-color: var(--bg-primary);
      }

      .redirect-content {
        text-align: center;
        color: var(--text-primary);
      }

      .redirect-content p {
        margin-top: 16px;
        font-size: 16px;
      }
    `,
  ],
  imports: [MatProgressSpinnerModule],
})
export class SmartRedirectComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    const userRole = this.authService.activeRole();

    console.log('🔄 SmartRedirect - User role:', userRole);

    // Определяем куда перенаправить в зависимости от роли
    let redirectPath: string;

    switch (userRole) {
      case UserRole.ADMIN:
        redirectPath = '/statistics';
        break;
      case UserRole.MANAGER:
      case UserRole.USER:
        redirectPath = '/orders';
        break;
      default:
        redirectPath = '/orders';
        break;
    }

    console.log('🔄 SmartRedirect - Redirecting to:', redirectPath);

    // Перенаправляем с небольшой задержкой для показа спиннера
    setTimeout(() => {
      this.router.navigate([redirectPath]);
    }, 500);
  }
}
