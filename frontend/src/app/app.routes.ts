import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent),
    canActivate: [AuthGuard],
    data: { roles: ['admin', 'manager'], title: 'User Management' },
  },
  {
    path: 'users/create',
    loadComponent: () =>
      import('./pages/user-edit/user-edit.component').then(m => m.UserEditComponent),
    canActivate: [AuthGuard],
    data: { roles: ['admin'], title: 'Create User' },
  },
  {
    path: 'users/:id/edit',
    loadComponent: () =>
      import('./pages/user-edit/user-edit.component').then(m => m.UserEditComponent),
    canActivate: [AuthGuard],
    data: { roles: ['admin', 'manager'], title: 'Edit User' },
  },
  {
    path: 'organizations',
    loadComponent: () =>
      import('./pages/organizations/organizations.component').then(m => m.OrganizationsComponent),
    canActivate: [AuthGuard],
    data: { roles: ['admin', 'manager'], title: 'Organization Management' },
  },
  {
    path: 'organizations/create',
    loadComponent: () =>
      import('./pages/organizations/organizations.component').then(m => m.OrganizationsComponent),
    canActivate: [AuthGuard],
    data: { roles: ['admin'], title: 'Create Organization' },
  },
  {
    path: 'organizations/:id/edit',
    loadComponent: () =>
      import('./pages/organizations/organizations.component').then(m => m.OrganizationsComponent),
    canActivate: [AuthGuard],
    data: { roles: ['admin', 'manager'], title: 'Edit Organization' },
  },
  {
    path: 'engineer-rates',
    loadComponent: () =>
      import('./pages/engineer-rates/engineer-rates.component').then(m => m.EngineerRatesComponent),
    canActivate: [AuthGuard],
    data: { roles: ['admin', 'manager'], title: 'Engineer Rates Management' },
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent),
    canActivate: [AuthGuard],
    data: { title: 'Order Management' },
  },
  {
    path: 'orders/create',
    loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent),
    canActivate: [AuthGuard],
    data: { title: 'Create Order' },
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent),
    canActivate: [AuthGuard],
    data: { title: 'Order Details' },
  },
  {
    path: 'orders/:id/edit',
    loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent),
    canActivate: [AuthGuard],
    data: { title: 'Edit Order' },
  },
  {
    path: 'files',
    loadComponent: () => import('./pages/files/files.component').then(m => m.FilesComponent),
    canActivate: [AuthGuard],
    data: { title: 'File Management' },
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard],
    data: { title: 'My Profile' },
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent),
    canActivate: [AuthGuard],
    data: { roles: ['admin', 'manager'], title: 'Reports' },
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent),
    canActivate: [AuthGuard],
    data: { title: 'Notifications' },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [AuthGuard],
    data: { roles: ['admin'], title: 'System Settings' },
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent),
    data: { title: 'Access Denied' },
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
