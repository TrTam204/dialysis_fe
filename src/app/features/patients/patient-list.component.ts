import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, skip, takeUntil } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PatientService } from '../../core/services/patient.service';
import { AuthService } from '../../core/services/auth.service';
import { Patient } from '../../core/models';

@Component({
  selector: 'app-patient-list',
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
    TooltipModule,
  ],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss'],
})
export class PatientListComponent implements OnInit, OnDestroy {
  patients: Patient[] = [];
  totalRecords = 0;
  rows = 10;
  first = 0;
  loading = false;

  searchText = '';
  statusFilter: string | null = null;
  genderFilter: string | null = null;

  statusFilterOptions = [
    { label: 'Tất cả trạng thái', value: null },
    { label: 'Đang hoạt động', value: 'ACTIVE' },
    { label: 'Đang điều trị', value: 'IN_TREATMENT' },
    { label: 'Ổn định', value: 'STABLE' },
    { label: 'Đã xuất viện', value: 'DISCHARGED' },
  ];

  genderFilterOptions = [
    { label: 'Tất cả giới tính', value: null },
    { label: 'Nam', value: 'MALE' },
    { label: 'Nữ', value: 'FEMALE' },
    { label: 'Khác', value: 'OTHER' },
  ];

  sortField = 'patient_id';
  sortOrder = 1;
  canEdit = false;
  canDelete = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private patientService: PatientService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.canEdit = this.authService.hasRole(['ADMIN', 'DOCTOR']);
    this.canDelete = this.authService.hasRole('ADMIN');

    // Parse initial query params from route snapshot
    this.parseQueryParams(this.route.snapshot.queryParams);

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.first = 0;
        this.updateUrlParams();
        this.loadPatients();
      });

    // Listen for query params changes (e.g. browser back/forward)
    this.route.queryParams
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe((params) => {
        const changed = this.parseQueryParams(params);
        if (changed) {
          this.loadPatients();
        }
      });

    this.loadPatients();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private parseQueryParams(params: Record<string, any>): boolean {
    let changed = false;

    const search = params['search'] ? String(params['search']).trim() : '';
    if (this.searchText !== search) {
      this.searchText = search;
      changed = true;
    }

    const status = params['status'] || null;
    if (this.statusFilter !== status) {
      this.statusFilter = status;
      changed = true;
    }

    const gender = params['gender'] || null;
    if (this.genderFilter !== gender) {
      this.genderFilter = gender;
      changed = true;
    }

    const rowsParam = params['rows'] ? parseInt(params['rows'], 10) : 10;
    const newRows = !isNaN(rowsParam) && rowsParam > 0 ? rowsParam : 10;
    if (this.rows !== newRows) {
      this.rows = newRows;
      changed = true;
    }

    const pageParam = params['page'] ? parseInt(params['page'], 10) : 1;
    const newFirst = !isNaN(pageParam) && pageParam > 1 ? (pageParam - 1) * this.rows : 0;
    if (this.first !== newFirst) {
      this.first = newFirst;
      changed = true;
    }

    if (params['ordering']) {
      const ordering = String(params['ordering']);
      const isDesc = ordering.startsWith('-');
      const field = isDesc ? ordering.substring(1) : ordering;
      const order = isDesc ? -1 : 1;
      if (this.sortField !== field || this.sortOrder !== order) {
        this.sortField = field;
        this.sortOrder = order;
        changed = true;
      }
    } else {
      const sort = params['sort'] || 'patient_id';
      if (this.sortField !== sort) {
        this.sortField = sort;
        changed = true;
      }

      const orderParam = params['order'] ? parseInt(params['order'], 10) : 1;
      const newOrder = orderParam === -1 ? -1 : 1;
      if (this.sortOrder !== newOrder) {
        this.sortOrder = newOrder;
        changed = true;
      }
    }

    return changed;
  }

  getPatientNavigationParams(): Record<string, string> {
    const params: Record<string, string> = {
      from: 'patients',
    };
    const page = Math.floor(this.first / this.rows) + 1;
    if (page > 1) {
      params['page'] = String(page);
    }
    if (this.rows !== 10) {
      params['rows'] = String(this.rows);
    }
    const search = this.searchText.trim();
    if (search) {
      params['search'] = search;
    }
    if (this.statusFilter !== null) {
      params['status'] = this.statusFilter;
    }
    if (this.genderFilter !== null) {
      params['gender'] = this.genderFilter;
    }
    if (this.sortField && this.sortField !== 'patient_id') {
      params['sort'] = this.sortField;
    }
    if (this.sortOrder !== 1) {
      params['order'] = String(this.sortOrder);
    }
    return params;
  }

  private updateUrlParams(): void {
    const navParams = this.getPatientNavigationParams();
    delete navParams['from'];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: Object.keys(navParams).length > 0 ? navParams : {},
      replaceUrl: true,
    });
  }

  onSearchInput(text: string) {
    this.searchText = text;
    this.searchSubject.next(text);
  }

  onFilterChange() {
    this.first = 0;
    this.updateUrlParams();
    this.loadPatients();
  }

  clearFilters() {
    this.searchText = '';
    this.statusFilter = null;
    this.genderFilter = null;
    this.first = 0;
    this.updateUrlParams();
    this.loadPatients();
  }

  formatIndex(idx: number): string {
    return idx < 10 ? `0${idx}` : `${idx}`;
  }

  getBirthYear(dateOfBirth?: string | null): string {
    if (!dateOfBirth) return '-';
    const birth = new Date(dateOfBirth);
    return Number.isNaN(birth.getTime()) ? '-' : birth.getFullYear().toString();
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    const newFirst = event.first ?? 0;
    const newRows = event.rows ?? 10;
    const newSortField = (Array.isArray(event.sortField) ? event.sortField[0] : event.sortField) || 'patient_id';
    const newSortOrder = event.sortOrder ?? 1;

    if (
      this.first !== newFirst ||
      this.rows !== newRows ||
      this.sortField !== newSortField ||
      this.sortOrder !== newSortOrder
    ) {
      this.first = newFirst;
      this.rows = newRows;
      this.sortField = newSortField;
      this.sortOrder = newSortOrder;
      this.updateUrlParams();
      this.loadPatients();
    }
  }

  loadPatients() {
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

    if (this.genderFilter !== null) {
      params['gender'] = this.genderFilter;
    }

    if (this.sortField) {
      params['ordering'] = (this.sortOrder === -1 ? '-' : '') + this.sortField;
    }

    this.patientService.getAll(params).subscribe({
      next: (data: any) => {
        this.patients = data?.results ?? data ?? [];
        this.totalRecords = data?.count ?? this.patients.length;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách bệnh nhân.' });
        this.patients = [];
        this.totalRecords = 0;
        this.loading = false;
      },
    });
  }

  navigateToPatient(patient: Patient) {
    this.router.navigate(['/patients', patient.patient_id], {
      queryParams: this.getPatientNavigationParams(),
    });
  }

  getGenderLabel(gender?: string): string {
    const labels: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
    return labels[gender || 'OTHER'] || 'Khác';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Hoạt động',
      IN_TREATMENT: 'Điều trị',
      STABLE: 'Ổn định',
      DISCHARGED: 'Xuất viện',
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    const severities: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      ACTIVE: 'success',
      IN_TREATMENT: 'info',
      STABLE: 'warning',
      DISCHARGED: 'danger',
    };
    return severities[status] || 'info';
  }

  getAge(dateOfBirth?: string | null): number | null {
    if (!dateOfBirth) {
      return null;
    }

    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }

    return age >= 0 ? age : null;
  }

  isMissingTreatmentPattern(patient: Patient): boolean {
    const activeStatuses = ['ACTIVE', 'IN_TREATMENT', 'STABLE'];
    return activeStatuses.includes(patient.status) && !patient.treatment_pattern;
  }

  confirmDelete(patient: Patient) {
    this.confirmationService.confirm({
      header: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa bệnh nhân "${patient.full_name}"? Bệnh nhân có phiên lọc hoặc mẫu xét nghiệm sẽ không thể xóa.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      accept: () => {
        this.patientService.delete(patient.patient_id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã xóa bệnh nhân "${patient.full_name}".` });
            this.loadPatients();
          },
          error: (err) => {
            const detail = err?.error?.detail || 'Không thể xóa bệnh nhân này.';
            this.messageService.add({ severity: 'error', summary: 'Lỗi', detail });
          },
        });
      },
    });
  }
}
