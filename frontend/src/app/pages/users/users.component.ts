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
import { Router } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { UserDto } from '@shared/dtos/user.dto';
import { UserRole } from '@shared/interfaces/user.interface';
import { EngineerType } from '@shared/interfaces/order.interface';
import { UserDialogComponent } from '../../components/modals/user-dialog.component';
import { DeleteConfirmationDialogComponent } from '../../components/modals/delete-confirmation-dialog.component';
import { UserDeletionCheck, UserDeletionConflict } from '../../services/users.service';

@Component({
  selector: 'app-users',
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
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  displayedColumns: string[] = [
    'id',
    'firstName',
    'lastName',
    'email',
    'role',
    'engineerType',
    'isActive',
    'createdAt',
    'actions',
  ];
  dataSource = new MatTableDataSource<UserDto>([]);
  isLoading = signal(false);

  // Role-based visibility
  readonly canViewUsers = this.authService.hasAnyRole([UserRole.ADMIN, UserRole.MANAGER]);
  readonly canCreateUsers = this.authService.isAdmin();
  readonly canEditUsers = this.authService.isAdmin();
  readonly canDeleteUsers = this.authService.isAdmin();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    if (this.canViewUsers) {
      this.loadUsers();
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadUsers() {
    this.isLoading.set(true);
    this.usersService.getUsers().subscribe({
      next: response => {
        this.dataSource.data = response.data;
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Error loading users:', error);
        this.toastService.error('Error loading users');
        this.isLoading.set(false);
      },
    });
  }

  getFullName(user: UserDto): string {
    return `${user.firstName} ${user.lastName}`;
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
        return role;
    }
  }

  getEngineerTypeDisplay(type: EngineerType | undefined): string {
    if (!type) {
      return '—';
    }
    switch (type) {
      case EngineerType.STAFF:
        return 'Штатный';
      case EngineerType.CONTRACT:
        return 'Наемный';
      default:
        return type;
    }
  }

  getStatusDisplay(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }

  onEditUser(user: UserDto) {
    this.router.navigate(['/users', user.id, 'edit']);
  }

  onDeleteUser(user: UserDto) {
    // Show cascade deletion warning for all users (since most users have dependencies)
    this.showCascadeDeleteConfirmation(user);
  }

  private showDeleteConfirmation(user: UserDto) {
    const dialogRef = this.modalService.openDialog(DeleteConfirmationDialogComponent, {
      user,
      title: 'Удалить пользователя',
      message: `Вы уверены, что хотите удалить пользователя ${user.firstName} ${user.lastName}?`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
    });

    dialogRef.subscribe(result => {
      if (result) {
        this.performDelete(user.id);
      }
    });
  }

  private showCascadeDeleteConfirmation(user: UserDto) {
    const dialogRef = this.modalService.openDialog(DeleteConfirmationDialogComponent, {
      user,
      title: 'Удалить пользователя',
      message: `Пользователь ${user.firstName} ${user.lastName} будет удален со всеми связанными данными (профиль инженера, логи активности, уведомления и т.д.).\n\nВы уверены, что хотите продолжить? Это действие нельзя отменить.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
    });

    dialogRef.subscribe(result => {
      if (result) {
        this.performCascadeDelete(user.id);
      }
    });
  }

  private performDelete(userId: number) {
    this.usersService.deleteUser(userId).subscribe({
      next: () => {
        this.toastService.success('Пользователь успешно удален');
        this.loadUsers();
      },
      error: error => {
        console.error('Error deleting user:', error);
        this.toastService.error('Ошибка при удалении пользователя');
      },
    });
  }

  private performCascadeDelete(userId: number) {
    this.usersService.deleteUser(userId).subscribe({
      next: () => {
        this.toastService.success('Пользователь и все связанные данные успешно удалены');
        this.loadUsers();
      },
      error: error => {
        console.error('Error deleting user:', error);
        // Try force delete if regular delete fails
        this.usersService.forceDeleteUser(userId).subscribe({
          next: () => {
            this.toastService.success('Пользователь и все связанные данные успешно удалены');
            this.loadUsers();
          },
          error: forceError => {
            console.error('Error force deleting user:', forceError);
            this.toastService.error('Ошибка при удалении пользователя');
          },
        });
      },
    });
  }

  onCreateUser() {
    console.log('🔵 Create User button clicked');
    console.log('🔵 canCreateUsers:', this.canCreateUsers);
    console.log('🔵 isAdmin:', this.authService.isAdmin());
    console.log('🔵 currentUser:', this.authService.currentUser());
    console.log('🔵 Navigating to /users/create');
    this.router.navigate(['/users/create']).then(success => {
      console.log('🔵 Navigation result:', success);
    }).catch(error => {
      console.error('❌ Navigation error:', error);
    });
  }

  onToggleUserStatus(user: UserDto) {
    const newStatus = !user.isActive;
    this.usersService.updateUser(user.id, { isActive: newStatus }).subscribe({
      next: updatedUser => {
        // Update the user in the data source
        const index = this.dataSource.data.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.dataSource.data[index] = updatedUser;
          this.dataSource._updateChangeSubscription();
        }
        this.toastService.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      },
      error: error => {
        console.error('Error updating user status:', error);
        this.toastService.error('Error updating user status');
      },
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
}
