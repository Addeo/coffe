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
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EngineerOrganizationRatesService } from '../../services/engineer-organization-rates.service';
import { OrganizationsService } from '../../services/organizations.service';
import { UsersService } from '../../services/users.service';
import { ToastService } from '../../services/toast.service';
import { CreateUserDto, UpdateUserDto, UserDto, EngineerDto } from '@shared/dtos/user.dto';
import {
  EngineerOrganizationRateDto,
  UpdateEngineerOrganizationRateDto,
} from '@shared/dtos/engineer-organization-rate.dto';
import { OrganizationDto } from '@shared/dtos/organization.dto';
import { UserRole } from '@shared/interfaces/user.interface';
import { EngineerType } from '@shared/interfaces/order.interface';

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
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  template: `
    <div class="user-dialog">
      <h2 mat-dialog-title>
        {{ data.isEdit ? 'Редактировать пользователя' : 'Создать нового пользователя' }}
      </h2>

      <mat-dialog-content>
        <form [formGroup]="userForm" class="user-form">
          <div class="form-row">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label i18n="@@user.firstName">Имя</mat-label>
              <input matInput formControlName="firstName" placeholder="Введите имя" />
              <mat-error
                *ngIf="userForm.get('firstName')?.hasError('required')"
                i18n="@@user.firstNameRequired"
              >
                Имя обязательно
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field">
              <mat-label i18n="@@user.lastName">Фамилия</mat-label>
              <input matInput formControlName="lastName" placeholder="Введите фамилию" />
              <mat-error *ngIf="userForm.get('lastName')?.hasError('required')">
                Фамилия обязательна
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Электронная почта</mat-label>
            <input
              matInput
              formControlName="email"
              type="email"
              placeholder="Введите адрес электронной почты"
            />
            <mat-error *ngIf="userForm.get('email')?.hasError('required')">
              Электронная почта обязательна
            </mat-error>
            <mat-error *ngIf="userForm.get('email')?.hasError('email')">
              Пожалуйста, введите корректный email
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field">
            <mat-label>Роль</mat-label>
            <mat-select formControlName="role" (selectionChange)="onRoleChange()">
              <mat-option [value]="UserRole.USER">Пользователь</mat-option>
              <mat-option [value]="UserRole.MANAGER">Диспетчер</mat-option>
              <mat-option [value]="UserRole.ADMIN">Руководитель</mat-option>
            </mat-select>
            <mat-error *ngIf="userForm.get('role')?.hasError('required')">
              Роль обязательна
            </mat-error>
          </mat-form-field>

          <!-- Engineer-specific fields (only show if role is USER) -->
          <div *ngIf="userForm.get('role')?.value === UserRole.USER">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Тип инженера</mat-label>
              <mat-select formControlName="engineerType">
                <mat-option [value]="EngineerType.STAFF">Штатный инженер</mat-option>
                <mat-option [value]="EngineerType.CONTRACT"
                  >Контрактный (наемный) инженер</mat-option
                >
              </mat-select>
              <mat-error *ngIf="userForm.get('engineerType')?.hasError('required')">
                Тип инженера обязателен
              </mat-error>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Базовая ставка (₽/час)</mat-label>
                <input
                  matInput
                  formControlName="baseRate"
                  type="number"
                  step="0.01"
                  placeholder="700"
                />
                <mat-error *ngIf="userForm.get('baseRate')?.hasError('min')">
                  Базовая ставка должна быть положительной
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Коэффициент переработки</mat-label>
                <input
                  matInput
                  formControlName="overtimeCoefficient"
                  type="number"
                  step="0.1"
                  placeholder="1.6"
                />
                <mat-error *ngIf="userForm.get('overtimeCoefficient')?.hasError('min')">
                  Коэффициент должен быть положительным
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Плановые часы/месяц</mat-label>
                <input matInput formControlName="planHoursMonth" type="number" placeholder="160" />
                <mat-error *ngIf="userForm.get('planHoursMonth')?.hasError('min')">
                  Плановые часы должны быть не менее 1
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Фиксированная сумма домашней территории (₽)</mat-label>
                <input
                  matInput
                  formControlName="homeTerritoryFixedAmount"
                  type="number"
                  step="0.01"
                  placeholder="0"
                />
                <mat-error *ngIf="userForm.get('homeTerritoryFixedAmount')?.hasError('min')">
                  Сумма должна быть положительной
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Active status field -->
          <mat-form-field appearance="outline" class="form-field" *ngIf="data.isEdit">
            <mat-label>Статус</mat-label>
            <mat-select formControlName="isActive">
              <mat-option [value]="true">Активный</mat-option>
              <mat-option [value]="false">Неактивный</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Engineer active status field (only for USER role) -->
          <mat-form-field
            appearance="outline"
            class="form-field"
            *ngIf="data.isEdit && userForm.get('role')?.value === UserRole.USER"
          >
            <mat-label>Статус инженера</mat-label>
            <mat-select formControlName="engineerIsActive">
              <mat-option [value]="true">Активный инженер</mat-option>
              <mat-option [value]="false">Неактивный инженер</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field" *ngIf="!data.isEdit">
            <mat-label>Пароль</mat-label>
            <input
              matInput
              formControlName="password"
              type="password"
              placeholder="Введите пароль"
            />
            <mat-error *ngIf="userForm.get('password')?.hasError('required')">
              Пароль обязателен
            </mat-error>
            <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">
              Пароль должен содержать минимум 6 символов
            </mat-error>
          </mat-form-field>

          <!-- Info about organization rates (only for USER role and create mode) -->
          <mat-card
            *ngIf="!data.isEdit && userForm.get('role')?.value === UserRole.USER"
            class="info-card"
          >
            <mat-card-content>
              <div class="info-content">
                <mat-icon class="info-icon">info</mat-icon>
                <div class="info-text">
                  <h4>Настройка ставок по организациям</h4>
                  <p>
                    После создания инженера автоматически будут созданы базовые ставки для всех
                    существующих организаций. Вы сможете индивидуально настроить ставки для каждой
                    организации в разделе "Ставки инженеров".
                  </p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <div class="form-row" *ngIf="data.isEdit">
            <mat-form-field appearance="outline" class="form-field">
              <mat-label>Новый пароль (необязательно)</mat-label>
              <input
                matInput
                formControlName="password"
                type="password"
                placeholder="Оставьте пустым, чтобы сохранить текущий пароль"
              />
              <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">
                Пароль должен содержать минимум 6 символов
              </mat-error>
            </mat-form-field>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Отмена</button>
        <button
          mat-raised-button
          color="primary"
          (click)="onSave()"
          [disabled]="userForm.invalid || isLoading()"
        >
          <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
          <span *ngIf="!isLoading()">{{ data.isEdit ? 'Обновить' : 'Создать' }}</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .user-dialog {
        min-width: 600px;
        max-width: 95vw;
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

      /* Info card styles */
      .info-card {
        margin: 20px 0;
        background-color: #e3f2fd !important;
        border: 1px solid #bbdefb !important;
      }

      .info-card mat-card-content {
        padding: 16px !important;
      }

      .info-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .info-icon {
        color: #1976d2;
        font-size: 24px;
        margin-top: 2px;
      }

      .info-text h4 {
        margin: 0 0 8px 0;
        color: #1976d2;
        font-size: 16px;
        font-weight: 500;
      }

      .info-text p {
        margin: 0;
        color: #424242;
        font-size: 14px;
        line-height: 1.4;
      }

      /* Responsive info card */
      @media (max-width: 600px) {
        .info-content {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .info-icon {
          align-self: flex-start;
        }
      }

      /* Organization Rates Tab Styles */
      .rates-tab-content {
        padding: 24px;
        max-height: 60vh;
        overflow-y: auto;
      }

      .rates-info {
        margin-bottom: 20px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 8px;
        border-left: 4px solid #1976d2;

        p {
          margin: 0 0 8px 0;
          color: #424242;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }

      .rates-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: #666;

        p {
          margin-top: 16px;
        }
      }

      .rates-table-container {
        overflow-x: auto;
      }

      .rates-table {
        width: 100%;
        margin-top: 16px;
        font-size: 0.875rem;

        th {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #666;
          padding: 8px 6px;
        }

        td {
          padding: 8px 6px;

          .rate-value {
            margin-right: 4px;
            font-weight: 500;
            font-size: 0.8rem;
          }

          button[mat-icon-button] {
            width: 24px;
            height: 24px;
          }

          button[mat-button] {
            font-size: 0.75rem;
            line-height: 1;
            padding: 4px 8px;
            min-height: 28px;
          }
        }
      }

      /* Responsive rates table */
      @media (max-width: 768px) {
        .rates-tab-content {
          padding: 16px;
        }

        .rates-table {
          font-size: 0.875rem;

          th,
          td {
            padding: 8px 12px;
          }
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
  private engineerRatesService = inject(EngineerOrganizationRatesService);
  private organizationsService = inject(OrganizationsService);

  data: UserDialogData = inject(MAT_DIALOG_DATA);
  isLoading = signal(false);
  UserRole = UserRole;
  EngineerType = EngineerType;

  // Organization rates data
  organizations = signal<OrganizationDto[]>([]);
  engineerRates = signal<EngineerOrganizationRateDto[]>([]);
  ratesLoading = signal(false);

  userForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: [UserRole.USER, [Validators.required]],
    password: [''],
    isActive: [true],
    // Engineer-specific fields
    engineerType: [EngineerType.STAFF],
    baseRate: [700, [Validators.min(0)]],
    overtimeCoefficient: [1.6, [Validators.min(0)]],
    planHoursMonth: [160, [Validators.min(1)]],
    homeTerritoryFixedAmount: [0, [Validators.min(0)]],
    engineerIsActive: [true],
  });

  ngOnInit() {
    // Load organizations for rates management
    this.loadOrganizations();

    if (this.data.isEdit && this.data.user) {
      this.userForm.patchValue({
        firstName: this.data.user.firstName,
        lastName: this.data.user.lastName,
        email: this.data.user.email,
        role: this.data.user.role,
        isActive: this.data.user.isActive,
      });

      // Fill engineer data if exists
      if (this.data.user.engineer) {
        this.userForm.patchValue({
          engineerType: this.data.user.engineer.type,
          baseRate: this.data.user.engineer.baseRate,
          overtimeCoefficient: this.data.user.engineer.overtimeCoefficient || 1.6,
          planHoursMonth: this.data.user.engineer.planHoursMonth,
          homeTerritoryFixedAmount: this.data.user.engineer.homeTerritoryFixedAmount,
          engineerIsActive: this.data.user.engineer.isActive,
        });

        // Load engineer rates for editing
        this.loadEngineerRates(this.data.user.id);
      }

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
      // Engineer-specific fields (only if role is USER)
      engineerType: formValue.role === UserRole.USER ? formValue.engineerType : undefined,
      baseRate: formValue.role === UserRole.USER ? formValue.baseRate : undefined,
      overtimeCoefficient:
        formValue.role === UserRole.USER ? formValue.overtimeCoefficient : undefined,
      planHoursMonth: formValue.role === UserRole.USER ? formValue.planHoursMonth : undefined,
      homeTerritoryFixedAmount:
        formValue.role === UserRole.USER ? formValue.homeTerritoryFixedAmount : undefined,
    };

    // Save password before sending (it will be hashed on backend)
    const createdPassword = formValue.password;

    this.usersService.createUser(userData).subscribe({
      next: user => {
        const isEngineer = user.role === UserRole.USER;
        const message = isEngineer
          ? 'Инженер создан успешно. Ставки по организациям настроены автоматически.'
          : 'Пользователь создан успешно';

        // Show password in success message for initial setup
        const passwordMessage = `\n\n📝 Данные для входа:\nEmail: ${user.email}\nПароль: ${createdPassword}\n\n⚠️ Сохраните эти данные - пароль больше не будет показан!`;

        // Show password in alert for better visibility
        alert(
          message +
          '\n\n' +
          `📝 Данные для входа:\nEmail: ${user.email}\nПароль: ${createdPassword}\n\n⚠️ Сохраните эти данные - пароль больше не будет показан!`
        );

        this.toastService.success(message);

        this.dialogRef.close(user);
      },
      error: error => {
        console.error('Error creating user:', error);
        this.toastService.error('Ошибка при создании пользователя. Попробуйте еще раз.');
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
      isActive: formValue.isActive,
    };

    // Only include password if it was provided
    if (formValue.password) {
      userData.password = formValue.password;
    }

    // Engineer-specific fields (only if role is USER)
    if (formValue.role === UserRole.USER) {
      userData.engineerType = formValue.engineerType;

      // Only include numeric fields if they have valid values
      if (
        formValue.baseRate !== null &&
        formValue.baseRate !== undefined &&
        formValue.baseRate !== ''
      ) {
        userData.baseRate = Number(formValue.baseRate);
      }

      if (
        formValue.overtimeCoefficient !== null &&
        formValue.overtimeCoefficient !== undefined &&
        formValue.overtimeCoefficient !== ''
      ) {
        userData.overtimeCoefficient = Number(formValue.overtimeCoefficient);
      }

      if (
        formValue.planHoursMonth !== null &&
        formValue.planHoursMonth !== undefined &&
        formValue.planHoursMonth !== ''
      ) {
        userData.planHoursMonth = Number(formValue.planHoursMonth);
      }

      if (
        formValue.homeTerritoryFixedAmount !== null &&
        formValue.homeTerritoryFixedAmount !== undefined &&
        formValue.homeTerritoryFixedAmount !== ''
      ) {
        userData.homeTerritoryFixedAmount = Number(formValue.homeTerritoryFixedAmount);
      }

      userData.engineerIsActive = formValue.engineerIsActive;
    }

    this.usersService.updateUser(this.data.user.id, userData).subscribe({
      next: user => {
        this.toastService.success('Пользователь обновлен успешно');
        this.dialogRef.close(user);
      },
      error: error => {
        console.error('Error updating user:', error);
        this.toastService.error('Ошибка при обновлении пользователя. Попробуйте еще раз.');
        this.isLoading.set(false);
      },
    });
  }

  onRoleChange() {
    const role = this.userForm.get('role')?.value;
    if (role !== UserRole.USER) {
      // Clear engineer fields if role is not USER
      this.userForm.patchValue({
        engineerType: EngineerType.STAFF,
        baseRate: 700,
        overtimeCoefficient: 1.6,
        planHoursMonth: 160,
        homeTerritoryFixedAmount: 0,
        engineerIsActive: true,
      });
    }
  }

  private loadOrganizations(): void {
    this.organizationsService.getOrganizations().subscribe({
      next: (response: any) => {
        this.organizations.set(response.data || []);
      },
      error: (error: any) => {
        console.error('Error loading organizations:', error);
      },
    });
  }

  private loadEngineerRates(engineerId: number): void {
    this.ratesLoading.set(true);
    this.engineerRatesService.getActiveRatesForEngineer(engineerId).subscribe({
      next: (rates: EngineerOrganizationRateDto[]) => {
        this.engineerRates.set(rates);
        this.ratesLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading engineer rates:', error);
        this.ratesLoading.set(false);
      },
    });
  }

  onUpdateRate(
    rate: EngineerOrganizationRateDto,
    updates: Partial<EngineerOrganizationRateDto>
  ): void {
    const updateData: UpdateEngineerOrganizationRateDto = {
      customBaseRate: updates.customBaseRate,
      customOvertimeRate: updates.customOvertimeRate,
      customZone1Extra: updates.customZone1Extra,
      customZone2Extra: updates.customZone2Extra,
      customZone3Extra: updates.customZone3Extra,
    };

    this.engineerRatesService.updateRate(rate.id, updateData).subscribe({
      next: (updatedRate: EngineerOrganizationRateDto) => {
        // Update local state
        const currentRates = this.engineerRates();
        const updatedRates = currentRates.map(r => (r.id === rate.id ? updatedRate : r));
        this.engineerRates.set(updatedRates);
        this.toastService.success('Ставка обновлена успешно');
      },
      error: (error: any) => {
        console.error('Error updating rate:', error);
        this.toastService.error('Ошибка при обновлении ставки');
      },
    });
  }

  getRateForOrganization(organizationId: number): EngineerOrganizationRateDto | undefined {
    return this.engineerRates().find(rate => rate.organizationId === organizationId);
  }

  getRateDisplayValue(rate: EngineerOrganizationRateDto | undefined, field: string): string {
    if (!rate) return 'По умолчанию';

    switch (field) {
      case 'baseRate':
        return rate.customBaseRate ? `${rate.customBaseRate} ₽` : 'По умолчанию';
      case 'overtimeRate':
        return rate.customOvertimeRate ? `${rate.customOvertimeRate} ₽` : 'По умолчанию';
      case 'zone1Extra':
        return rate.customZone1Extra ? `${rate.customZone1Extra} ₽` : 'По умолчанию';
      case 'zone2Extra':
        return rate.customZone2Extra ? `${rate.customZone2Extra} ₽` : 'По умолчанию';
      case 'zone3Extra':
        return rate.customZone3Extra ? `${rate.customZone3Extra} ₽` : 'По умолчанию';
      default:
        return 'По умолчанию';
    }
  }

  editRateInline(org: OrganizationDto, field: string): void {
    const currentRate = this.getRateForOrganization(org.id);
    let currentValue: number | null = null;

    // Safely get current value based on field
    if (currentRate) {
      switch (field) {
        case 'baseRate':
          currentValue = currentRate.customBaseRate || null;
          break;
        case 'overtimeRate':
          currentValue = currentRate.customOvertimeRate || null;
          break;
        default:
          currentValue = null;
      }
    }

    const newValue = prompt(
      `Введите новую ${field === 'baseRate' ? 'базовую ставку' : 'ставку переработки'} для ${org.name}:`,
      currentValue?.toString() || ''
    );

    if (newValue !== null && newValue !== '') {
      const updates: Partial<EngineerOrganizationRateDto> = {};

      // Safely set the update value
      switch (field) {
        case 'baseRate':
          updates.customBaseRate = Number(newValue);
          break;
        case 'overtimeRate':
          updates.customOvertimeRate = Number(newValue);
          break;
      }

      if (currentRate) {
        this.onUpdateRate(currentRate, updates);
      } else {
        // Create new rate if doesn't exist
        this.createNewRate(org.id, updates);
      }
    }
  }

  openRateDialog(org: OrganizationDto): void {
    // This would open the full rate configuration dialog
    // For now, just show a message
    this.toastService.info(
      `Полная настройка ставок для ${org.name} будет доступна в отдельном диалоге`
    );
  }

  private createNewRate(
    organizationId: number,
    updates: Partial<EngineerOrganizationRateDto>
  ): void {
    if (!this.data.user?.id) return;

    const rateData = {
      engineerId: this.data.user.id,
      organizationId,
      ...updates,
    };

    this.engineerRatesService.createRate(rateData as any).subscribe({
      next: (newRate: EngineerOrganizationRateDto) => {
        // Add to local state
        const currentRates = this.engineerRates();
        this.engineerRates.set([...currentRates, newRate]);
        this.toastService.success('Ставка создана успешно');
      },
      error: (error: any) => {
        console.error('Error creating rate:', error);
        this.toastService.error('Ошибка при создании ставки');
      },
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
