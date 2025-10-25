import {
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

import { MaterialModule } from '../../shared/material/material.module';

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
  imports: [CommonModule, MaterialModule],
  templateUrl: './organizations.component.html',
  styleUrls: ['./organizations.component.scss'],
})
export class OrganizationsComponent implements OnInit, AfterViewInit {
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

  canDelete = computed(() => {
    const user = this.currentUser();
    return user?.role === UserRole.ADMIN; // Только админы могут удалять
  });

  constructor() {
    // Setup data source filter predicate
    this.dataSource.filterPredicate = (data: OrganizationDto, filter: string) => {
      return data.name.toLowerCase().includes(filter);
    };

    // Watch for search query changes
    effect(() => {
      const query = this.searchQuery();
      this.dataSource.filter = query.trim().toLowerCase();
    });
  }

  ngOnInit(): void {
    console.log('🏢 Organizations component initialized');
    console.log('🏢 Current user:', this.currentUser());
    console.log('🏢 canEdit():', this.canEdit());
    console.log('🏢 canDelete():', this.canDelete());
    this.loadOrganizations();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadOrganizations(query?: OrganizationsQueryDto): void {
    this.isLoading.set(true);
    this.organizationsService.getOrganizations(query).subscribe({
      next: response => {
        const organizations = response.data || [];
        this.organizations.set(organizations);
        this.dataSource.data = organizations;
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Failed to load organizations:', error);
        this.toastService.showError('Не удалось загрузить организации');
        // Ensure we set an empty array on error to prevent undefined
        this.organizations.set([]);
        this.dataSource.data = [];
        this.isLoading.set(false);
      },
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
        const currentOrganizations = this.organizations() || [];
        const updatedOrganizations = [...currentOrganizations, result];
        this.organizations.set(updatedOrganizations);
        this.dataSource.data = updatedOrganizations;
      }
    });
  }

  onEditOrganization(organization: OrganizationDto): void {
    console.log(
      '✏️ onEditOrganization called for:',
      organization.name,
      'User role:',
      this.currentUser()?.role
    );
    console.log('✏️ canEdit():', this.canEdit());

    if (!this.canEdit()) {
      console.log('✏️ User does not have edit permissions');
      this.toastService.showError('У вас нет прав на редактирование организаций');
      return;
    }

    console.log('✏️ Opening edit dialog...');
    let dialogRef;
    try {
      dialogRef = this.dialog.open(OrganizationDialogComponent, {
        data: { organization, isEdit: true },
        width: '600px',
        disableClose: true,
      });
      console.log('✏️ Dialog opened successfully:', dialogRef);

      dialogRef.afterClosed().subscribe(result => {
        console.log('✏️ Edit dialog closed with result:', result);
        if (result) {
          // Update organization in the list
          const currentOrganizations = this.organizations() || [];
          const updatedOrganizations = currentOrganizations.map(org =>
            org.id === result.id ? result : org
          );
          this.organizations.set(updatedOrganizations);
          this.dataSource.data = updatedOrganizations;
        }
      });
    } catch (error) {
      console.error('✏️ Error opening dialog:', error);
      this.toastService.showError('Ошибка открытия диалога редактирования');
    }
  }

  onEditOrganizationTest(organization: OrganizationDto): void {
    console.log('🧪 Edit button clicked for:', organization.name);
    this.onEditOrganization(organization);
  }

  onToggleStatus(organization: OrganizationDto): void {
    console.log(
      '🔄 onToggleStatus called for:',
      organization.name,
      'User role:',
      this.currentUser()?.role
    );
    console.log('🔄 canEdit():', this.canEdit());

    if (!this.canEdit()) {
      console.log('🔄 User does not have edit permissions');
      this.toastService.showError('У вас нет прав на изменение статуса организаций');
      return;
    }

    console.log('🔄 Toggling organization status...');
    this.organizationsService.toggleOrganizationStatus(organization.id).subscribe({
      next: updatedOrg => {
        console.log('🔄 Status toggled successfully:', updatedOrg);
        // Update local data
        const currentOrganizations = this.organizations() || [];
        const updatedOrganizations = currentOrganizations.map(org =>
          org.id === updatedOrg.id ? updatedOrg : org
        );
        this.organizations.set(updatedOrganizations);
        this.dataSource.data = updatedOrganizations;

        this.toastService.showSuccess(
          `Организация ${updatedOrg.name} ${updatedOrg.isActive ? 'активирована' : 'деактивирована'}`
        );
      },
      error: error => {
        console.error('Не удалось изменить статус организации:', error);
        this.toastService.showError('Не удалось обновить статус организации');
      },
    });
  }

  onDeleteOrganization(organization: OrganizationDto): void {
    console.log(
      '🗑️ onDeleteOrganization called for:',
      organization.name,
      'User role:',
      this.currentUser()?.role
    );

    // Проверяем права пользователя
    if (!this.canDelete()) {
      console.log('🗑️ User does not have delete permissions');
      this.toastService.showError(
        'У вас нет прав на удаление организаций. Требуется роль администратора.'
      );
      return;
    }

    console.log('🗑️ Opening delete confirmation dialog');
    let dialogRef;
    try {
      dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
        data: {
          title: 'Удалить организацию',
          message: `Вы уверены, что хотите удалить "${organization.name}"? Это действие нельзя отменить.`,
          confirmText: 'Удалить',
          cancelText: 'Отмена',
        },
      });
      console.log('🗑️ Delete dialog opened successfully:', dialogRef);
    } catch (error) {
      console.error('🗑️ Error opening delete dialog:', error);
      this.toastService.showError('Ошибка открытия диалога удаления');
      return;
    }

    dialogRef.afterClosed().subscribe(result => {
      console.log('🗑️ Delete confirmation dialog result:', result, typeof result);

      if (result) {
        console.log('🗑️ Starting organization deletion:', {
          organizationId: organization.id,
          organizationName: organization.name,
          user: this.currentUser()?.email,
          userRole: this.currentUser()?.role,
          hasToken: !!this.authService.getToken(),
        });

        this.organizationsService.deleteOrganization(organization.id).subscribe({
          next: () => {
            console.log('✅ Organization deleted successfully:', organization.id);

            // Remove from local data
            const currentOrganizations = this.organizations() || [];
            const updatedOrganizations = currentOrganizations.filter(
              org => org.id !== organization.id
            );
            this.organizations.set(updatedOrganizations);
            this.dataSource.data = updatedOrganizations;

            this.toastService.showSuccess('Организация успешно удалена');

            // Перезагрузим список для синхронизации с сервером
            this.loadOrganizations();
          },
          error: error => {
            console.error('❌ Не удалось удалить организацию:', {
              error: error,
              organizationId: organization.id,
              status: error.status,
              statusText: error.statusText,
              url: error.url,
              userRole: this.currentUser()?.role,
            });

            let errorMessage = 'Не удалось удалить организацию';
            if (error.status === 401) {
              errorMessage = 'Не авторизован. Пожалуйста, войдите в систему снова.';
              // Можно добавить редирект на страницу логина
              // this.router.navigate(['/login']);
            } else if (error.status === 403) {
              errorMessage =
                'Недостаточно прав для удаления организации. Требуется роль администратора.';
            } else if (error.status === 404) {
              errorMessage = 'Организация не найдена.';
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            }

            this.toastService.showError(errorMessage);
          },
        });
      } else {
        console.log('🗑️ User cancelled deletion');
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
    return isActive ? 'Активна' : 'Неактивна';
  }

  testClick(): void {
    console.log('🧪 TEST CLICK - обработчик событий работает!');
    alert('Тест клика работает! Обработчики событий функционируют.');
  }
}
