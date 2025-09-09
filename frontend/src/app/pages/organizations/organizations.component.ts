import { Component, inject, signal, computed, effect, OnInit, ViewChild } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { OrganizationsService } from '../../services/organizations.service';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { OrganizationDto, OrganizationsQueryDto } from '@shared/dtos/organization.dto';
import { UserRole } from '@shared/interfaces/user.interface';
import { DeleteConfirmationDialogComponent } from '../../components/modals/delete-confirmation-dialog.component';
import { OrganizationDialogComponent } from '../../components/modals/organization-dialog.component';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatCardModule,
    MatSortModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './organizations.component.html',
  styleUrls: ['./organizations.component.scss'],
})
export class OrganizationsComponent implements OnInit {
  private organizationsService = inject(OrganizationsService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);

  // Data
  organizations = signal<OrganizationDto[]>([]);
  dataSource = new MatTableDataSource<OrganizationDto>();

  // UI state
  isLoading = signal(false);
  searchQuery = signal('');

  // Table
  displayedColumns = [
    'name',
    'baseRate',
    'overtimeMultiplier',
    'hasOvertime',
    'isActive',
    'createdAt',
    'actions',
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Computed
  currentUser = this.authService.currentUser;
  canEdit = computed(() => {
    const user = this.currentUser();
    return user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;
  });

  ngOnInit(): void {
    this.loadOrganizations();
    this.setupDataSource();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadOrganizations(query?: OrganizationsQueryDto): void {
    this.isLoading.set(true);
    this.organizationsService.getOrganizations(query).subscribe({
      next: response => {
        this.organizations.set(response.data);
        this.dataSource.data = response.data;
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Failed to load organizations:', error);
        this.toastService.showError('Failed to load organizations');
        this.isLoading.set(false);
      },
    });
  }

  private setupDataSource(): void {
    this.dataSource.filterPredicate = (data: OrganizationDto, filter: string) => {
      return data.name.toLowerCase().includes(filter);
    };

    // Watch for search query changes
    effect(() => {
      const query = this.searchQuery();
      this.dataSource.filter = query.trim().toLowerCase();
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onCreateOrganization(): void {
    const dialogRef = this.dialog.open(OrganizationDialogComponent, {
      data: { isEdit: false },
      width: '600px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Add new organization to the list
        const updatedOrganizations = [...this.organizations(), result];
        this.organizations.set(updatedOrganizations);
        this.dataSource.data = updatedOrganizations;
      }
    });
  }

  onEditOrganization(organization: OrganizationDto): void {
    const dialogRef = this.dialog.open(OrganizationDialogComponent, {
      data: { organization, isEdit: true },
      width: '600px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update organization in the list
        const updatedOrganizations = this.organizations().map(org =>
          org.id === result.id ? result : org
        );
        this.organizations.set(updatedOrganizations);
        this.dataSource.data = updatedOrganizations;
      }
    });
  }

  onToggleStatus(organization: OrganizationDto): void {
    this.organizationsService.toggleOrganizationStatus(organization.id).subscribe({
      next: updatedOrg => {
        // Update local data
        const updatedOrganizations = this.organizations().map(org =>
          org.id === updatedOrg.id ? updatedOrg : org
        );
        this.organizations.set(updatedOrganizations);
        this.dataSource.data = updatedOrganizations;

        this.toastService.showSuccess(
          `Organization ${updatedOrg.name} ${updatedOrg.isActive ? 'activated' : 'deactivated'}`
        );
      },
      error: error => {
        console.error('Failed to toggle organization status:', error);
        this.toastService.showError('Failed to update organization status');
      },
    });
  }

  onDeleteOrganization(organization: OrganizationDto): void {
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      data: {
        title: 'Delete Organization',
        message: `Are you sure you want to delete "${organization.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.organizationsService.deleteOrganization(organization.id).subscribe({
          next: () => {
            // Remove from local data
            const updatedOrganizations = this.organizations().filter(
              org => org.id !== organization.id
            );
            this.organizations.set(updatedOrganizations);
            this.dataSource.data = updatedOrganizations;

            this.toastService.showSuccess('Organization deleted successfully');
          },
          error: error => {
            console.error('Failed to delete organization:', error);
            this.toastService.showError('Failed to delete organization');
          },
        });
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('ru-RU');
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }
}
