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
      <p-card header="Quản lý Khoa/Phòng ban">
        <div class="toolbar">
          <span class="p-input-icon-left search-box">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              placeholder="Tìm theo tên / mã / mô tả..."
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
            [style]="{ minWidth: '160px' }"
          ></p-dropdown>

          <a pButton *ngIf="isAdmin" routerLink="/departments/new" icon="pi pi-plus" label="Thêm mới" class="p-button-success"></a>
        </div>

        <p-table
          [value]="departments"
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
              <th pSortableColumn="name">Tên <p-sortIcon field="name"></p-sortIcon></th>
              <th pSortableColumn="code">Mã <p-sortIcon field="code"></p-sortIcon></th>
              <th>Mô tả</th>
              <th pSortableColumn="is_active">Trạng thái <p-sortIcon field="is_active"></p-sortIcon></th>
              <th pSortableColumn="created_at">Ngày tạo <p-sortIcon field="created_at"></p-sortIcon></th>
              <th *ngIf="isAdmin" style="width: 120px">Hành động</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-dept>
            <tr>
              <td>{{ dept.name }}</td>
              <td><p-tag [value]="dept.code"></p-tag></td>
              <td>{{ dept.description || '-' }}</td>
              <td>
                <p-tag
                  [value]="dept.is_active ? 'Hoạt động' : 'Ngừng hoạt động'"
                  [severity]="dept.is_active ? 'success' : 'warning'"
                ></p-tag>
              </td>
              <td>{{ dept.created_at | date: 'dd/MM/yyyy' }}</td>
              <td *ngIf="isAdmin">
                <a
                  pButton
                  type="button"
                  icon="pi pi-pencil"
                  class="p-button-text"
                  [routerLink]="['/departments', dept.id, 'edit']"
                  [attr.aria-label]="'Sửa ' + dept.name"
                ></a>
                <button
                  pButton
                  type="button"
                  icon="pi pi-trash"
                  class="p-button-text p-button-danger"
                  (click)="confirmDelete(dept)"
                ></button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="isAdmin ? 6 : 5" class="text-center">Không có dữ liệu</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <p-confirmDialog header="Xác nhận xóa" icon="pi pi-exclamation-triangle" [style]="{ width: '420px' }"></p-confirmDialog>
    </div>
  `,
  styles: [
    `
      .page-shell {
        padding: 24px;
      }
      .toolbar {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        margin-bottom: 16px;
      }
      .search-box {
        flex: 1;
        max-width: 420px;
      }
      .search-box input {
        width: 100%;
      }
      .text-center {
        text-align: center;
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

  onSearchInput(text: string) {
    this.searchSubject.next(text);
  }

  onFilterChange() {
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
