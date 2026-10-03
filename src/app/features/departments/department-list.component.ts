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
  templateUrl: './department-list.component.html',
  styleUrls: ['./department-list.component.scss'],
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
