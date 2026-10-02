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
  ],
  template: `
    <div class="page-shell">
      <div class="header-section">
        <div>
          <h2 class="page-title">Quản lý Mẫu xét nghiệm</h2>
          <p class="page-subtitle">Sổ lưu trữ và theo dõi các chỉ số sinh hóa máu của bệnh nhân</p>
        </div>
        <div class="header-stats">
          <span class="record-badge">
            <i class="pi pi-file-excel text-primary"></i>
            <span>Tổng cộng: <strong>{{ totalRecords }}</strong> mẫu xét nghiệm</span>
          </span>
          <a
            pButton
            *ngIf="canWrite"
            routerLink="/blood-samples/new"
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
            placeholder="Lọc theo bệnh nhân"
            [style]="{ minWidth: '220px' }"
            [filter]="true"
            filterPlaceholder="Tìm bệnh nhân..."
          ></p-dropdown>

          <button
            *ngIf="searchText || patientFilter !== null"
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
          <span>Đang tải danh sách mẫu xét nghiệm...</span>
        </div>

        <p-table
          *ngIf="!loading"
          [value]="samples"
          [lazy]="true"
          [lazyLoadOnInit]="false"
          (onLazyLoad)="onLazyLoad($event)"
          [paginator]="true"
          [rows]="rows"
          [first]="first"
          [totalRecords]="totalRecords"
          dataKey="sample_id"
          responsiveLayout="scroll"
          styleClass="p-datatable-gridlines sheet-table"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 50px" class="text-center">STT</th>
              <th pSortableColumn="sample_id" style="width: 130px">
                Mã mẫu <p-sortIcon field="sample_id"></p-sortIcon>
              </th>
              <th pSortableColumn="patient__full_name" style="min-width: 200px">
                Bệnh nhân <p-sortIcon field="patient__full_name"></p-sortIcon>
              </th>
              <th pSortableColumn="collection_date" style="width: 175px">
                Ngày lấy mẫu <p-sortIcon field="collection_date"></p-sortIcon>
              </th>
              <th pSortableColumn="hemoglobin_level" style="width: 155px" class="text-right">
                Hemoglobin (Hb) <p-sortIcon field="hemoglobin_level"></p-sortIcon>
              </th>
              <th pSortableColumn="potassium_level" style="width: 145px" class="text-right">
                Kali (K+) <p-sortIcon field="potassium_level"></p-sortIcon>
              </th>
              <th pSortableColumn="created_at" style="width: 130px">
                Ngày tạo <p-sortIcon field="created_at"></p-sortIcon>
              </th>
              <th *ngIf="canWrite" style="width: 105px" class="text-center">Thao tác</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-sample let-rowIndex="rowIndex">
            <tr>
              <td class="text-center font-mono col-stt">{{ formatIndex(first + rowIndex + 1) }}</td>
              <td>
                <span class="code-badge">{{ sample.sample_id }}</span>
              </td>
              <td>
                <span class="patient-name">{{ sample.patient_name || sample.patient }}</span>
              </td>
              <td>
                <span class="date-text">
                  <i class="pi pi-calendar text-xs text-slate-400"></i>
                  {{ sample.collection_date | date: 'dd/MM/yyyy HH:mm' }}
                </span>
              </td>
              <td class="text-right">
                <span class="val-pill font-mono font-semibold">
                  {{ sample.hemoglobin_level }} <span class="val-unit">g/dL</span>
                </span>
              </td>
              <td class="text-right">
                <span class="val-pill font-mono font-semibold">
                  {{ sample.potassium_level }} <span class="val-unit">mEq/L</span>
                </span>
              </td>
              <td>
                <span class="date-text">{{ sample.created_at | date: 'dd/MM/yyyy' }}</span>
              </td>
              <td *ngIf="canWrite" class="text-center">
                <div class="action-cell">
                  <a
                    pButton
                    type="button"
                    icon="pi pi-pencil"
                    class="p-button-text p-button-rounded p-button-sm p-button-info"
                    [routerLink]="['/blood-samples', sample.sample_id, 'edit']"
                    [attr.aria-label]="'Sửa ' + sample.sample_id"
                    pTooltip="Sửa thông tin"
                    tooltipPosition="top"
                  ></a>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-trash"
                    class="p-button-text p-button-rounded p-button-sm p-button-danger"
                    (click)="confirmDelete(sample)"
                    pTooltip="Xóa mẫu xét nghiệm"
                    tooltipPosition="top"
                  ></button>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="canWrite ? 8 : 7" class="text-center empty-cell">
                <i class="pi pi-inbox empty-icon"></i>
                <div>Không tìm thấy mẫu xét nghiệm nào</div>
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
          max-width: 320px;

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

      .patient-name {
        font-weight: 700;
        color: #0f172a;
        font-size: 13px;
      }

      .date-text {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12.5px;
        color: #475569;
      }

      .val-pill {
        display: inline-block;
        font-size: 13px;
        color: #0f172a;
      }

      .val-unit {
        font-size: 11px;
        color: #64748b;
        font-weight: 400;
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
