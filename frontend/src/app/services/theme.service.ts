import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private readonly THEME_KEY = 'servicecheck-theme';

  // Current theme signal
  currentTheme = signal<Theme>('light');

  // Effective theme (resolved from 'auto')
  effectiveTheme = signal<'light' | 'dark'>('light');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeTheme();
      this.setupMediaQueryListener();

      // Force apply theme on initialization
      setTimeout(() => {
        this.applyTheme(this.currentTheme());
      }, 0);
    }

    // Effect to apply theme when it changes
    effect(() => {
      const theme = this.currentTheme();
      console.log('🎨 Theme effect triggered:', theme);
      this.applyTheme(theme);
    });
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  private initializeTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme | null;

    if (savedTheme && this.isValidTheme(savedTheme)) {
      if (savedTheme === 'auto') {
        this.currentTheme.set('light');
        localStorage.setItem(this.THEME_KEY, 'light');
      } else {
        this.currentTheme.set(savedTheme);
      }
    } else {
      // Default to light theme when no preference is saved
      this.currentTheme.set('light');
    }
  }

  /**
   * Set theme and save to localStorage
   */
  setTheme(theme: Theme): void {
    if (!this.isValidTheme(theme)) {
      console.error(`Invalid theme: ${theme}`);
      return;
    }

    this.currentTheme.set(theme);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.THEME_KEY, theme);
    }
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const current = this.effectiveTheme();
    const newTheme: Theme = current === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Apply theme to document
   */
  private applyTheme(theme: Theme): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const effectiveTheme = this.resolveEffectiveTheme(theme);
    this.effectiveTheme.set(effectiveTheme);

    console.log('🎨 Applying theme:', { theme, effectiveTheme });

    const body = document.body;

    // Remove all theme classes
    body.classList.remove('light-theme', 'dark-theme');

    // Add the effective theme class
    body.classList.add(`${effectiveTheme}-theme`);

    console.log('🎨 Body classes after theme application:', body.classList.toString());

    // Update meta theme-color
    this.updateMetaThemeColor(effectiveTheme);
  }

  /**
   * Resolve effective theme from 'auto' based on system preference
   */
  private resolveEffectiveTheme(theme: Theme): 'light' | 'dark' {
    if (theme === 'auto') {
      return this.getSystemPreference();
    }
    return theme;
  }

  /**
   * Get system color scheme preference
   */
  private getSystemPreference(): 'light' | 'dark' {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light';
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Listen to system color scheme changes
   */
  private setupMediaQueryListener(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', e => {
      // Only react to system changes if theme is set to 'auto'
      if (this.currentTheme() === 'auto') {
        const newTheme = e.matches ? 'dark' : 'light';
        this.effectiveTheme.set(newTheme);
        this.applyTheme('auto');
      }
    });
  }

  /**
   * Update meta theme-color tag
   */
  private updateMetaThemeColor(theme: 'light' | 'dark'): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      // Coffee brown for light theme, darker for dark theme
      const color = theme === 'light' ? '#6F4E37' : '#3E2723';
      metaThemeColor.setAttribute('content', color);
    }
  }

  /**
   * Check if theme value is valid
   */
  private isValidTheme(theme: string): theme is Theme {
    return ['light', 'dark', 'auto'].includes(theme);
  }

  /**
   * Get theme label for display
   */
  getThemeLabel(theme: Theme): string {
    const labels: Record<Theme, string> = {
      light: 'Светлая',
      dark: 'Темная',
      auto: 'Авто (Системная)',
    };
    return labels[theme];
  }

  /**
   * Get theme icon
   */
  getThemeIcon(theme: Theme): string {
    const icons: Record<Theme, string> = {
      light: 'light_mode',
      dark: 'dark_mode',
      auto: 'brightness_auto',
    };
    return icons[theme];
  }
}
