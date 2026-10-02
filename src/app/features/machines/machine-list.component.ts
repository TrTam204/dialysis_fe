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
import { MachineService } from '../../core/services/machine.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { DialysisMachine, Department } from '../../core/models';

@Component({
  selector: 'app-machine-list',
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
          <h2 class="page-title">Quản lý Máy lọc máu</h2>
          <p class="page-subtitle">Danh mục trang thiết bị máy lọc thận và theo dõi bảo trì định kỳ</p>
        </div>
        <div class="header-stats">
          <span class="record-badge">
            <i class="pi pi-server text-primary"></i>
            <span>Tổng cộng: <strong>{{ totalRecords }}</strong> máy lọc</span>
          </span>
          <a
            pButton
            *ngIf="isAdmin"
            routerLink="/machines/new"
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
              placeholder="Tìm theo mã máy / tên máy..."
              [ngModel]="searchText"
              (ngModelChange)="onSearchInput($event)"
            />
          </span>

          <p-dropdown
            [options]="statusFilterOptions"
            [(ngModel)]="statusFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            placeholder="Trạng thái"
            [style]="{ minWidth: '160px' }"
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

          <button
            *ngIf="searchText || statusFilter !== null || departmentFilter !== null"
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
          <span>Đang tải danh sách máy lọc máu...</span>
        </div>

        <p-table
          *ngIf="!loading"
          [value]="machines"
          [lazy]="true"
          [lazyLoadOnInit]="false"
          (onLazyLoad)="onLazyLoad($event)"
          [paginator]="true"
          [rows]="rows"
          [first]="first"
          [totalRecords]="totalRecords"
          dataKey="machine_id"
          responsiveLayout="scroll"
          styleClass="p-datatable-gridlines sheet-table"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 50px" class="text-center">STT</th>
              <th pSortableColumn="machine_id" style="width: 130px">
                Mã máy <p-sortIcon field="machine_id"></p-sortIcon>
              </th>
              <th pSortableColumn="name">
                Tên máy <p-sortIcon field="name"></p-sortIcon>
              </th>
              <th pSortableColumn="department__name" style="width: 190px">
                Khoa / Phòng <p-sortIcon field="department__name"></p-sortIcon>
              </th>
              <th pSortableColumn="last_maintenance_date" style="width: 170px">
                Bảo trì gần nhất <p-sortIcon field="last_maintenance_date"></p-sortIcon>
              </th>
              <th pSortableColumn="created_at" style="width: 130px">
                Ngày tạo <p-sortIcon field="created_at"></p-sortIcon>
              </th>
              <th pSortableColumn="status" style="width: 150px" class="text-center">
                Trạng thái <p-sortIcon field="status"></p-sortIcon>
              </th>
              <th *ngIf="isAdmin" style="width: 105px" class="text-center">Thao tác</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-machine let-rowIndex="rowIndex">
            <tr>
              <td class="text-center font-mono col-stt">{{ formatIndex(first + rowIndex + 1) }}</td>
              <td>
                <span class="code-badge">{{ machine.machine_id }}</span>
              </td>
              <td>
                <span class="machine-name">{{ machine.name }}</span>
              </td>
              <td>
                <span class="dept-name">
                  <i class="pi pi-building text-xs text-slate-400"></i>
                  {{ machine.department_name || getDepartmentName(machine.department) }}
                </span>
              </td>
              <td>
                <span class="date-text">
                  <i class="pi pi-wrench text-xs text-slate-400"></i>
                  {{ machine.last_maintenance_date ? (machine.last_maintenance_date | date: 'dd/MM/yyyy') : '-' }}
                </span>
              </td>
              <td>
                <span class="date-text">{{ machine.created_at | date: 'dd/MM/yyyy' }}</span>
              </td>
              <td class="text-center">
                <span [class]="'status-pill status-' + (machine.status || '').toLowerCase().replace('_', '-')">
                  <span class="dot"></span>
                  {{ getStatusLabel(machine.status) }}
                </span>
              </td>
              <td *ngIf="isAdmin" class="text-center">
                <div class="action-cell">
                  <a
                    pButton
                    type="button"
                    icon="pi pi-pencil"
                    class="p-button-text p-button-rounded p-button-sm p-button-info"
                    [routerLink]="['/machines', machine.machine_id, 'edit']"
                    [attr.aria-label]="'Sửa ' + machine.name"
                    pTooltip="Sửa thông tin"
                    tooltipPosition="top"
                  ></a>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-trash"
                    class="p-button-text p-button-rounded p-button-sm p-button-danger"
                    (click)="confirmDelete(machine)"
                    pTooltip="Xóa máy lọc"
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
                <div>Không tìm thấy máy lọc nào</div>
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

      .machine-name {
        font-weight: 700;
        color: #0f172a;
        font-size: 13px;
      }

      .dept-name {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-weight: 500;
        color: #334155;
      }

      .date-text {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12.5px;
        color: #475569;
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

        &.status-available {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          .dot {
            background: #10b981;
          }
        }

        &.status-in-use {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          .dot {
            background: #3b82f6;
          }
        }

        &.status-maintenance {
          background: #fefce8;
          color: #b45309;
          border: 1px solid #fef08a;
          .dot {
            background: #eab308;
          }
        }

        &.status-broken {
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
export class MachineListComponent implements OnInit, OnDestroy {
  machines: DialysisMachine[] = [];
  departments: Department[] = [];
  totalRecords = 0;
  rows = 10;
  first = 0;
  loading = false;

  searchText = '';
  statusFilter: string | null = null;
  departmentFilter: number | null = null;

  statusFilterOptions = [
    { label: 'Tất cả trạng thái', value: null },
    { label: 'Sẵn sàng', value: 'AVAILABLE' },
    { label: 'Đang sử dụng', value: 'IN_USE' },
    { label: 'Bảo trì', value: 'MAINTENANCE' },
    { label: 'Hỏng', value: 'BROKEN' },
  ];

  departmentFilterOptions: { label: string; value: number | null }[] = [
    { label: 'Tất cả khoa', value: null },
  ];

  sortField = 'machine_id';
  sortOrder = 1;

  isAdmin = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private machineService: MachineService,
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
        this.loadMachines();
      });

    this.loadDepartments();
    this.loadMachines();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatIndex(idx: number): string {
    return idx < 10 ? `0${idx}` : `${idx}`;
  }

  onSearchInput(text: string) {
    this.searchText = text;
    this.searchSubject.next(text);
  }

  onFilterChange() {
    this.first = 0;
    this.loadMachines();
  }

  clearFilters() {
    this.searchText = '';
    this.statusFilter = null;
    this.departmentFilter = null;
    this.first = 0;
    this.loadMachines();
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
    this.sortField = (Array.isArray(event.sortField) ? event.sortField[0] : event.sortField) || 'machine_id';
    this.sortOrder = event.sortOrder ?? 1;
    this.loadMachines();
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

  loadMachines() {
    this.loading = true;
    const params: Record<string, string | number | boolean> = {
      page: Math.floor(this.first / this.rows) + 1,
    };
    const search = this.searchText.trim();
    if (search) {
      params['search'] = search;
    }
    if (this.statusFilter !== null) {
      params['status'] = this.statusFilter;
    }
    if (this.departmentFilter !== null) {
      params['department'] = this.departmentFilter;
    }
    if (this.sortField) {
      params['ordering'] = (this.sortOrder === -1 ? '-' : '') + this.sortField;
    }

    this.machineService.getAll(params).subscribe({
      next: (data: any) => {
        this.machines = data?.results ?? data ?? [];
        this.totalRecords = data?.count ?? this.machines.length;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách máy lọc.' });
        this.machines = [];
        this.totalRecords = 0;
        this.loading = false;
      },
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      AVAILABLE: 'Sẵn sàng',
      IN_USE: 'Đang sử dụng',
      MAINTENANCE: 'Bảo trì',
      BROKEN: 'Hỏng',
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    const severities: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      AVAILABLE: 'success',
      IN_USE: 'info',
      MAINTENANCE: 'warning',
      BROKEN: 'danger',
    };
    return severities[status] || 'info';
  }

  getDepartmentName(deptId: number): string {
    const dept = this.departments.find((d) => d.id === deptId);
    return dept ? dept.name : '-';
  }

  confirmDelete(machine: DialysisMachine) {
    this.confirmationService.confirm({
      header: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa máy lọc "${machine.name}"? Máy đang có phiên lọc sẽ không thể xóa.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      accept: () => {
        this.machineService.delete(machine.machine_id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã xóa máy lọc "${machine.name}".` });
            this.loadMachines();
          },
          error: (err) => {
            const detail = err?.error?.detail || 'Không thể xóa máy lọc này.';
            this.messageService.add({ severity: 'error', summary: 'Lỗi', detail });
          },
        });
      },
    });
  }
}
