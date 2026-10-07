import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SchedulePlanService } from '../../core/services/schedule-plan.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { Department, SchedulePlan, SchedulePlanStatus } from '../../core/models';

import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';

@Component({
  selector: 'app-schedule-plan-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    DialogModule,
    CalendarModule
  ],
  templateUrl: './schedule-plan-list.component.html',
  styleUrls: ['./schedule-plan-list.component.scss'],
})
export class SchedulePlanListComponent implements OnInit, OnDestroy {
  plans: SchedulePlan[] = [];
  totalRecords = 0;
  rows = 10;
  first = 0;
  loading = false;

  searchText = '';
  statusFilter: SchedulePlanStatus | null = null;
  departmentFilter: number | null = null;

  departments: Department[] = [];

  statusOptions = [
    { label: 'Tất cả trạng thái', value: null },
    { label: 'Chờ duyệt (PROPOSED)', value: 'PROPOSED' },
    { label: 'Đã duyệt (APPROVED)', value: 'APPROVED' },
    { label: 'Từ chối (REJECTED)', value: 'REJECTED' },
  ];

  departmentOptions: { label: string; value: number | null }[] = [
    { label: 'Tất cả khoa / phòng', value: null },
  ];

  sortField = 'week_start';
  sortOrder = -1;

  canManage = false;
  
  // GA Generate Modal
  generateDialogVisible = false;
  generating = false;
  genDepartment: number | null = null;
  genWeekStart: Date | null = null;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private schedulePlanService: SchedulePlanService,
    private departmentService: DepartmentService,
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.canManage = this.authService.hasRole(['ADMIN', 'DOCTOR']);

    this.loadDepartments();

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.first = 0;
        this.loadPlans();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDepartments(): void {
    this.departmentService.getAll({ is_active: true }).subscribe({
      next: (res: any) => {
        const items: Department[] = res?.results ?? res ?? [];
        this.departments = items;
        this.departmentOptions = [
          { label: 'Tất cả khoa / phòng', value: null },
          ...items.map((d) => ({ label: d.name, value: d.id ?? null })),
        ];
      },
      error: () => {
        // Non-critical, continue without department filter options
      },
    });
  }

  onSearchInput(text: string): void {
    this.searchText = text;
    this.searchSubject.next(text);
  }

  onFilterChange(): void {
    this.first = 0;
    this.loadPlans();
  }

  clearFilters(): void {
    this.searchText = '';
    this.statusFilter = null;
    this.departmentFilter = null;
    this.first = 0;
    this.loadPlans();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
    this.sortField = (Array.isArray(event.sortField) ? event.sortField[0] : event.sortField) || 'week_start';
    this.sortOrder = event.sortOrder ?? -1;
    this.loadPlans();
  }

  loadPlans(): void {
    this.loading = true;
    const params: Record<string, string | number> = {
      page: Math.floor(this.first / this.rows) + 1,
    };

    const search = this.searchText.trim();
    if (search) {
      params['search'] = search;
    }
    if (this.statusFilter) {
      params['status'] = this.statusFilter;
    }
    if (this.departmentFilter !== null) {
      params['department'] = this.departmentFilter;
    }
    if (this.sortField) {
      params['ordering'] = (this.sortOrder === -1 ? '-' : '') + this.sortField;
    }

    this.schedulePlanService.getAll(params).subscribe({
      next: (data: any) => {
        this.plans = data?.results ?? data ?? [];
        this.totalRecords = data?.count ?? this.plans.length;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể tải danh sách kế hoạch tuần.',
        });
        this.plans = [];
        this.totalRecords = 0;
        this.loading = false;
      },
    });
  }

  viewDetail(plan: SchedulePlan): void {
    if (plan.id) {
      this.router.navigate(['/schedule-plans', plan.id]);
    }
  }

  getStatusSeverity(status: SchedulePlanStatus): 'warning' | 'success' | 'danger' | 'info' {
    switch (status) {
      case 'PROPOSED':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      default:
        return 'info';
    }
  }

  getStatusLabel(status: SchedulePlanStatus): string {
    switch (status) {
      case 'PROPOSED':
        return 'Chờ duyệt';
      case 'APPROVED':
        return 'Đã duyệt';
      case 'REJECTED':
        return 'Từ chối';
      default:
        return status;
    }
  }

  openGenerateDialog(): void {
    this.generateDialogVisible = true;
    this.genDepartment = null;
    this.genWeekStart = null;
  }

  submitGenerate(): void {
    if (!this.genDepartment || !this.genWeekStart) {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Vui lòng chọn Khoa/Phòng và Tuần bắt đầu.'
      });
      return;
    }
    
    // Ensure it's Monday
    const day = this.genWeekStart.getDay();
    if (day !== 1) {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Tuần bắt đầu phải là ngày Thứ 2.'
      });
      return;
    }

    const year = this.genWeekStart.getFullYear();
    const month = String(this.genWeekStart.getMonth() + 1).padStart(2, '0');
    const localDay = String(this.genWeekStart.getDate()).padStart(2, '0');
    const localDate = `${year}-${month}-${localDay}`;
    
    this.generating = true;
    this.schedulePlanService.generate(this.genDepartment, localDate).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Đã tạo lịch mới bằng thuật toán GA thành công.'
        });
        this.generateDialogVisible = false;
        this.generating = false;
        this.loadPlans();
      },
      error: (err) => {
        const msg = err.error?.detail || 'Không thể tạo lịch. Có thể do lỗi thuật toán hoặc thiếu dữ liệu.';
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi tạo lịch',
          detail: msg
        });
        this.generating = false;
      }
    });
  }
}
