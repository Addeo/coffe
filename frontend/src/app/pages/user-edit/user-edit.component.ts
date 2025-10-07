import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService } from '../../services/users.service';
import { ToastService } from '../../services/toast.service';
import { EngineerOrganizationRatesService } from '../../services/engineer-organization-rates.service';
import { OrganizationsService } from '../../services/organizations.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
  EngineerDto,
} from '../../../../../shared/dtos/user.dto';
import {
  EngineerOrganizationRateDto,
  UpdateEngineerOrganizationRateDto,
} from '../../../../../shared/dtos/engineer-organization-rate.dto';
import { OrganizationDto } from '../../../../../shared/dtos/organization.dto';
import { UserRole } from '../../../../../shared/interfaces/user.interface';
import { EngineerType } from '../../../../../shared/interfaces/order.interface';
import {
  RateEditDialogComponent,
  RateEditDialogData,
} from '../../components/modals/rate-edit-dialog.component';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  template: `
    <div class="user-edit-container">
      <div class="header">
        <h1>{{ isEdit ? 'Редактировать пользователя' : 'Создать нового пользователя' }}</h1>
        <button mat-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          Назад
        </button>
      </div>

      <mat-tab-group [(selectedIndex)]="selectedTabIndex">
        <!-- General Information Tab -->
        <mat-tab label="Общие данные">
          <div class="tab-content">
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
                  <mat-option [value]="UserRole.MANAGER">Менеджер</mat-option>
                  <mat-option [value]="UserRole.ADMIN">Администратор</mat-option>
                </mat-select>
                <mat-error *ngIf="userForm.get('role')?.hasError('required')">
                  Роль обязательна
                </mat-error>
              </mat-form-field>

              <!-- Engineer-specific fields (only show if role is USER) -->
              <div *ngIf="userForm.get('role')?.value === UserRole.USER">
                <mat-form-field appearance="outline" class="form-field">
                  <mat-label>Тип инженера</mat-label>
                  <mat-select formControlName="engineerType" (selectionChange)="onEngineerTypeChange()">
                    <mat-option [value]="EngineerType.STAFF">Штатный инженер</mat-option>
                    <mat-option [value]="EngineerType.REMOTE">Удаленный инженер</mat-option>
                    <mat-option [value]="EngineerType.CONTRACT">Контрактный инженер</mat-option>
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
                    <mat-label>Ставка за переработку (₽/час)</mat-label>
                    <input
                      matInput
                      formControlName="overtimeRate"
                      type="number"
                      step="0.01"
                      placeholder="700"
                    />
                    <mat-error *ngIf="userForm.get('overtimeRate')?.hasError('min')">
                      Ставка за переработку должна быть положительной
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Плановые часы/месяц</mat-label>
                    <input
                      matInput
                      formControlName="planHoursMonth"
                      type="number"
                      placeholder="160"
                    />
                    <mat-hint>Только для штатных инженеров</mat-hint>
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
                    <mat-hint>Только для штатных инженеров</mat-hint>
                    <mat-error *ngIf="userForm.get('homeTerritoryFixedAmount')?.hasError('min')">
                      Сумма должна быть положительной
                    </mat-error>
                  </mat-form-field>
                </div>
                
                <!-- Информация о фиксированных расходах для штатных инженеров -->
                <div class="info-box" *ngIf="userForm.get('engineerType')?.value === EngineerType.STAFF">
                  <mat-icon class="info-icon">info</mat-icon>
                  <div class="info-text">
                    <p>
                      <strong>Фиксированные расходы:</strong> 
                      {{ calculateFixedExpenses() | currency:'RUB':'symbol':'1.0-0' }} в месяц
                    </p>
                    <p class="info-details">
                      Расчет: Плановые часы/месяц × Базовая ставка = 
                      {{ userForm.get('planHoursMonth')?.value || 0 }} × 
                      {{ userForm.get('baseRate')?.value || 0 }} руб.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Active status field -->
              <mat-form-field appearance="outline" class="form-field" *ngIf="isEdit">
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
                *ngIf="isEdit && userForm.get('role')?.value === UserRole.USER"
              >
                <mat-label>Статус инженера</mat-label>
                <mat-select formControlName="engineerIsActive">
                  <mat-option [value]="true">Активный инженер</mat-option>
                  <mat-option [value]="false">Неактивный инженер</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field" *ngIf="!isEdit">
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

              <div class="form-row" *ngIf="isEdit">
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

              <!-- Info about organization rates (only for USER role and create mode) -->
              <mat-card
                *ngIf="!isEdit && userForm.get('role')?.value === UserRole.USER"
                class="info-card"
              >
                <mat-card-content>
                  <div class="info-content">
                    <mat-icon class="info-icon">info</mat-icon>
                    <div class="info-text">
                      <h4>Настройка ставок по организациям</h4>
                      <p>
                        После создания инженера автоматически будут созданы базовые ставки для всех
                        существующих организаций. Вы сможете индивидуально настроить ставки для
                        каждой организации на вкладке "Ставки".
                      </p>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </form>

            <div class="form-actions">
              <button mat-button (click)="goBack()">Отмена</button>
              <button
                mat-raised-button
                color="primary"
                (click)="onSave()"
                [disabled]="userForm.invalid || isLoading()"
              >
                <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
                <span *ngIf="!isLoading()">{{ isEdit ? 'Обновить' : 'Создать' }}</span>
              </button>
            </div>
          </div>
        </mat-tab>

        <!-- Organization Rates Tab (only for engineers) -->
        <mat-tab
          label="Ставки"
          *ngIf="isEdit && getUser()?.role === UserRole.USER && getUser()?.engineer"
        >
          <div class="tab-content">
            <div class="rates-info">
              <p>Настройка индивидуальных ставок инженера по организациям.</p>
              <p>
                <strong>Базовые:</strong> {{ getUser()?.engineer?.baseRate }} ₽/ч,
                <strong>Переработка:</strong> {{ getUser()?.engineer?.overtimeRate }} ₽/ч
              </p>
            </div>

            <div class="rates-loading" *ngIf="ratesLoading()">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Загрузка ставок...</p>
            </div>

            <div class="rates-table-container" *ngIf="!ratesLoading()">
              <table mat-table [dataSource]="organizations()" class="rates-table">
                <!-- Organization Column -->
                <ng-container matColumnDef="organization">
                  <th mat-header-cell *matHeaderCellDef>Организация</th>
                  <td mat-cell *matCellDef="let org">
                    <strong>{{ org.name }}</strong>
                  </td>
                </ng-container>

                <!-- Base Rate Column -->
                <ng-container matColumnDef="baseRate">
                  <th mat-header-cell *matHeaderCellDef>Базовая ставка</th>
                  <td mat-cell *matCellDef="let org">
                    <span class="rate-value">{{
                      getRateDisplayValue(getRateForOrganization(org.id), 'baseRate')
                    }}</span>
                    <button
                      mat-icon-button
                      (click)="editRateInline(org, 'baseRate')"
                      matTooltip="Редактировать"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <!-- Overtime Rate Column -->
                <ng-container matColumnDef="overtimeRate">
                  <th mat-header-cell *matHeaderCellDef>Ставка переработки</th>
                  <td mat-cell *matCellDef="let org">
                    <span class="rate-value">{{
                      getRateDisplayValue(getRateForOrganization(org.id), 'overtimeRate')
                    }}</span>
                    <button
                      mat-icon-button
                      (click)="editRateInline(org, 'overtimeRate')"
                      matTooltip="Редактировать"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr
                  mat-header-row
                  *matHeaderRowDef="['organization', 'baseRate', 'overtimeRate']"
                ></tr>
                <tr
                  mat-row
                  *matRowDef="let row; columns: ['organization', 'baseRate', 'overtimeRate']"
                ></tr>
              </table>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .user-edit-container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 16px;
      }

      .header h1 {
        margin: 0;
        color: #1976d2;
        font-size: 2rem;
        font-weight: 400;
      }

      .header button {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .tab-content {
        padding: 24px 0;
      }

      .user-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 800px;
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

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid #e0e0e0;
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

      /* Info box for fixed expenses */
      .info-box {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background-color: #fff8e1;
        border-left: 4px solid #ffc107;
        border-radius: 4px;
        padding: 16px;
        margin: 16px 0;
      }

      .info-box .info-icon {
        color: #ffc107;
      }

      .info-box .info-text p {
        margin: 0 0 8px 0;
        color: #424242;
      }

      .info-box .info-text p:last-child {
        margin-bottom: 0;
      }

      .info-box .info-details {
        font-size: 0.9em;
        color: #666;
      }

      /* Organization Rates Tab Styles */
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
        margin-top: 16px;
      }

      .rates-table {
        width: 100%;
        border-collapse: collapse;

        th {
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #666;
          padding: 12px 16px;
          background-color: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
          text-align: left;
        }

        td {
          padding: 12px 16px;
          border-bottom: 1px solid #e0e0e0;

          .rate-value {
            margin-right: 8px;
            font-weight: 500;
          }

          button[mat-icon-button] {
            width: 32px;
            height: 32px;
          }

          button[mat-button] {
            font-size: 0.875rem;
            line-height: 1;
            padding: 6px 12px;
            min-height: 32px;
          }
        }

        tr:hover {
          background-color: #f9f9f9;
        }
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .user-edit-container {
          padding: 16px;
        }

        .header {
          flex-direction: column;
          gap: 16px;
          align-items: flex-start;
        }

        .header h1 {
          font-size: 1.5rem;
        }

        .form-row {
          flex-direction: column;
          gap: 20px;
        }

        .form-actions {
          flex-direction: column;
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
export class UserEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private usersService = inject(UsersService);
  private toastService = inject(ToastService);
  private engineerRatesService = inject(EngineerOrganizationRatesService);
  private organizationsService = inject(OrganizationsService);
  
  // Метод для расчета фиксированных расходов для штатных инженеров
  calculateFixedExpenses(): number {
    const planHoursMonth = this.userForm.get('planHoursMonth')?.value || 0;
    const baseRate = this.userForm.get('baseRate')?.value || 0;
    return planHoursMonth * baseRate;
  }

  // Route params
  userId = signal<number | null>(null);
  isEdit = false;
  user = signal<UserDto | null>(null);

  // UI state
  isLoading = signal(false);
  selectedTabIndex = signal(0);

  // Organization rates data
  organizations = signal<OrganizationDto[]>([]);
  engineerRates = signal<EngineerOrganizationRateDto[]>([]);
  ratesLoading = signal(false);

  UserRole = UserRole;
  EngineerType = EngineerType;

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
    overtimeRate: [700, [Validators.min(0)]],
    planHoursMonth: [160, [Validators.min(1)]],
    homeTerritoryFixedAmount: [0, [Validators.min(0)]],
    engineerIsActive: [true],
  });

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.userId.set(+id);
      this.isEdit = true;
      this.loadUser(+id);
    }

    // Load organizations for rates management
    this.loadOrganizations();
  }

  private loadUser(id: number) {
    this.isLoading.set(true);
    this.usersService.getUser(id).subscribe({
      next: user => {
        this.user.set(user);
        this.userForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        });

        // Fill engineer data if exists
        if (user.engineer) {
          this.userForm.patchValue({
            engineerType: user.engineer.type,
            baseRate: user.engineer.baseRate,
            overtimeRate: user.engineer.overtimeRate || 0,
            planHoursMonth: user.engineer.planHoursMonth,
            homeTerritoryFixedAmount: user.engineer.homeTerritoryFixedAmount,
            engineerIsActive: user.engineer.isActive,
          });

          // Load engineer rates
          this.loadEngineerRates(id);
        }

        // Password is optional for editing
        this.userForm.get('password')?.setValidators([Validators.minLength(6)]);
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Error loading user:', error);
        this.toastService.error('Ошибка при загрузке пользователя');
        this.isLoading.set(false);
        this.goBack();
      },
    });
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

  private loadEngineerRates(userId: number): void {
    this.ratesLoading.set(true);
    // Get the engineer entity ID from user data
    const user = this.user();
    if (!user?.engineer) {
      this.ratesLoading.set(false);
      return;
    }

    this.engineerRatesService.getActiveRatesForEngineer(user.engineer.id).subscribe({
      next: (rates: EngineerOrganizationRateDto[]) => {
        console.log('📊 Loaded engineer rates:', rates);
        this.engineerRates.set(rates);
        this.ratesLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading engineer rates:', error);
        this.ratesLoading.set(false);
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
        overtimeRate: 700,
        planHoursMonth: 160,
        homeTerritoryFixedAmount: 0,
        engineerIsActive: true,
      });
    } else {
      // Update fields based on engineer type when role changes to USER
      this.onEngineerTypeChange();
    }
  }
  
  onEngineerTypeChange() {
    const engineerType = this.userForm.get('engineerType')?.value;
    
    // Set default values based on engineer type
    switch(engineerType) {
      case EngineerType.STAFF:
        // Штатный инженер - базовая ставка 700 руб/час
        this.userForm.patchValue({
          baseRate: 700,
          overtimeRate: 700,
          planHoursMonth: 160, // Только для штатного инженера
          homeTerritoryFixedAmount: 0 // Только для штатного инженера
        });
        
        // Show fields specific to staff engineers
        this.userForm.get('planHoursMonth')?.enable();
        this.userForm.get('homeTerritoryFixedAmount')?.enable();
        break;
        
      case EngineerType.REMOTE:
        // Удаленный инженер - базовая ставка 750 руб/час
        this.userForm.patchValue({
          baseRate: 750,
          overtimeRate: 750,
          planHoursMonth: null, // Не применимо
          homeTerritoryFixedAmount: null // Не применимо
        });
        
        // Hide fields not applicable to remote engineers
        this.userForm.get('planHoursMonth')?.disable();
        this.userForm.get('homeTerritoryFixedAmount')?.disable();
        break;
        
      case EngineerType.CONTRACT:
        // Наемный инженер - базовая ставка 700 руб/час, фиксированная ставка переработки 1200-1400 руб/час
        this.userForm.patchValue({
          baseRate: 700,
          overtimeRate: 1200,
          planHoursMonth: null, // Не применимо
          homeTerritoryFixedAmount: null // Не применимо
        });
        
        // Hide fields not applicable to contract engineers
        this.userForm.get('planHoursMonth')?.disable();
        this.userForm.get('homeTerritoryFixedAmount')?.disable();
        break;
    }
  }

  onSave() {
    if (this.userForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    const formValue = this.userForm.value;

    if (this.isEdit && this.userId()) {
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
      overtimeRate: formValue.role === UserRole.USER ? formValue.overtimeRate : undefined,
      planHoursMonth: formValue.role === UserRole.USER ? formValue.planHoursMonth : undefined,
      homeTerritoryFixedAmount:
        formValue.role === UserRole.USER ? formValue.homeTerritoryFixedAmount : undefined,
    };

    this.usersService.createUser(userData).subscribe({
      next: user => {
        const isEngineer = user.role === UserRole.USER;
        const message = isEngineer
          ? 'Инженер создан успешно. Ставки по организациям настроены автоматически.'
          : 'Пользователь создан успешно';
        this.toastService.success(message);
        this.isLoading.set(false);
        this.goBack();
      },
      error: error => {
        console.error('Error creating user:', error);
        this.toastService.error('Ошибка при создании пользователя. Попробуйте еще раз.');
        this.isLoading.set(false);
      },
    });
  }

  private updateUser() {
    if (!this.userId()) return;

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
      userData.baseRate = formValue.baseRate;
      userData.overtimeRate = formValue.overtimeRate;
      userData.planHoursMonth = formValue.planHoursMonth;
      userData.homeTerritoryFixedAmount = formValue.homeTerritoryFixedAmount;
      userData.engineerIsActive = formValue.engineerIsActive;
    }

    this.usersService.updateUser(this.userId()!, userData).subscribe({
      next: user => {
        this.toastService.success('Пользователь обновлен успешно');
        this.isLoading.set(false);
        this.goBack();
      },
      error: error => {
        console.error('Error updating user:', error);
        this.toastService.error('Ошибка при обновлении пользователя. Попробуйте еще раз.');
        this.isLoading.set(false);
      },
    });
  }

  editRateInline(org: OrganizationDto, field: string): void {
    const currentRate = this.getRateForOrganization(org.id);
    let currentValue: number = 0;

    // Safely get current value based on field
    if (currentRate) {
      switch (field) {
        case 'baseRate':
          currentValue = currentRate.customBaseRate || 0;
          break;
        case 'overtimeRate':
          currentValue = currentRate.customOvertimeRate || 0;
          break;
      }
    }

    const dialogData: RateEditDialogData = {
      title: `Редактирование ${field === 'baseRate' ? 'базовой ставки' : 'ставки переработки'}`,
      label: field === 'baseRate' ? 'Базовая ставка (₽/час)' : 'Ставка переработки (₽/час)',
      currentValue: currentValue,
      placeholder: field === 'baseRate' ? '700' : '700',
    };

    const dialogRef = this.dialog.open(RateEditDialogComponent, {
      data: dialogData,
      width: '400px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: number | null) => {
      if (result !== null && result !== undefined) {
        const updates: Partial<EngineerOrganizationRateDto> = {};

        // Safely set the update value
        switch (field) {
          case 'baseRate':
            updates.customBaseRate = result;
            break;
          case 'overtimeRate':
            updates.customOvertimeRate = result;
            break;
        }

        if (currentRate) {
          this.onUpdateRate(currentRate, updates);
        } else {
          // Create new rate if doesn't exist
          this.createNewRate(org.id, updates);
        }
      }
    });
  }

  private createNewRate(
    organizationId: number,
    updates: Partial<EngineerOrganizationRateDto>
  ): void {
    const user = this.user();
    if (!user || !user.engineer) return;

    const engineerId = user.engineer.id;

    // First check if rate already exists
    const existingRate = this.engineerRates().find(
      rate => rate.engineerId === engineerId && rate.organizationId === organizationId
    );

    if (existingRate) {
      // Update existing rate
      console.log('🔄 Updating existing rate:', existingRate.id, updates);
      this.onUpdateRate(existingRate, updates);
    } else {
      // Create new rate
      const rateData = {
        engineerId,
        organizationId,
        ...updates,
      };

      console.log('🏗️ Creating new rate:', rateData);

      this.engineerRatesService.createRate(rateData as any).subscribe({
        next: (newRate: EngineerOrganizationRateDto) => {
          console.log('✅ Rate created successfully:', newRate);
          // Add to local state
          const currentRates = this.engineerRates();
          this.engineerRates.set([...currentRates, newRate]);
          this.toastService.success('Ставка создана успешно');
          // Reload rates to ensure consistency
          this.loadEngineerRates(user.id);
        },
        error: (error: any) => {
          console.error('❌ Error creating rate:', error);
          if (error.status === 409) {
            // Rate already exists, try to update instead
            console.log('🔄 Rate already exists, trying to update...');
            const existingRate = this.engineerRates().find(
              r => r.engineerId === engineerId && r.organizationId === organizationId
            );
            if (existingRate) {
              this.onUpdateRate(existingRate, updates);
            } else {
              this.toastService.warning('Ставка уже существует, но не найдена локально');
            }
          } else {
            this.toastService.error('Ошибка при создании ставки');
          }
        },
      });
    }
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

    console.log('🔄 Updating rate:', rate.id, updateData);

    this.engineerRatesService.updateRate(rate.id, updateData).subscribe({
      next: (updatedRate: EngineerOrganizationRateDto) => {
        console.log('✅ Rate updated successfully:', updatedRate);
        // Update local state
        const currentRates = this.engineerRates();
        const updatedRates = currentRates.map(r => (r.id === rate.id ? updatedRate : r));
        this.engineerRates.set(updatedRates);
        this.toastService.success('Ставка обновлена успешно');
      },
      error: (error: any) => {
        console.error('❌ Error updating rate:', error);
        this.toastService.error('Ошибка при обновлении ставки');
      },
    });
  }

  getUser(): UserDto | null {
    return this.user();
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

  goBack() {
    this.router.navigate(['/users']);
  }
}
