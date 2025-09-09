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
import { AuthService } from '../../services/auth.service';
import { UserRole } from '@shared/interfaces/user.interface';

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
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  profileForm!: FormGroup;
  isLoading = signal(false);
  isEditing = signal(false);
  currentUser = this.authService.currentUser;

  ngOnInit() {
    this.initializeForm();
    this.loadUserProfile();
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
}
