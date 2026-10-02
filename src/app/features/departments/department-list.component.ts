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
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { Department } from '../../core/models';

@Component({
  selector: 'app-department-list',
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
          <h2 class="page-title">Quản lý Khoa / Phòng ban</h2>
          <p class="page-subtitle">Danh mục các đơn vị chuyên môn và buồng lọc máu thuộc bệnh viện</p>
        </div>
        <div class="header-stats">
          <span class="record-badge">
            <i class="pi pi-building text-primary"></i>
            <span>Tổng cộng: <strong>{{ totalRecords }}</strong> khoa / phòng</span>
          </span>
          <a
            pButton
            *ngIf="isAdmin"
            routerLink="/departments/new"
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
              placeholder="Tìm theo tên / mã khoa / mô tả..."
              [ngModel]="searchText"
              (ngModelChange)="onSearchInput($event)"
            />
          </span>

          <p-dropdown
            [options]="statusOptions"
            [(ngModel)]="statusFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            placeholder="Trạng thái"
            [style]="{ minWidth: '170px' }"
          ></p-dropdown>

          <button
            *ngIf="searchText || statusFilter !== null"
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
          <span>Đang tải danh sách khoa/phòng ban...</span>
        </div>

        <p-table
          *ngIf="!loading"
          [value]="departments"
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
              <th pSortableColumn="code" style="width: 120px">
                Mã khoa <p-sortIcon field="code"></p-sortIcon>
              </th>
              <th pSortableColumn="name" style="width: 220px">
                Tên khoa / Phòng ban <p-sortIcon field="name"></p-sortIcon>
              </th>
              <th>Mô tả chức năng</th>
              <th pSortableColumn="created_at" style="width: 130px">
                Ngày tạo <p-sortIcon field="created_at"></p-sortIcon>
              </th>
              <th pSortableColumn="is_active" style="width: 160px" class="text-center">
                Trạng thái <p-sortIcon field="is_active"></p-sortIcon>
              </th>
              <th *ngIf="isAdmin" style="width: 105px" class="text-center">Thao tác</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-dept let-rowIndex="rowIndex">
            <tr>
              <td class="text-center font-mono col-stt">{{ formatIndex(first + rowIndex + 1) }}</td>
              <td>
                <span class="code-badge">{{ dept.code }}</span>
              </td>
              <td>
                <span class="dept-title">{{ dept.name }}</span>
              </td>
              <td>
                <span class="desc-text">{{ dept.description || '-' }}</span>
              </td>
              <td>
                <span class="date-text">{{ dept.created_at | date: 'dd/MM/yyyy' }}</span>
              </td>
              <td class="text-center">
                <span [class]="'status-pill ' + (dept.is_active ? 'status-active' : 'status-inactive')">
                  <span class="dot"></span>
                  {{ dept.is_active ? 'Hoạt động' : 'Ngừng hoạt động' }}
                </span>
              </td>
              <td *ngIf="isAdmin" class="text-center">
                <div class="action-cell">
                  <a
                    pButton
                    type="button"
                    icon="pi pi-pencil"
                    class="p-button-text p-button-rounded p-button-sm p-button-info"
                    [routerLink]="['/departments', dept.id, 'edit']"
                    [attr.aria-label]="'Sửa ' + dept.name"
                    pTooltip="Sửa thông tin"
                    tooltipPosition="top"
                  ></a>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-trash"
                    class="p-button-text p-button-rounded p-button-sm p-button-danger"
                    (click)="confirmDelete(dept)"
                    pTooltip="Xóa khoa"
                    tooltipPosition="top"
                  ></button>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="isAdmin ? 7 : 6" class="text-center empty-cell">
                <i class="pi pi-inbox empty-icon"></i>
                <div>Không tìm thấy khoa/phòng ban nào</div>
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
          max-width: 360px;

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

      .dept-title {
        font-weight: 700;
        color: #0f172a;
        font-size: 13px;
      }

      .desc-text {
        font-size: 12.5px;
        color: #475569;
        line-height: 1.4;
      }

      .date-text {
        font-size: 12.5px;
        color: #64748b;
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
export class DepartmentListComponent implements OnInit, OnDestroy {
  departments: Department[] = [];
  totalRecords = 0;
  rows = 10;
  first = 0;
  loading = false;

  searchText = '';
  statusFilter: boolean | null = null;
  statusOptions = [
    { label: 'Tất cả trạng thái', value: null },
    { label: 'Hoạt động', value: true },
    { label: 'Ngừng hoạt động', value: false },
  ];

  sortField = 'id';
  sortOrder = 1;

  isAdmin = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
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
        this.loadDepartments();
      });

    this.loadDepartments();
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
    this.loadDepartments();
  }

  clearFilters() {
    this.searchText = '';
    this.statusFilter = null;
    this.first = 0;
    this.loadDepartments();
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
    this.sortField = (Array.isArray(event.sortField) ? event.sortField[0] : event.sortField) || 'id';
    this.sortOrder = event.sortOrder ?? 1;
    this.loadDepartments();
  }

  loadDepartments() {
    this.loading = true;
    const params: Record<string, string | number | boolean> = {
      page: Math.floor(this.first / this.rows) + 1,
    };
    const search = this.searchText.trim();
    if (search) {
      params['search'] = search;
    }
    if (this.statusFilter !== null) {
      params['is_active'] = this.statusFilter;
    }
    if (this.sortField) {
      params['ordering'] = (this.sortOrder === -1 ? '-' : '') + this.sortField;
    }

    this.departmentService.getAll(params).subscribe({
      next: (data: any) => {
        this.departments = data?.results ?? data ?? [];
        this.totalRecords = data?.count ?? this.departments.length;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách khoa/phòng ban.' });
        this.departments = [];
        this.totalRecords = 0;
        this.loading = false;
      },
    });
  }

  confirmDelete(dept: Department) {
    this.confirmationService.confirm({
      header: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa khoa/phòng ban "${dept.name}"? Khoa đang được sử dụng sẽ không thể xóa.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      accept: () => {
        if (!dept.id) return;
        this.departmentService.delete(dept.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã xóa khoa/phòng ban "${dept.name}".` });
            this.loadDepartments();
          },
          error: (err) => {
            const detail = err?.error?.detail || 'Không thể xóa khoa/phòng ban này vì đang được sử dụng.';
            this.messageService.add({ severity: 'error', summary: 'Lỗi', detail });
          },
        });
      },
    });
  }
}
