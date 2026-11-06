import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
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
import { DialogModule } from 'primeng/dialog';
import { BloodSampleService } from '../../core/services/blood-sample.service';
import { PatientService } from '../../core/services/patient.service';
import { AuthService } from '../../core/services/auth.service';
import { BloodSample, Patient } from '../../core/models';

@Component({
  selector: 'app-blood-sample-list',
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
  templateUrl: './blood-sample-list.component.html',
  styleUrls: ['./blood-sample-list.component.scss'],
})
export class BloodSampleListComponent implements OnInit, OnDestroy {
  samples: BloodSample[] = [];
  patients: Patient[] = [];
  totalRecords = 0;
  rows = 10;
  first = 0;
  loading = false;

  searchText = '';
  patientFilter: string | null = null;

  patientFilterOptions: { label: string; value: string | null }[] = [
    { label: 'Tất cả bệnh nhân', value: null },
  ];

  sortField = '-collection_date';
  sortOrder = -1;

  canWrite = false;
  showDetailDialog = false;
  selectedSample: BloodSample | null = null;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private bloodSampleService: BloodSampleService,
    private patientService: PatientService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit() {
    const role = this.authService.getUserRole();
    this.canWrite = role === 'ADMIN' || role === 'DOCTOR';

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.first = 0;
        this.loadSamples();
      });

    this.loadPatients();
    this.loadSamples();
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
    this.loadSamples();
  }

  clearFilters() {
    this.searchText = '';
    this.patientFilter = null;
    this.first = 0;
    this.loadSamples();
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
    this.sortField = (Array.isArray(event.sortField) ? event.sortField[0] : event.sortField) || '-collection_date';
    this.sortOrder = event.sortOrder ?? -1;
    this.loadSamples();
  }

  loadPatients() {
    this.patientService.getAll().subscribe({
      next: (data: any) => {
        this.patients = data?.results ?? data ?? [];
        this.patientFilterOptions = [
          { label: 'Tất cả bệnh nhân', value: null },
          ...this.patients.map((p) => ({ label: p.full_name, value: p.patient_id })),
        ];
      },
      error: () => {},
    });
  }

  loadSamples() {
    this.loading = true;
    const params: Record<string, string | number | boolean> = {
      page: Math.floor(this.first / this.rows) + 1,
    };
    const search = this.searchText.trim();
    if (search) {
      params['search'] = search;
    }
    if (this.patientFilter !== null) {
      params['patient'] = this.patientFilter;
    }
    if (this.sortField) {
      params['ordering'] = this.sortField;
    }

    this.bloodSampleService.getAll(params).subscribe({
      next: (data: any) => {
        this.samples = data?.results ?? data ?? [];
        this.totalRecords = data?.count ?? this.samples.length;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách mẫu xét nghiệm.' });
        this.samples = [];
        this.totalRecords = 0;
        this.loading = false;
      },
    });
  }

  
  openDetailDialog(sample: BloodSample): void {
    this.selectedSample = sample;
    this.showDetailDialog = true;
  }

  closeDetailDialog(): void {
    this.showDetailDialog = false;
    this.selectedSample = null;
  }

  editSampleFromDetail(): void {
    if (this.selectedSample?.sample_id) {
      const id = this.selectedSample.sample_id;
      this.closeDetailDialog();
      this.router.navigate(['/blood-samples', id, 'edit']);
    }
  }

  getMarkerAssessment(marker: string, val: number | null | undefined): { label: string; severity: 'success' | 'warning' | 'danger' | 'info' } {
    if (val === null || val === undefined) return { label: 'Chưa xét nghiệm', severity: 'info' };
    switch (marker) {
      case 'hemoglobin':
        if (val < 10.0) return { label: 'Thiếu máu (< 10.0)', severity: 'danger' };
        if (val > 13.0) return { label: 'Cao (> 13.0)', severity: 'warning' };
        return { label: 'Đạt mục tiêu (10 - 12)', severity: 'success' };
      case 'potassium':
        if (val < 3.5) return { label: 'Hạ Kali (< 3.5)', severity: 'warning' };
        if (val > 5.5) return { label: 'Tăng Kali nguy cơ (> 5.5)', severity: 'danger' };
        if (val > 5.0) return { label: 'Hơi cao (5.1 - 5.5)', severity: 'warning' };
        return { label: 'Bình thường (3.5 - 5.0)', severity: 'success' };
      case 'sodium':
        if (val < 135) return { label: 'Hạ Natri (< 135)', severity: 'warning' };
        if (val > 145) return { label: 'Tăng Natri (> 145)', severity: 'warning' };
        return { label: 'Bình thường (135 - 145)', severity: 'success' };
      case 'calcium':
        if (val < 2.1) return { label: 'Hạ Canxi (< 2.1)', severity: 'warning' };
        if (val > 2.6) return { label: 'Tăng Canxi (> 2.6)', severity: 'warning' };
        return { label: 'Bình thường (2.1 - 2.6)', severity: 'success' };
      case 'phosphorus':
        if (val < 1.1) return { label: 'Hạ Phospho (< 1.1)', severity: 'warning' };
        if (val > 1.8) return { label: 'Tăng Phospho (> 1.8)', severity: 'danger' };
        return { label: 'Đạt mục tiêu (1.1 - 1.8)', severity: 'success' };
      case 'urea':
        if (val > 35) return { label: 'Rất cao (> 35)', severity: 'danger' };
        if (val > 20) return { label: 'Cao (CKD)', severity: 'warning' };
        return { label: 'Kiểm soát tốt', severity: 'success' };
      case 'creatinine':
        if (val > 800) return { label: 'Rất cao (> 800)', severity: 'danger' };
        if (val > 400) return { label: 'Mức lọc máu (400 - 800)', severity: 'warning' };
        return { label: 'Bình thường', severity: 'success' };
      case 'albumin':
        if (val < 3.5) return { label: 'Hạ Albumin (< 3.5)', severity: 'danger' };
        return { label: 'Bình thường (≥ 3.5)', severity: 'success' };
      case 'kt_v':
        if (val < 1.2) return { label: 'Chưa đạt (< 1.2)', severity: 'danger' };
        if (val < 1.4) return { label: 'Đạt chuẩn (1.2 - 1.4)', severity: 'warning' };
        return { label: 'Tối ưu (≥ 1.4)', severity: 'success' };
      default:
        return { label: 'Đã ghi nhận', severity: 'info' };
    }
  }

  confirmDelete(sample: BloodSample) {
    this.confirmationService.confirm({
      header: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa mẫu xét nghiệm "${sample.sample_id}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      accept: () => {
        this.bloodSampleService.delete(sample.sample_id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã xóa mẫu xét nghiệm "${sample.sample_id}".` });
            this.loadSamples();
          },
          error: (err) => {
            const detail = err?.error?.detail || 'Không thể xóa mẫu xét nghiệm này.';
            this.messageService.add({ severity: 'error', summary: 'Lỗi', detail });
          },
        });
      },
    });
  }
}
