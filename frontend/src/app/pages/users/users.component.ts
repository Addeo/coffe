import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsersService } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';
import { UserDto } from '@shared/dtos/user.dto';
import { UserRole } from '@shared/interfaces/user.interface';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  private usersService = inject(UsersService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'createdAt', 'actions'];
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
      next: (response) => {
        this.dataSource.data = response.data;
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.snackBar.open('Error loading users', 'Close', { duration: 3000 });
        this.isLoading.set(false);
      }
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

  getStatusDisplay(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }

  onEditUser(user: UserDto) {
    // TODO: Open edit user dialog
    console.log('Edit user:', user);
    this.snackBar.open('Edit functionality coming soon', 'Close', { duration: 2000 });
  }

  onDeleteUser(user: UserDto) {
    // TODO: Open delete confirmation dialog
    console.log('Delete user:', user);
    this.snackBar.open('Delete functionality coming soon', 'Close', { duration: 2000 });
  }

  onCreateUser() {
    // TODO: Open create user dialog
    console.log('Create new user');
    this.snackBar.open('Create functionality coming soon', 'Close', { duration: 2000 });
  }

  onToggleUserStatus(user: UserDto) {
    const newStatus = !user.isActive;
    this.usersService.updateUser(user.id, { isActive: newStatus }).subscribe({
      next: (updatedUser) => {
        // Update the user in the data source
        const index = this.dataSource.data.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.dataSource.data[index] = updatedUser;
          this.dataSource._updateChangeSubscription();
        }
        this.snackBar.open(
          `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
          'Close',
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('Error updating user status:', error);
        this.snackBar.open('Error updating user status', 'Close', { duration: 3000 });
      }
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
