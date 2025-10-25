import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private themeService = inject(ThemeService);

  settingsForm!: FormGroup;
  isLoading = signal(false);

  // Reactive signals from theme service
  currentTheme = this.themeService.currentTheme;
  effectiveTheme = this.themeService.effectiveTheme;

  themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Светлая', icon: 'light_mode' },
    { value: 'dark', label: 'Темная', icon: 'dark_mode' },
    { value: 'auto', label: 'Авто (Системная)', icon: 'brightness_auto' },
  ];

  languages = [
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
  ];

  constructor() {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Load current theme into form
    this.settingsForm.patchValue({
      theme: this.currentTheme(),
    });

    // Subscribe to theme changes from form
    this.settingsForm.get('theme')?.valueChanges.subscribe((theme: Theme) => {
      this.themeService.setTheme(theme);
    });
  }

  private initializeForm() {
    this.settingsForm = this.fb.group({
      siteName: ['Coffee Admin', [Validators.required]],
      theme: [this.themeService.currentTheme(), [Validators.required]],
      language: ['ru', [Validators.required]],
      emailNotifications: [true],
      pushNotifications: [false],
      autoSave: [true],
      itemsPerPage: [10, [Validators.required, Validators.min(5), Validators.max(100)]],
      timezone: ['UTC', [Validators.required]],
    });
  }

  getCurrentThemeIcon(): string {
    const theme = this.themes.find(t => t.value === this.currentTheme());
    return theme?.icon || 'brightness_auto';
  }

  getEffectiveThemeLabel(): string {
    return this.effectiveTheme() === 'dark' ? 'темная' : 'светлая';
  }

  saveSettings() {
    if (this.settingsForm.valid) {
      this.isLoading.set(true);

      // TODO: Implement settings save service call
      console.log('Saving settings:', this.settingsForm.value);

      // Simulate API call
      setTimeout(() => {
        this.isLoading.set(false);
        this.snackBar.open('Настройки успешно сохранены', 'Закрыть', { duration: 3000 });
      }, 1000);
    }
  }

  resetToDefaults() {
    this.settingsForm.patchValue({
      theme: 'light',
      language: 'en',
      emailNotifications: true,
      pushNotifications: false,
      autoSave: true,
      itemsPerPage: 10,
      timezone: 'UTC',
    });
    this.snackBar.open('Настройки сброшены к умолчанию', 'Закрыть', { duration: 2000 });
  }

  exportSettings() {
    // TODO: Implement settings export
    this.snackBar.open('Функция экспорта настроек скоро будет доступна', 'Закрыть', {
      duration: 2000,
    });
  }

  importSettings() {
    // TODO: Implement settings import
    this.snackBar.open('Функция импорта настроек скоро будет доступна', 'Закрыть', {
      duration: 2000,
    });
  }
}
