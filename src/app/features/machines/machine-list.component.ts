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
  templateUrl: './machine-list.component.html',
  styleUrls: ['./machine-list.component.scss'],
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
