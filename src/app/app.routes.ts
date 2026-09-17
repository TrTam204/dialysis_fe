import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
      { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent) },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/home.component').then((m) => m.HomeComponent) },
      { path: 'departments', loadComponent: () => import('./features/departments/department-list.component').then((m) => m.DepartmentListComponent) },
      {
        path: 'departments/new',
        loadComponent: () => import('./features/departments/department-form.component').then((m) => m.DepartmentFormComponent),
        data: { roles: ['ADMIN'] },
      },
      {
        path: 'departments/:id/edit',
        loadComponent: () => import('./features/departments/department-form.component').then((m) => m.DepartmentFormComponent),
        data: { roles: ['ADMIN'] },
      },
      { path: 'staff', loadComponent: () => import('./features/staff/staff-list.component').then((m) => m.StaffListComponent) },
      {
        path: 'staff/new',
        loadComponent: () => import('./features/staff/staff-form.component').then((m) => m.StaffFormComponent),
        data: { roles: ['ADMIN'] },
      },
      {
        path: 'staff/:id/edit',
        loadComponent: () => import('./features/staff/staff-form.component').then((m) => m.StaffFormComponent),
        data: { roles: ['ADMIN'] },
      },
      { path: 'patients', loadComponent: () => import('./features/patients/patient-list.component').then((m) => m.PatientListComponent) },
      {
        path: 'patients/new',
        loadComponent: () => import('./features/patients/patient-form.component').then((m) => m.PatientFormComponent),
        data: { roles: ['ADMIN', 'DOCTOR'] },
      },
      { path: 'patients/:id', loadComponent: () => import('./features/patients/patient-detail.component').then((m) => m.PatientDetailComponent) },
      {
        path: 'patients/:id/edit',
        loadComponent: () => import('./features/patients/patient-form.component').then((m) => m.PatientFormComponent),
        data: { roles: ['ADMIN', 'DOCTOR'] },
      },
      { path: 'machines', loadComponent: () => import('./features/machines/machine-list.component').then((m) => m.MachineListComponent) },
      {
        path: 'machines/new',
        loadComponent: () => import('./features/machines/machine-form.component').then((m) => m.MachineFormComponent),
        data: { roles: ['ADMIN'] },
      },
      {
        path: 'machines/:id/edit',
        loadComponent: () => import('./features/machines/machine-form.component').then((m) => m.MachineFormComponent),
        data: { roles: ['ADMIN'] },
      },
      { path: 'sessions', loadComponent: () => import('./features/sessions/session-list.component').then((m) => m.SessionListComponent) },
      {
        path: 'sessions/new',
        loadComponent: () => import('./features/sessions/session-form.component').then((m) => m.SessionFormComponent),
        data: { roles: ['ADMIN', 'DOCTOR'] },
      },
      { path: 'sessions/:id', loadComponent: () => import('./features/sessions/session-detail.component').then((m) => m.SessionDetailComponent) },
      {
        path: 'sessions/:id/edit',
        loadComponent: () => import('./features/sessions/session-form.component').then((m) => m.SessionFormComponent),
        data: { roles: ['ADMIN', 'DOCTOR'] },
      },
      { path: 'blood-samples', loadComponent: () => import('./features/blood-samples/blood-sample-list.component').then((m) => m.BloodSampleListComponent) },
      {
        path: 'blood-samples/new',
        loadComponent: () => import('./features/blood-samples/blood-sample-form.component').then((m) => m.BloodSampleFormComponent),
        data: { roles: ['ADMIN', 'DOCTOR'] },
      },
      {
        path: 'blood-samples/:id/edit',
        loadComponent: () => import('./features/blood-samples/blood-sample-form.component').then((m) => m.BloodSampleFormComponent),
        data: { roles: ['ADMIN', 'DOCTOR'] },
      },
    ],
  },
  { path: '**', redirectTo: 'auth/login' },
];
