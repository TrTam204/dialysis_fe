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
  template: `
    <div class="page-shell">
      <p-card header="Quản lý Bệnh nhân">
        <div class="toolbar">
          <span class="p-input-icon-left search-box">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              placeholder="Tìm theo tên / mã / SĐT..."
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
            [style]="{ minWidth: '160px' }"
          ></p-dropdown>

          <p-dropdown
            [options]="genderFilterOptions"
            [(ngModel)]="genderFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            [style]="{ minWidth: '140px' }"
          ></p-dropdown>

          <a pButton *ngIf="canWrite" routerLink="/patients/new" icon="pi pi-plus" label="Thêm mới" class="p-button-success"></a>
        </div>

        <p-table
          [value]="patients"
          [lazy]="true"
          [lazyLoadOnInit]="false"
          (onLazyLoad)="onLazyLoad($event)"
          [paginator]="true"
          [rows]="rows"
          [first]="first"
          [totalRecords]="totalRecords"
          [loading]="loading"
          dataKey="patient_id"
          responsiveLayout="scroll"
        >
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="patient_id">Mã BN <p-sortIcon field="patient_id"></p-sortIcon></th>
              <th pSortableColumn="full_name">Họ và tên <p-sortIcon field="full_name"></p-sortIcon></th>
              <th pSortableColumn="date_of_birth">Ngày sinh <p-sortIcon field="date_of_birth"></p-sortIcon></th>
              <th pSortableColumn="gender">Giới tính <p-sortIcon field="gender"></p-sortIcon></th>
              <th pSortableColumn="status">Trạng thái <p-sortIcon field="status"></p-sortIcon></th>
              <th pSortableColumn="created_at">Ngày tạo <p-sortIcon field="created_at"></p-sortIcon></th>
              <th style="width: 140px">Hành động</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-patient>
            <tr>
              <td>{{ patient.patient_id }}</td>
              <td>{{ patient.full_name }}</td>
              <td>{{ patient.date_of_birth | date: 'dd/MM/yyyy' }}</td>
              <td>{{ getGenderLabel(patient.gender) }}</td>
              <td>
                <p-tag [value]="getStatusLabel(patient.status)" [severity]="getStatusSeverity(patient.status)"></p-tag>
              </td>
              <td>{{ patient.created_at | date: 'dd/MM/yyyy' }}</td>
              <td>
                <a
                  pButton
                  type="button"
                  icon="pi pi-eye"
                  class="p-button-text"
                  [routerLink]="['/patients', patient.patient_id]"
                  [attr.aria-label]="'Xem ' + patient.full_name"
                ></a>
                <a
                  pButton
                  *ngIf="canWrite"
                  type="button"
                  icon="pi pi-pencil"
                  class="p-button-text"
                  [routerLink]="['/patients', patient.patient_id, 'edit']"
                  [attr.aria-label]="'Sửa ' + patient.full_name"
                ></a>
                <button
                  pButton
                  *ngIf="canWrite"
                  type="button"
                  icon="pi pi-trash"
                  class="p-button-text p-button-danger"
                  (click)="confirmDelete(patient)"
                ></button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center">Không có dữ liệu</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <p-confirmDialog header="Xác nhận xóa" icon="pi pi-exclamation-triangle" [style]="{ width: '420px' }"></p-confirmDialog>
    </div>
  `,
  styles: [
    '.page-shell { padding: 24px; }',
    '.toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }',
    '.search-box { flex: 1; min-width: 200px; max-width: 360px; }',
    '.search-box input { width: 100%; }',
    '.text-center { text-align: center; }',
  ],
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

  canWrite = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private patientService: PatientService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    const role = this.authService.getUserRole();
    this.canWrite = role === 'ADMIN' || role === 'DOCTOR';

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
