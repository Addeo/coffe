import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-public-layout',
  imports: [RouterOutlet],
  template: `
    <div class="public-layout">
      <div class="public-layout__overlay"></div>
      <main class="public-layout__content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: `
    .public-layout {
      position: relative;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: stretch;
      background: radial-gradient(circle at top left, rgba(96, 64, 48, 0.18), transparent 55%),
        radial-gradient(circle at bottom right, rgba(205, 170, 125, 0.2), transparent 45%),
        linear-gradient(to bottom, #f3e7dc, #fdf8f3);
      overflow: hidden;
    }

    .public-layout__overlay {
      position: absolute;
      inset: 0;
      background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"%3E%3Cpath fill="%23d7b899" fill-opacity="0.18" d="M45 20c0-6.627 5.373-12 12-12s12 5.373 12 12-5.373 12-12 12-12-5.373-12-12zm50 45c0-3.866 3.134-7 7-7s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7zM16 80c0-3.866 3.134-7 7-7s7 3.134 7 7-3.134 7-7 7-7-3.134-7-7zm64 28c0-2.209 1.791-4 4-4s4 1.791 4 4-1.791 4-4 4-4-1.791-4-4z"/%3E%3C/svg%3E');
      background-repeat: repeat;
      background-size: 280px 280px;
      opacity: 0.35;
      pointer-events: none;
    }

    .public-layout__content {
      position: relative;
      flex: 1 1 auto;
      display: flex;
      justify-content: center;
      padding: clamp(2rem, 6vw, 4rem) clamp(1rem, 5vw, 4rem);
      z-index: 1;
    }

    @media (max-width: 768px) {
      .public-layout {
        align-items: flex-start;
      }

      .public-layout__content {
        padding: clamp(1.5rem, 8vw, 3rem) clamp(0.75rem, 6vw, 2rem);
      }
    }
  `,
})
export class PublicLayoutComponent {}

