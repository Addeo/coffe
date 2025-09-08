import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ErrorStateMatcher } from '@angular/material/core';

import { AuthService } from '../../services/auth.service';

interface AuthLoginDto {
  email: string;
  password: string;
}

/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null): boolean {
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}

@Component({
  selector: 'app-login',
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
    MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  emailFormControl = new FormControl('', [Validators.required, Validators.email]);
  passwordFormControl = new FormControl('', [Validators.required, Validators.minLength(6)]);
  matcher = new MyErrorStateMatcher();

  isLoading = signal(false);
  hidePassword = signal(true);

  constructor() {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    console.log('📝 Form submission started');
    console.log('📧 Email valid:', this.emailFormControl.valid, 'Value:', this.emailFormControl.value);
    console.log('🔒 Password valid:', this.passwordFormControl.valid, 'Value length:', this.passwordFormControl.value?.length || 0);

    if (this.emailFormControl.valid && this.passwordFormControl.valid) {
      this.isLoading.set(true);
      console.log('✅ Form is valid, sending login request');

      const credentials: AuthLoginDto = {
        email: this.emailFormControl.value || '',
        password: this.passwordFormControl.value || ''
      };

      console.log('📤 Sending credentials to auth service:', {
        email: credentials.email,
        passwordLength: credentials.password.length
      });

      this.authService.login(credentials).subscribe({
        next: (response) => {
          console.log('🎉 Login component received success response:', response);
          this.isLoading.set(false);

          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          console.log('🧭 Navigating to:', returnUrl);
          this.router.navigate([returnUrl]);

          this.snackBar.open('Login successful!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('💥 Login component received error:', error);
          this.isLoading.set(false);

          let errorMessage = 'Login failed. Please try again.';
          if (error.error?.message) {
            errorMessage = error.error.message;
          }

          console.log('📢 Showing error message:', errorMessage);
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      console.log('❌ Form is invalid, marking fields as touched');
      this.emailFormControl.markAsTouched();
      this.passwordFormControl.markAsTouched();
    }
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update(current => !current);
  }
}
