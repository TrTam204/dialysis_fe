import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
    private router: Router
  ) {}

  ngOnInit() {
    this.canEdit = this.authService.hasRole(['ADMIN', 'DOCTOR']);
    this.canDelete = this.authService.hasRole('ADMIN');

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.first = 0;
        this.loadPatients();
      });

    this.loadPatients();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(text: string) {
    this.searchText = text;
    this.searchSubject.next(text);
  }

  onFilterChange() {
    this.first = 0;
    this.loadPatients();
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
    this.sortField = (Array.isArray(event.sortField) ? event.sortField[0] : event.sortField) || 'patient_id';
    this.sortOrder = event.sortOrder ?? 1;
    this.loadPatients();
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
    this.router.navigate(['/patients', patient.patient_id]);
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
