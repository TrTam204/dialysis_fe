import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
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
    DialogModule,
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
  showDetailDialog = false;
  selectedStaff: CustomUser | null = null;
  // Detailed Staff Permissions Dialog
  showPermissionDialog = false;
  editingStaff: CustomUser | null = null;
  selectedRole: 'ADMIN' | 'DOCTOR' | 'NURSE' = 'NURSE';
  selectedDeptId: number | null = null;
  isStaffActive = true;
  permissionSaving = false;

  roleOptions = [
    { label: 'Quản trị viên (Admin)', value: 'ADMIN' },
    { label: 'Bác sĩ điều trị (Doctor)', value: 'DOCTOR' },
    { label: 'Điều dưỡng viên (Nurse)', value: 'NURSE' },
  ];

  accountStatusOptions = [
    { label: 'Hoạt động (Active)', value: true },
    { label: 'Tạm khóa (Inactive)', value: false },
  ];

  readonly capabilityMatrix = [
    {
      module: 'Quản lý hồ sơ bệnh nhân & Tọa độ PostGIS',
      admin: 'Toàn quyền (CRUD + Chuyển khoa)',
      doctor: 'Xem, Sửa & Chuyển khoa',
      nurse: 'Xem thông tin lâm sàng'
    },
    {
      module: 'Vận hành ca lọc máu (Bắt đầu / Kết thúc / Ghi sinh hiệu / SOS)',
      admin: 'Toàn quyền giám sát',
      doctor: 'Kê y lệnh & Điều phối SOS',
      nurse: 'Vận hành ca, Ghi sinh hiệu & SOS'
    },
    {
      module: 'Công cụ Hỗ trợ Ra quyết định (TOPSIS & Phân cụm K-Means)',
      admin: 'Xem cấu hình & Chạy lại',
      doctor: 'Toàn quyền đánh giá & Phân tầng',
      nurse: 'Xem kết quả phân nhóm'
    },
    {
      module: 'Phê duyệt hoặc Từ chối Kế hoạch lọc máu tuần (GA)',
      admin: 'Cấu hình tham số & Chạy GA',
      doctor: 'Xem & Phê duyệt hoặc Từ chối',
      nurse: 'Xem lịch phân bổ ca trực'
    },
    {
      module: 'Xem dự báo AI tụt huyết áp (PyTorch LSTM IDH)',
      admin: 'Giám sát Microservice port 8001',
      doctor: 'Xem cảnh báo & Quyết định can thiệp',
      nurse: 'Xem khuyến nghị điều dưỡng'
    },
    {
      module: 'Quản trị danh mục (Máy lọc / Khoa / Nhân sự / Audit Log)',
      admin: 'Toàn quyền phân quyền & Kiểm toán',
      doctor: 'Không có quyền',
      nurse: 'Không có quyền'
    }
  ];


  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private staffService: StaffService,
    private departmentService: DepartmentService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
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

  get modalDepartmentOptions(): { label: string; value: number | null }[] {
    const list: { label: string; value: number | null }[] = [];
    if (this.selectedRole === 'ADMIN') {
      list.push({ label: '🌐 Toàn viện (Không giới hạn khoa)', value: null });
    }
    this.departments.forEach((d) => {
      if (d.id != null) {
        list.push({ label: d.name, value: d.id });
      }
    });
    return list;
  }

  onRoleChanged(): void {
    if (this.selectedRole === 'ADMIN') {
      this.selectedDeptId = null;
    } else if (this.selectedDeptId === null && this.departments.length > 0) {
      this.selectedDeptId = (this.departments[0].id as number) ?? null;
    }
  }

  getUserInitials(user?: CustomUser | null): string {
    if (!user) return 'NV';
    const fullName = `${user.last_name || ''} ${user.first_name || ''}`.trim() || user.username;
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NV';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
  toggleStaffActive(user: CustomUser) {
    if (!user.id || !this.isAdmin) return;
    const newStatus = !user.is_active;
    this.staffService.patch(user.id, { is_active: newStatus }).subscribe({
      next: (updated) => {
        user.is_active = updated.is_active;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: `Đã ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản "${user.username}".`,
        });
      },
      error: (err) => {
        const detail = err?.error?.detail || 'Không thể cập nhật trạng thái tài khoản.';
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail });
      },
    });
  }


  
  openDetailDialog(user: CustomUser): void {
    this.selectedStaff = user;
    this.showDetailDialog = true;
  }

  closeDetailDialog(): void {
    this.showDetailDialog = false;
    this.selectedStaff = null;
  }

  editStaffFromDetail(): void {
    if (this.selectedStaff?.id) {
      const id = this.selectedStaff.id;
      this.closeDetailDialog();
      this.router.navigate(['/staff', id, 'edit']);
    }
  }

  openPermissionFromDetail(): void {
    if (this.selectedStaff) {
      const u = this.selectedStaff;
      this.closeDetailDialog();
      this.openPermissionDialog(u);
    }
  }

  calculateAge(dobStr?: string | null): number | null {
    if (!dobStr) return null;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return null;
    const ageDiffMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  getGenderLabel(gender?: string | null): string {
    if (gender === 'MALE') return 'Nam (Male)';
    if (gender === 'FEMALE') return 'Nữ (Female)';
    if (gender === 'OTHER') return 'Khác (Other)';
    return '—';
  }



  openPermissionDialog(user: CustomUser): void {
    this.editingStaff = { ...user };
    this.selectedRole = user.role;
    this.selectedDeptId = user.department ?? null;
    this.isStaffActive = user.is_active;
    this.showPermissionDialog = true;
  }

  saveStaffPermissions(): void {
    if (!this.editingStaff?.id) return;
    this.permissionSaving = true;
    const deptVal = this.selectedRole === 'ADMIN' && this.selectedDeptId === null ? null : this.selectedDeptId;
    this.staffService.patch(this.editingStaff.id, {
      role: this.selectedRole,
      department: deptVal as any,
      is_active: this.isStaffActive,
    }).subscribe({
      next: () => {
        this.permissionSaving = false;
        this.showPermissionDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: `Đã cập nhật phân quyền và khoa cho "${this.editingStaff?.username}".`,
        });
        this.loadStaff();
      },
      error: (err) => {
        this.permissionSaving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: err?.error?.detail || 'Không thể cập nhật quyền nhân sự.',
        });
      },
    });
  }

}
