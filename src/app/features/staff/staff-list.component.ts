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
  template: `
    <div class="page-shell">
      <div class="header-section">
        <div>
          <h2 class="page-title">Quản lý Nhân sự</h2>
          <p class="page-subtitle">Danh sách tài khoản y bác sĩ và nhân viên hệ thống lọc máu</p>
        </div>
        <div class="header-stats">
          <span class="record-badge">
            <i class="pi pi-users text-primary"></i>
            <span>Tổng cộng: <strong>{{ totalRecords }}</strong> nhân sự</span>
          </span>
          <a
            pButton
            *ngIf="isAdmin"
            routerLink="/staff/new"
            icon="pi pi-plus"
            label="Thêm mới"
            class="p-button-primary p-button-sm add-btn"
          ></a>
        </div>
      </div>

      <div class="sheet-card">
        <div class="toolbar">
          <span class="p-input-icon-left search-box">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              placeholder="Tìm theo username / họ tên / email..."
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
            placeholder="Vai trò"
            [style]="{ minWidth: '150px' }"
          ></p-dropdown>

          <p-dropdown
            [options]="departmentFilterOptions"
            [(ngModel)]="departmentFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            placeholder="Khoa / Phòng"
            [style]="{ minWidth: '180px' }"
          ></p-dropdown>

          <p-dropdown
            [options]="statusOptions"
            [(ngModel)]="statusFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            placeholder="Trạng thái"
            [style]="{ minWidth: '150px' }"
          ></p-dropdown>

          <button
            *ngIf="searchText || roleFilter !== null || departmentFilter !== null || statusFilter !== null"
            pButton
            type="button"
            icon="pi pi-filter-slash"
            label="Xóa lọc"
            class="p-button-outlined p-button-secondary p-button-sm"
            (click)="clearFilters()"
          ></button>
        </div>

        <div *ngIf="loading" class="loading-box">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Đang tải danh sách nhân sự...</span>
        </div>

        <p-table
          *ngIf="!loading"
          [value]="staff"
          [lazy]="true"
          [lazyLoadOnInit]="false"
          (onLazyLoad)="onLazyLoad($event)"
          [paginator]="true"
          [rows]="rows"
          [first]="first"
          [totalRecords]="totalRecords"
          dataKey="id"
          responsiveLayout="scroll"
          styleClass="p-datatable-gridlines sheet-table"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 50px" class="text-center">STT</th>
              <th pSortableColumn="username" style="width: 140px">
                Username <p-sortIcon field="username"></p-sortIcon>
              </th>
              <th pSortableColumn="first_name">
                Họ và tên <p-sortIcon field="first_name"></p-sortIcon>
              </th>
              <th pSortableColumn="email">
                Email <p-sortIcon field="email"></p-sortIcon>
              </th>
              <th pSortableColumn="role" style="width: 145px" class="text-center">
                Vai trò <p-sortIcon field="role"></p-sortIcon>
              </th>
              <th pSortableColumn="department__name" style="width: 180px">
                Khoa / Phòng <p-sortIcon field="department__name"></p-sortIcon>
              </th>
              <th pSortableColumn="is_active" style="width: 135px" class="text-center">
                Trạng thái <p-sortIcon field="is_active"></p-sortIcon>
              </th>
              <th *ngIf="isAdmin" style="width: 105px" class="text-center">Thao tác</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-user let-rowIndex="rowIndex">
            <tr>
              <td class="text-center font-mono col-stt">{{ formatIndex(first + rowIndex + 1) }}</td>
              <td>
                <span class="code-badge">{{ user.username }}</span>
              </td>
              <td>
                <span class="user-name">{{ getUserFullName(user) }}</span>
              </td>
              <td>
                <span class="email-text">{{ user.email }}</span>
              </td>
              <td class="text-center">
                <span [class]="'role-badge role-' + (user.role || '').toLowerCase()">
                  <i class="pi" [ngClass]="getRoleIcon(user.role)"></i>
                  {{ getRoleLabel(user.role) }}
                </span>
              </td>
              <td>
                <span class="dept-name">
                  <i class="pi pi-building text-xs text-slate-400"></i>
                  {{ user.department_name || getDepartmentName(user.department) }}
                </span>
              </td>
              <td class="text-center">
                <span [class]="'status-pill ' + (user.is_active ? 'status-active' : 'status-inactive')">
                  <span class="dot"></span>
                  {{ user.is_active ? 'Hoạt động' : 'Vô hiệu' }}
                </span>
              </td>
              <td *ngIf="isAdmin" class="text-center">
                <div class="action-cell">
                  <a
                    pButton
                    type="button"
                    icon="pi pi-pencil"
                    class="p-button-text p-button-rounded p-button-sm p-button-info"
                    [routerLink]="['/staff', user.id, 'edit']"
                    [attr.aria-label]="'Sửa ' + user.username"
                    pTooltip="Sửa thông tin"
                    tooltipPosition="top"
                  ></a>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-trash"
                    class="p-button-text p-button-rounded p-button-sm p-button-danger"
                    (click)="confirmDelete(user)"
                    pTooltip="Xóa nhân sự"
                    tooltipPosition="top"
                  ></button>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="isAdmin ? 8 : 7" class="text-center empty-cell">
                <i class="pi pi-inbox empty-icon"></i>
                <div>Không tìm thấy nhân sự nào</div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <p-confirmDialog header="Xác nhận xóa" icon="pi pi-exclamation-triangle" [style]="{ width: '420px' }"></p-confirmDialog>
    </div>
  `,
  styles: [
    `
      .page-shell {
        padding: 20px 24px;
      }

      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
        flex-wrap: wrap;
        gap: 12px;

        .page-title {
          margin: 0 0 4px;
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.3px;
        }

        .page-subtitle {
          margin: 0;
          font-size: 13px;
          color: #64748b;
        }

        .header-stats {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .record-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 13px;
          color: #334155;
        }
      }

      .sheet-card {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        padding: 12px 16px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;

        .search-box {
          flex: 1;
          min-width: 220px;
          max-width: 320px;

          input {
            width: 100%;
          }
        }
      }

      .loading-box {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 40px 0;
        color: #64748b;
      }

      :host ::ng-deep .sheet-table {
        .p-datatable-thead > tr > th {
          background: #f8fafc;
          color: #334155;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          padding: 8px 10px;
          border: 1px solid #e2e8f0;
          border-bottom: 2px solid #cbd5e1;
          white-space: nowrap;
        }

        .p-datatable-tbody > tr {
          transition: background-color 0.15s ease;

          &:nth-child(even) {
            background-color: #fafbfc;
          }
          &:nth-child(odd) {
            background-color: #ffffff;
          }

          &:hover {
            background-color: #f1f5f9 !important;
          }

          > td {
            padding: 7px 10px;
            font-size: 13px;
            color: #1e293b;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
          }
        }

        .p-paginator {
          padding: 8px 12px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }
      }

      .col-stt {
        color: #64748b;
        font-weight: 600;
        font-size: 12px;
      }

      .code-badge {
        display: inline-block;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11.5px;
        font-weight: 600;
        padding: 2px 6px;
        background: #f1f5f9;
        color: #334155;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
      }

      .user-name {
        font-weight: 700;
        color: #0f172a;
        font-size: 13px;
      }

      .email-text {
        font-size: 12.5px;
        color: #475569;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      .dept-name {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-weight: 500;
        color: #334155;
      }

      .role-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11.5px;
        font-weight: 600;
        white-space: nowrap;

        &.role-admin {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        &.role-doctor {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        &.role-nurse {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 11.5px;
        font-weight: 600;
        white-space: nowrap;

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        &.status-active {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          .dot {
            background: #10b981;
          }
        }

        &.status-inactive {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          .dot {
            background: #ef4444;
          }
        }
      }

      .action-cell {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
      }

      .empty-cell {
        padding: 32px 16px;
        color: #64748b;

        .empty-icon {
          font-size: 24px;
          margin-bottom: 8px;
          display: block;
        }
      }
    `,
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
