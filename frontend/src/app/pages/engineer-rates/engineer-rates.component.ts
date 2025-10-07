import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EngineerOrganizationRatesService } from '../../services/engineer-organization-rates.service';
import { UsersService } from '../../services/users.service';
import { OrganizationsService } from '../../services/organizations.service';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import {
  EngineerOrganizationRateDto,
  UpdateEngineerOrganizationRateDto,
} from '@shared/dtos/engineer-organization-rate.dto';
import { UserDto } from '@shared/dtos/user.dto';
import { OrganizationDto } from '@shared/dtos/organization.dto';
import { UserRole } from '@shared/interfaces/user.interface';
import { EngineerRateDialogComponent } from '../../components/modals/engineer-rate-dialog/engineer-rate-dialog.component';

@Component({
  selector: 'app-engineer-rates',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatCardModule,
    MatSortModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './engineer-rates.component.html',
  styleUrls: ['./engineer-rates.component.scss'],
})
export class EngineerRatesComponent implements OnInit {
  private engineerRatesService = inject(EngineerOrganizationRatesService);
  private usersService = inject(UsersService);
  private organizationsService = inject(OrganizationsService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  displayedColumns: string[] = [
    'engineerName',
    'organizationName',
    'customBaseRate',
    'customOvertimeRate',
    'actions',
  ];
  dataSource = new MatTableDataSource<EngineerOrganizationRateDto>([]);
  isLoading = signal(false);

  // Filters
  engineers = signal<UserDto[]>([]);
  organizations = signal<OrganizationDto[]>([]);
  filterForm: FormGroup;

  // Role-based visibility
  readonly canViewRates = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canEditRates = this.authService.isAdmin();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor() {
    this.filterForm = this.fb.group({
      engineerId: [''],
      organizationId: [''],
    });
  }

  ngOnInit() {
    if (this.canViewRates) {
      this.loadEngineers();
      this.loadOrganizations();
      this.loadRates();
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadEngineers() {
    this.usersService.getUsers().subscribe({
      next: response => {
        // Filter only users with engineer role
        this.engineers.set(response.data.filter(user => user.role === UserRole.USER));
      },
      error: error => {
        console.error('Error loading engineers:', error);
      },
    });
  }

  private loadOrganizations() {
    this.organizationsService.getOrganizations().subscribe({
      next: response => {
        this.organizations.set(response.data);
      },
      error: error => {
        console.error('Error loading organizations:', error);
      },
    });
  }

  private loadRates() {
    this.isLoading.set(true);
    const filters = this.filterForm.value;

    this.engineerRatesService.getRates(filters).subscribe({
      next: rates => {
        this.dataSource.data = rates;
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Error loading rates:', error);
        this.toastService.error('Error loading engineer rates');
        this.isLoading.set(false);
      },
    });
  }

  getEngineerName(rate: EngineerOrganizationRateDto): string {
    // We need to get engineer name from the engineers list
    const engineer = this.engineers().find(e => e.id === rate.engineerId);
    return engineer ? `${engineer.firstName} ${engineer.lastName}` : `Engineer ${rate.engineerId}`;
  }


  onEditRate(rate: EngineerOrganizationRateDto) {
    // Open edit dialog
    this.openRateDialog(rate);
  }

  onCreateRate() {
    // Open create dialog
    this.openRateDialog();
  }

  private openRateDialog(rate?: EngineerOrganizationRateDto) {
    const dialogRef = this.modalService.openDialog(EngineerRateDialogComponent, {
      rate,
      isEdit: !!rate,
    });

    dialogRef.subscribe(result => {
      if (result) {
        this.loadRates();
      }
    });
  }


  onDeleteRate(rate: EngineerOrganizationRateDto) {
    if (!this.canEditRates) {
      this.toastService.error('У вас нет прав для удаления ставок');
      return;
    }

    const engineerName = this.getEngineerName(rate);
    const confirmed = confirm(
      `Вы уверены, что хотите удалить ставки для инженера "${engineerName}" в организации "${rate.organizationName}"? Это действие нельзя отменить.`
    );

    if (confirmed) {
      this.engineerRatesService.deleteRate(rate.id).subscribe({
        next: () => {
          this.toastService.success('Ставки инженера успешно удалены');
          this.loadRates();
        },
        error: error => {
          console.error('Error deleting rate:', error);
          this.toastService.error('Ошибка при удалении ставок');
        },
      });
    }
  }

  onApplyFilters() {
    this.loadRates();
  }

  onClearFilters() {
    this.filterForm.reset({
      engineerId: '',
      organizationId: '',
    });
    this.loadRates();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
}
