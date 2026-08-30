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
      <p-card header="Quản lý Mẫu xét nghiệm máu">
        <div class="toolbar">
          <span class="p-input-icon-left search-box">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              placeholder="Tìm theo mã mẫu / ghi chú..."
              [ngModel]="searchText"
              (ngModelChange)="onSearchInput($event)"
            />
          </span>

          <p-dropdown
            [options]="patientFilterOptions"
            [(ngModel)]="patientFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            [style]="{ minWidth: '200px' }"
          ></p-dropdown>

          <a pButton *ngIf="canWrite" routerLink="/blood-samples/new" icon="pi pi-plus" label="Thêm mới" class="p-button-success"></a>
        </div>

        <p-table
          [value]="samples"
          [lazy]="true"
          [lazyLoadOnInit]="false"
          (onLazyLoad)="onLazyLoad($event)"
          [paginator]="true"
          [rows]="rows"
          [first]="first"
          [totalRecords]="totalRecords"
          [loading]="loading"
          dataKey="sample_id"
          responsiveLayout="scroll"
        >
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="sample_id">Mã mẫu <p-sortIcon field="sample_id"></p-sortIcon></th>
              <th pSortableColumn="patient__full_name">Bệnh nhân <p-sortIcon field="patient__full_name"></p-sortIcon></th>
              <th pSortableColumn="collection_date">Ngày lấy mẫu <p-sortIcon field="collection_date"></p-sortIcon></th>
              <th pSortableColumn="hemoglobin_level">Hemoglobin <p-sortIcon field="hemoglobin_level"></p-sortIcon></th>
              <th pSortableColumn="potassium_level">Kali <p-sortIcon field="potassium_level"></p-sortIcon></th>
              <th pSortableColumn="created_at">Ngày tạo <p-sortIcon field="created_at"></p-sortIcon></th>
              <th *ngIf="canWrite" style="width: 120px">Hành động</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-sample>
            <tr>
              <td><p-tag [value]="sample.sample_id"></p-tag></td>
              <td>{{ sample.patient_name || sample.patient }}</td>
              <td>{{ sample.collection_date | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ sample.hemoglobin_level }} g/dL</td>
              <td>{{ sample.potassium_level }} mEq/L</td>
              <td>{{ sample.created_at | date: 'dd/MM/yyyy' }}</td>
              <td *ngIf="canWrite">
                <a
                  pButton
                  type="button"
                  icon="pi pi-pencil"
                  class="p-button-text"
                  [routerLink]="['/blood-samples', sample.sample_id, 'edit']"
                  [attr.aria-label]="'Sửa ' + sample.sample_id"
                ></a>
                <button
                  pButton
                  type="button"
                  icon="pi pi-trash"
                  class="p-button-text p-button-danger"
                  (click)="confirmDelete(sample)"
                ></button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="canWrite ? 7 : 6" class="text-center">Không có dữ liệu</td>
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

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private bloodSampleService: BloodSampleService,
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
        this.loadSamples();
      });

    this.loadPatients();
    this.loadSamples();
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
