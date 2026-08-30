import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { StaffService } from '../../core/services/staff.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { CustomUser, Department } from '../../core/models';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    DropdownModule,
    TagModule,
  ],
  template: `
    <div class="page-shell">
      <p-card header="Quản lý Nhân sự">
        <div class="toolbar">
          <span class="p-input-icon-left search-box">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              placeholder="Tìm theo username/email/tên..."
              [ngModel]="searchText"
              (ngModelChange)="onSearchInput($event)"
            />
          </span>

          <p-dropdown
            [options]="roleFilterOptions"
            [(ngModel)]="roleFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            [style]="{ minWidth: '140px' }"
          ></p-dropdown>

          <p-dropdown
            [options]="departmentFilterOptions"
            [(ngModel)]="departmentFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            [style]="{ minWidth: '180px' }"
          ></p-dropdown>

          <p-dropdown
            [options]="statusOptions"
            [(ngModel)]="statusFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            [style]="{ minWidth: '160px' }"
          ></p-dropdown>

          <a pButton *ngIf="isAdmin" routerLink="/staff/new" icon="pi pi-plus" label="Thêm mới" class="p-button-success"></a>
        </div>

        <p-table
          [value]="staff"
          [lazy]="true"
          [lazyLoadOnInit]="false"
          (onLazyLoad)="onLazyLoad($event)"
          [paginator]="true"
          [rows]="rows"
          [first]="first"
          [totalRecords]="totalRecords"
          [loading]="loading"
          dataKey="id"
          responsiveLayout="scroll"
        >
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="username">Username <p-sortIcon field="username"></p-sortIcon></th>
              <th pSortableColumn="email">Email <p-sortIcon field="email"></p-sortIcon></th>
              <th pSortableColumn="first_name">Tên <p-sortIcon field="first_name"></p-sortIcon></th>
              <th pSortableColumn="role">Vai trò <p-sortIcon field="role"></p-sortIcon></th>
              <th pSortableColumn="department__name">Khoa <p-sortIcon field="department__name"></p-sortIcon></th>
              <th pSortableColumn="is_active">Trạng thái <p-sortIcon field="is_active"></p-sortIcon></th>
              <th *ngIf="isAdmin" style="width: 120px">Hành động</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-user>
            <tr>
              <td>{{ user.username }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.last_name || '' }} {{ user.first_name || '' }}</td>
              <td>
                <p-tag [value]="user.role" [severity]="getRoleSeverity(user.role)"></p-tag>
              </td>
              <td>{{ user.department_name || getDepartmentName(user.department) }}</td>
              <td>
                <p-tag
                  [value]="user.is_active ? 'Hoạt động' : 'Vô hiệu'"
                  [severity]="user.is_active ? 'success' : 'warning'"
                ></p-tag>
              </td>
              <td *ngIf="isAdmin">
                <a
                  pButton
                  type="button"
                  icon="pi pi-pencil"
                  class="p-button-text"
                  [routerLink]="['/staff', user.id, 'edit']"
                  [attr.aria-label]="'Sửa ' + user.username"
                ></a>
                <button
                  pButton
                  type="button"
                  icon="pi pi-trash"
                  class="p-button-text p-button-danger"
                  (click)="confirmDelete(user)"
                ></button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="isAdmin ? 7 : 6" class="text-center">Không có dữ liệu</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <p-confirmDialog header="Xác nhận xóa" icon="pi pi-exclamation-triangle" [style]="{ width: '420px' }"></p-confirmDialog>
    </div>
  `,
  styles: [
    '.page-shell { padding: 24px; }',
    '.toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }',
    '.search-box { flex: 1; min-width: 200px; max-width: 360px; }',
    '.search-box input { width: 100%; }',
    '.text-center { text-align: center; }',
  ],
})
export class StaffListComponent implements OnInit, OnDestroy {
  staff: CustomUser[] = [];
  departments: Department[] = [];
  totalRecords = 0;
  rows = 10;
  first = 0;
  loading = false;

  searchText = '';
  roleFilter: string | null = null;
  departmentFilter: number | null = null;
  statusFilter: boolean | null = null;

  roleFilterOptions = [
    { label: 'Tất cả vai trò', value: null },
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Doctor', value: 'DOCTOR' },
    { label: 'Nurse', value: 'NURSE' },
  ];

  statusOptions = [
    { label: 'Tất cả trạng thái', value: null },
    { label: 'Hoạt động', value: true },
    { label: 'Vô hiệu', value: false },
  ];

  departmentFilterOptions: { label: string; value: number | null }[] = [
    { label: 'Tất cả khoa', value: null },
  ];

  sortField = 'id';
  sortOrder = 1;

  isAdmin = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private staffService: StaffService,
    private departmentService: DepartmentService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.isAdmin = this.authService.hasRole('ADMIN');

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.first = 0;
        this.loadStaff();
      });

    this.loadDepartments();
    this.loadStaff();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(text: string) {
    this.searchSubject.next(text);
  }

  onFilterChange() {
    this.first = 0;
    this.loadStaff();
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
    this.sortField = (Array.isArray(event.sortField) ? event.sortField[0] : event.sortField) || 'id';
    this.sortOrder = event.sortOrder ?? 1;
    this.loadStaff();
  }

  loadDepartments() {
    this.departmentService.getAll().subscribe({
      next: (data: any) => {
        this.departments = data?.results ?? data ?? [];
        this.departmentFilterOptions = [
          { label: 'Tất cả khoa', value: null },
          ...this.departments.filter((d) => d.id != null).map((d) => ({ label: d.name, value: d.id as number })),
        ];
      },
      error: () => {},
    });
  }

  loadStaff() {
    this.loading = true;
    const params: Record<string, string | number | boolean> = {
      page: Math.floor(this.first / this.rows) + 1,
    };
    const search = this.searchText.trim();
    if (search) {
      params['search'] = search;
    }
    if (this.roleFilter !== null) {
      params['role'] = this.roleFilter;
    }
    if (this.departmentFilter !== null) {
      params['department'] = this.departmentFilter;
    }
    if (this.statusFilter !== null) {
      params['is_active'] = this.statusFilter;
    }
    if (this.sortField) {
      params['ordering'] = (this.sortOrder === -1 ? '-' : '') + this.sortField;
    }

    this.staffService.getAll(params).subscribe({
      next: (data: any) => {
        this.staff = data?.results ?? data ?? [];
        this.totalRecords = data?.count ?? this.staff.length;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách nhân sự.' });
        this.staff = [];
        this.totalRecords = 0;
        this.loading = false;
      },
    });
  }

  getRoleSeverity(role: string): 'success' | 'info' | 'danger' | 'warning' {
    const severities: { [key: string]: 'success' | 'info' | 'danger' | 'warning' } = {
      ADMIN: 'danger',
      DOCTOR: 'info',
      NURSE: 'success',
    };
    return severities[role] || 'warning';
  }

  getDepartmentName(deptId: number): string {
    const dept = this.departments.find((d) => d.id === deptId);
    return dept ? dept.name : '-';
  }

  confirmDelete(user: CustomUser) {
    this.confirmationService.confirm({
      header: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa nhân sự "${user.username}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      accept: () => {
        if (!user.id) return;
        this.staffService.delete(user.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã xóa nhân sự "${user.username}".` });
            this.loadStaff();
          },
          error: (err) => {
            const detail = err?.error?.detail || 'Không thể xóa nhân sự này.';
            this.messageService.add({ severity: 'error', summary: 'Lỗi', detail });
          },
        });
      },
    });
  }
}
