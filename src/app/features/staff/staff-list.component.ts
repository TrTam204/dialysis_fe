import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
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
    ButtonModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    DropdownModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './staff-list.component.html',
  styleUrls: ['./staff-list.component.scss'],
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
    { label: 'Quản trị viên (Admin)', value: 'ADMIN' },
    { label: 'Bác sĩ (Doctor)', value: 'DOCTOR' },
    { label: 'Điều dưỡng (Nurse)', value: 'NURSE' },
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

  formatIndex(idx: number): string {
    return idx < 10 ? `0${idx}` : `${idx}`;
  }

  getUserFullName(user: CustomUser): string {
    const fullName = `${user.last_name || ''} ${user.first_name || ''}`.trim();
    return fullName || '-';
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      ADMIN: 'Quản trị viên',
      DOCTOR: 'Bác sĩ',
      NURSE: 'Điều dưỡng',
    };
    return map[role] || role;
  }

  getRoleIcon(role: string): string {
    const map: Record<string, string> = {
      ADMIN: 'pi-shield',
      DOCTOR: 'pi-heart-fill',
      NURSE: 'pi-user-plus',
    };
    return map[role] || 'pi-user';
  }

  onSearchInput(text: string) {
    this.searchText = text;
    this.searchSubject.next(text);
  }

  onFilterChange() {
    this.first = 0;
    this.loadStaff();
  }

  clearFilters() {
    this.searchText = '';
    this.roleFilter = null;
    this.departmentFilter = null;
    this.statusFilter = null;
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
