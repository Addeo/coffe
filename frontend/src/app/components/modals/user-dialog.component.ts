import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsersService } from '../../services/users.service';
import { ToastService } from '../../services/toast.service';
import { CreateUserDto, UpdateUserDto, UserDto } from '@shared/dtos/user.dto';
import { UserRole } from '@shared/interfaces/user.interface';

export interface UserDialogData {
  user?: UserDto;
  isEdit?: boolean;
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="user-dialog">
      <h2 mat-dialog-title>
        {{ data.isEdit ? 'Edit User' : 'Create New User' }}
      </h2>

      <mat-dialog-content>
        <form [formGroup]="userForm" class="user-form">
          <div class="form-row">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>First Name</mat-label>
              <input matInput formControlName="firstName" placeholder="Enter first name" />
              <mat-error *ngIf="userForm.get('firstName')?.hasError('required')">
                First name is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Last Name</mat-label>
              <input matInput formControlName="lastName" placeholder="Enter last name" />
              <mat-error *ngIf="userForm.get('lastName')?.hasError('required')">
                Last name is required
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Email</mat-label>
            <input
              matInput
              formControlName="email"
              type="email"
              placeholder="Enter email address"
            />
            <mat-error *ngIf="userForm.get('email')?.hasError('required')">
              Email is required
            </mat-error>
            <mat-error *ngIf="userForm.get('email')?.hasError('email')">
              Please enter a valid email
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Role</mat-label>
            <mat-select formControlName="role">
              <mat-option [value]="UserRole.USER">User</mat-option>
              <mat-option [value]="UserRole.MANAGER">Manager</mat-option>
              <mat-option [value]="UserRole.ADMIN">Administrator</mat-option>
            </mat-select>
            <mat-error *ngIf="userForm.get('role')?.hasError('required')">
              Role is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field" *ngIf="!data.isEdit">
            <mat-label>Password</mat-label>
            <input
              matInput
              formControlName="password"
              type="password"
              placeholder="Enter password"
            />
            <mat-error *ngIf="userForm.get('password')?.hasError('required')">
              Password is required
            </mat-error>
            <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">
              Password must be at least 6 characters
            </mat-error>
          </mat-form-field>

          <div class="form-row" *ngIf="data.isEdit">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>New Password (optional)</mat-label>
              <input
                matInput
                formControlName="password"
                type="password"
                placeholder="Leave empty to keep current password"
              />
              <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">
                Password must be at least 6 characters
              </mat-error>
            </mat-form-field>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          (click)="onSave()"
          [disabled]="userForm.invalid || isLoading()"
        >
          <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
          <span *ngIf="!isLoading()">{{ data.isEdit ? 'Update' : 'Create' }}</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .user-dialog {
        min-width: 500px;
        max-width: 90vw;
        border-radius: 12px;
        overflow: hidden;
      }

      h2[mat-dialog-title] {
        margin: 0;
        padding: 24px 24px 16px 24px;
        font-size: 24px;
        font-weight: 500;
        color: #1976d2;
        border-bottom: 1px solid #e0e0e0;
      }

      .user-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 24px;
        max-height: 70vh;
        overflow-y: auto;
      }

      .form-row {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }

      .form-field {
        flex: 1;
        min-width: 0;
      }

      .form-field.full-width {
        width: 100%;
      }

      mat-form-field {
        width: 100%;
      }

      mat-dialog-content {
        padding: 0 !important;
      }

      mat-dialog-actions {
        padding: 16px 24px 24px 24px;
        margin: 0;
        border-top: 1px solid #e0e0e0;
        justify-content: flex-end;
        gap: 12px;
      }

      button {
        min-width: 100px;
        border-radius: 8px;
        text-transform: uppercase;
        font-weight: 500;
        letter-spacing: 0.5px;
      }

      button[color='primary'] {
        background-color: #1976d2;
        color: white;
      }

      button[color='primary']:disabled {
        background-color: #ccc;
        color: #666;
      }

      .mat-mdc-form-field {
        margin-bottom: 0;
      }

      .mat-mdc-form-field-outline {
        border-radius: 8px;
      }

      .mdc-text-field--outlined .mdc-notched-outline__leading,
      .mdc-text-field--outlined .mdc-notched-outline__notch,
      .mdc-text-field--outlined .mdc-notched-outline__trailing {
        border-radius: 8px;
      }

      mat-error {
        font-size: 12px;
        margin-top: 4px;
      }

      /* Responsive design */
      @media (max-width: 600px) {
        .user-dialog {
          min-width: 95vw;
          margin: 16px;
        }

        .form-row {
          flex-direction: column;
          gap: 20px;
        }

        .user-form {
          padding: 16px;
          gap: 16px;
        }

        h2[mat-dialog-title] {
          padding: 20px 16px 12px 16px;
          font-size: 20px;
        }

        mat-dialog-actions {
          padding: 12px 16px 20px 16px;
          flex-direction: column;
          gap: 8px;
        }

        button {
          width: 100%;
          min-width: unset;
        }
      }
    `,
  ],
})
export class UserDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<UserDialogComponent>);
  private usersService = inject(UsersService);
  private toastService = inject(ToastService);

  data: UserDialogData = inject(MAT_DIALOG_DATA);
  isLoading = signal(false);
  UserRole = UserRole;

  userForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: [UserRole.USER, [Validators.required]],
    password: [''],
  });

  ngOnInit() {
    if (this.data.isEdit && this.data.user) {
      this.userForm.patchValue({
        firstName: this.data.user.firstName,
        lastName: this.data.user.lastName,
        email: this.data.user.email,
        role: this.data.user.role,
      });

      // Password is optional for editing
      this.userForm.get('password')?.setValidators([Validators.minLength(6)]);
    } else {
      // Password is required for creating
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    }
  }

  onSave() {
    if (this.userForm.invalid) {
      return;
    }

    this.isLoading.set(true);

    if (this.data.isEdit && this.data.user) {
      this.updateUser();
    } else {
      this.createUser();
    }
  }

  private createUser() {
    const formValue = this.userForm.value;
    const userData: CreateUserDto = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      password: formValue.password,
      role: formValue.role,
    };

    this.usersService.createUser(userData).subscribe({
      next: user => {
        this.toastService.success('User created successfully');
        this.dialogRef.close(user);
      },
      error: error => {
        console.error('Error creating user:', error);
        this.toastService.error('Error creating user. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  private updateUser() {
    if (!this.data.user) return;

    const formValue = this.userForm.value;
    const userData: UpdateUserDto = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      role: formValue.role,
    };

    // Only include password if it was provided
    if (formValue.password) {
      userData.password = formValue.password;
    }

    this.usersService.updateUser(this.data.user.id, userData).subscribe({
      next: user => {
        this.toastService.success('User updated successfully');
        this.dialogRef.close(user);
      },
      error: error => {
        console.error('Error updating user:', error);
        this.toastService.error('Error updating user. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
