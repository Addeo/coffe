import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormControl,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from '../../services/auth.service';
import { ThemeService, Theme } from '../../services/theme.service';
import { UsersService } from '../../services/users.service';
import { EngineerOrganizationRatesService } from '../../services/engineer-organization-rates.service';
import { UserRole } from '@shared/interfaces/user.interface';
import { EngineerOrganizationRateDto } from '@shared/dtos/engineer-organization-rate.dto';
import { UserDto } from '@shared/dtos/user.dto';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTabsModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private usersService = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  private engineerRatesService = inject(EngineerOrganizationRatesService);

  profileForm!: FormGroup;
  isLoading = signal(false);
  isEditing = signal(false);
  currentUser = this.authService.currentUser;
  fullUserProfile = signal<UserDto | null>(null);
  selectedTabIndex = signal(0);

  // Theme settings
  currentTheme = this.themeService.currentTheme;
  effectiveTheme = this.themeService.effectiveTheme;

  themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Светлая', icon: 'light_mode' },
    { value: 'dark', label: 'Темная', icon: 'dark_mode' },
    { value: 'auto', label: 'Авто (Системная)', icon: 'brightness_auto' },
  ];

  // Engineer rates data
  engineerRates = signal<EngineerOrganizationRateDto[]>([]);
  isLoadingRates = signal(false);
  displayedColumns = [
    'organizationName',
    'customBaseRate',
    'customOvertimeRate',
    'customZone1Extra',
    'customZone2Extra',
    'customZone3Extra',
  ];

  // Check if current user is an engineer
  get isEngineer(): boolean {
    const role = this.currentUser()?.role;
    return role === UserRole.USER;
  }

  getCurrentThemeIcon(): string {
    const theme = this.themes.find(t => t.value === this.currentTheme());
    return theme?.icon || 'brightness_auto';
  }

  getEffectiveThemeLabel(): string {
    return this.effectiveTheme() === 'dark' ? 'темная' : 'светлая';
  }

  getEffectiveThemeIcon(): string {
    return this.effectiveTheme() === 'dark' ? 'dark_mode' : 'light_mode';
  }

  getEffectiveThemeText(): string {
    return this.effectiveTheme() === 'dark' ? 'Темная тема активна' : 'Светлая тема активна';
  }

  ngOnInit() {
    this.initializeForm();
    this.loadUserProfile();
    if (this.isEngineer) {
      this.loadEngineerRates();
    }
  }

  private initializeForm() {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  private loadUserProfile() {
    const user = this.currentUser();
    if (user) {
      this.profileForm.patchValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }

    // Load full user profile with engineer data
    this.usersService.getUserProfile().subscribe({
      next: fullProfile => {
        console.log('Full user profile:', fullProfile);
        this.fullUserProfile.set(fullProfile);
      },
      error: error => {
        console.error('Error loading full user profile:', error);
      },
    });
  }

  private loadEngineerRates() {
    const user = this.currentUser();
    if (user?.id) {
      this.isLoadingRates.set(true);
      this.engineerRatesService.getActiveRatesForEngineer(user.id).subscribe({
        next: rates => {
          this.engineerRates.set(rates);
          this.isLoadingRates.set(false);
        },
        error: error => {
          console.error('Error loading engineer rates:', error);
          this.snackBar.open('Failed to load engineer rates', 'Close', { duration: 3000 });
          this.isLoadingRates.set(false);
        },
      });
    }
  }

  toggleEditMode() {
    if (this.isEditing()) {
      this.cancelEdit();
    } else {
      this.isEditing.set(true);
    }
  }

  saveProfile() {
    if (this.profileForm.valid) {
      this.isLoading.set(true);

      // TODO: Implement profile update service call
      console.log('Updating profile:', this.profileForm.value);

      // Simulate API call
      setTimeout(() => {
        this.isLoading.set(false);
        this.isEditing.set(false);
        this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
      }, 1000);
    } else {
      this.markFormGroupTouched();
    }
  }

  cancelEdit() {
    this.loadUserProfile();
    this.isEditing.set(false);
  }

  private markFormGroupTouched() {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }

  getRoleDisplay(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrator';
      case UserRole.MANAGER:
        return 'Manager';
      case UserRole.USER:
        return 'User';
      default:
        return 'User';
    }
  }

  changePassword() {
    // TODO: Open change password dialog
    this.snackBar.open('Change password functionality coming soon', 'Close', { duration: 2000 });
  }

  uploadAvatar() {
    // TODO: Open file upload dialog
    this.snackBar.open('Avatar upload functionality coming soon', 'Close', { duration: 2000 });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('ru-RU').format(value);
  }

  getEngineerData() {
    return this.fullUserProfile()?.engineer;
  }

  onThemeChange(theme: Theme): void {
    this.themeService.setTheme(theme);
    this.snackBar.open(`Тема изменена на: ${this.themes.find(t => t.value === theme)?.label}`, 'OK', {
      duration: 2000,
    });
  }
}
