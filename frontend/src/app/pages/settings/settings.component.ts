import { Component, inject, signal } from '@angular/core';
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
export class SettingsComponent {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  settingsForm!: FormGroup;
  isLoading = signal(false);

  themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' },
  ];

  languages = [
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
  ];

  constructor() {
    this.initializeForm();
  }

  private initializeForm() {
    this.settingsForm = this.fb.group({
      siteName: ['Coffee Admin', [Validators.required]],
      theme: ['light', [Validators.required]],
      language: ['en', [Validators.required]],
      emailNotifications: [true],
      pushNotifications: [false],
      autoSave: [true],
      itemsPerPage: [10, [Validators.required, Validators.min(5), Validators.max(100)]],
      timezone: ['UTC', [Validators.required]],
    });
  }

  saveSettings() {
    if (this.settingsForm.valid) {
      this.isLoading.set(true);

      // TODO: Implement settings save service call
      console.log('Saving settings:', this.settingsForm.value);

      // Simulate API call
      setTimeout(() => {
        this.isLoading.set(false);
        this.snackBar.open('Settings saved successfully', 'Close', { duration: 3000 });
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
    this.snackBar.open('Settings reset to defaults', 'Close', { duration: 2000 });
  }

  exportSettings() {
    // TODO: Implement settings export
    this.snackBar.open('Settings export functionality coming soon', 'Close', { duration: 2000 });
  }

  importSettings() {
    // TODO: Implement settings import
    this.snackBar.open('Settings import functionality coming soon', 'Close', { duration: 2000 });
  }
}
