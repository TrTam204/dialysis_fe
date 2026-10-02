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
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SessionService } from '../../core/services/session.service';
import { PatientService } from '../../core/services/patient.service';
import { MachineService } from '../../core/services/machine.service';
import { StaffService } from '../../core/services/staff.service';
import { AuthService } from '../../core/services/auth.service';
import { DialysisSession, Patient, DialysisMachine, CustomUser } from '../../core/models';

@Component({
  selector: 'app-session-list',
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
    CalendarModule,
    TagModule,
    TooltipModule,
  ],
  template: `
    <div class="page-shell">
      <div class="header-section">
        <div>
          <h2 class="page-title">Quản lý Phiên lọc máu</h2>
          <p class="page-subtitle">Sổ theo dõi và phân công ca lọc máu tại buồng lọc</p>
        </div>
        <div class="header-stats">
          <span class="record-badge">
            <i class="pi pi-calendar-plus text-primary"></i>
            <span>Tổng cộng: <strong>{{ totalRecords }}</strong> ca lọc</span>
          </span>
          <a pButton *ngIf="canWrite" routerLink="/sessions/new" icon="pi pi-plus" label="Thêm mới" class="p-button-primary p-button-sm add-btn"></a>
        </div>
      </div>

      <div class="sheet-card">
        <div class="toolbar">
          <span class="p-input-icon-left search-box">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              placeholder="Tìm theo mã ca / tên bệnh nhân..."
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
            placeholder="Trạng thái"
            [style]="{ minWidth: '150px' }"
          ></p-dropdown>

          <p-dropdown
            [options]="patientFilterOptions"
            [(ngModel)]="patientFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            placeholder="Bệnh nhân"
            [style]="{ minWidth: '170px' }"
            [filter]="true"
            filterPlaceholder="Tìm bệnh nhân..."
          ></p-dropdown>

          <p-dropdown
            [options]="machineFilterOptions"
            [(ngModel)]="machineFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            placeholder="Máy lọc"
            [style]="{ minWidth: '140px' }"
          ></p-dropdown>

          <button
            *ngIf="searchText || statusFilter !== null || patientFilter !== null || machineFilter !== null"
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
          <span>Đang tải danh sách ca lọc máu...</span>
        </div>

        <p-table
          *ngIf="!loading"
          [value]="sessions"
          [lazy]="true"
          [lazyLoadOnInit]="false"
          (onLazyLoad)="onLazyLoad($event)"
          [paginator]="true"
          [rows]="rows"
          [first]="first"
          [totalRecords]="totalRecords"
          dataKey="session_id"
          responsiveLayout="scroll"
          styleClass="p-datatable-gridlines sheet-table"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 50px" class="text-center">STT</th>
              <th pSortableColumn="session_id" style="width: 115px">Mã phiên <p-sortIcon field="session_id"></p-sortIcon></th>
              <th pSortableColumn="patient__full_name">Bệnh nhân <p-sortIcon field="patient__full_name"></p-sortIcon></th>
              <th pSortableColumn="machine__name" style="width: 125px">Máy lọc <p-sortIcon field="machine__name"></p-sortIcon></th>
              <th pSortableColumn="assigned_nurse__first_name" style="width: 155px">Điều dưỡng <p-sortIcon field="assigned_nurse__first_name"></p-sortIcon></th>
              <th pSortableColumn="scheduled_start" style="width: 155px">Thời gian ca <p-sortIcon field="scheduled_start"></p-sortIcon></th>
              <th style="width: 110px" class="text-right">UF Mục tiêu</th>
              <th pSortableColumn="status" style="width: 140px" class="text-center">Trạng thái <p-sortIcon field="status"></p-sortIcon></th>
              <th style="width: 115px" class="text-center">Thao tác</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-session let-rowIndex="rowIndex">
            <tr (click)="navigateToSession(session)" class="clickable-row">
              <td class="text-center font-mono col-stt">{{ formatIndex(first + rowIndex + 1) }}</td>
              <td>
                <span class="code-badge">{{ session.session_id }}</span>
              </td>
              <td>
                <span class="patient-name">{{ session.patient_name || session.patient }}</span>
              </td>
              <td>
                <span class="machine-badge">
                  <i class="pi pi-server text-xs"></i>
                  {{ session.machine_name || session.machine }}
                </span>
              </td>
              <td>
                <span class="nurse-cell">
                  <i class="pi pi-user text-xs"></i>
                  {{ session.nurse_name || session.assigned_nurse }}
                </span>
              </td>
              <td>
                <div class="time-cell">
                  <span class="date-str">{{ session.scheduled_start | date: 'dd/MM/yyyy' }}</span>
                  <span class="hours-str">{{ session.scheduled_start | date: 'HH:mm' }} - {{ session.scheduled_end | date: 'HH:mm' }}</span>
                </div>
              </td>
              <td class="text-right">
                <span *ngIf="session.uf_target != null" class="uf-val font-semibold">{{ session.uf_target }} L</span>
                <span *ngIf="session.uf_target == null" class="text-slate-400">-</span>
              </td>
              <td class="text-center">
                <span [class]="'status-pill status-' + (session.status || '').toLowerCase().replace('_', '-')">
                  <span class="dot"></span>
                  {{ getStatusLabel(session.status) }}
                </span>
              </td>
              <td class="text-center" (click)="$event.stopPropagation()">
                <div class="action-cell">
                  <a
                    pButton
                    type="button"
                    icon="pi pi-eye"
                    class="p-button-text p-button-rounded p-button-sm"
                    [routerLink]="['/sessions', session.session_id]"
                    [attr.aria-label]="'Xem ' + session.session_id"
                    pTooltip="Xem ca lọc"
                    tooltipPosition="top"
                  ></a>
                  <a
                    pButton
                    *ngIf="canWrite"
                    type="button"
                    icon="pi pi-pencil"
                    class="p-button-text p-button-rounded p-button-sm p-button-info"
                    [routerLink]="['/sessions', session.session_id, 'edit']"
                    [attr.aria-label]="'Sửa ' + session.session_id"
                    pTooltip="Sửa ca lọc"
                    tooltipPosition="top"
                  ></a>
                  <button
                    pButton
                    *ngIf="canWrite"
                    type="button"
                    icon="pi pi-trash"
                    class="p-button-text p-button-rounded p-button-sm p-button-danger"
                    (click)="confirmDelete(session)"
                    pTooltip="Xóa ca lọc"
                    tooltipPosition="top"
                  ></button>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="9" class="text-center empty-cell">
                <i class="pi pi-inbox empty-icon"></i>
                <div>Không tìm thấy ca lọc máu nào</div>
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

      .clickable-row {
        cursor: pointer;
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
        color: #0369a1;
        border: 1px solid #bae6fd;
        border-radius: 4px;
      }

      .patient-name {
        font-weight: 700;
        color: #0f172a;
        font-size: 13.5px;
      }

      .machine-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 7px;
        background: #f0fdfa;
        color: #0f766e;
        border: 1px solid #ccfbf1;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
      }

      .nurse-cell {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 13px;
        color: #334155;

        i {
          color: #94a3b8;
        }
      }

      .time-cell {
        display: flex;
        flex-direction: column;
        gap: 1px;

        .date-str {
          font-weight: 600;
          color: #1e293b;
          font-size: 12.5px;
        }

        .hours-str {
          font-size: 11.5px;
          color: #64748b;
          font-family: ui-monospace, monospace;
        }
      }

      .uf-val {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #0f766e;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 11.5px;
        font-weight: 600;
        white-space: nowrap;

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        &.status-in-progress {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          .dot {
            background: #10b981;
          }
        }

        &.status-completed {
          background: #f0fdf4;
          color: #15803d;
          border: 1px solid #bbf7d0;
          .dot {
            background: #22c55e;
          }
        }

        &.status-scheduled {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          .dot {
            background: #3b82f6;
          }
        }

        &.status-cancelled {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          .dot {
            background: #ef4444;
          }
        }
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
          font-size: 28px;
          color: #94a3b8;
          margin-bottom: 6px;
        }
      }

      .text-center {
        text-align: center;
      }
      .text-right {
        text-align: right;
      }

      @media (max-width: 768px) {
        .page-shell {
          padding: 12px;
        }
        .toolbar {
          .search-box {
            min-width: 100%;
            max-width: 100%;
          }
        }
      }
    `,
  ],
})
export class SessionListComponent implements OnInit, OnDestroy {
  sessions: DialysisSession[] = [];
  patients: Patient[] = [];
  machines: DialysisMachine[] = [];
  nurses: CustomUser[] = [];
  totalRecords = 0;
  rows = 10;
  first = 0;
  loading = false;

  searchText = '';
  statusFilter: string | null = null;
  patientFilter: string | null = null;
  machineFilter: string | null = null;

  statusFilterOptions = [
    { label: 'Tất cả trạng thái', value: null },
    { label: 'Đã lên lịch', value: 'SCHEDULED' },
    { label: 'Đang thực hiện', value: 'IN_PROGRESS' },
    { label: 'Hoàn thành', value: 'COMPLETED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];

  patientFilterOptions: { label: string; value: string | null }[] = [
    { label: 'Tất cả bệnh nhân', value: null },
  ];

  machineFilterOptions: { label: string; value: string | null }[] = [
    { label: 'Tất cả máy', value: null },
  ];

  sortField = '-scheduled_start';
  sortOrder = -1;

  canWrite = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private sessionService: SessionService,
    private patientService: PatientService,
    private machineService: MachineService,
    private staffService: StaffService,
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
        this.loadSessions();
      });

    this.loadFilterOptions();
    this.loadSessions();
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
    this.loadSessions();
  }

  clearFilters() {
    this.searchText = '';
    this.statusFilter = null;
    this.patientFilter = null;
    this.machineFilter = null;
    this.first = 0;
    this.loadSessions();
  }

  formatIndex(idx: number): string {
    return idx < 10 ? `0${idx}` : `${idx}`;
  }

  navigateToSession(session: DialysisSession) {
    this.router.navigate(['/sessions', session.session_id]);
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
    this.sortField = (Array.isArray(event.sortField) ? event.sortField[0] : event.sortField) || '-scheduled_start';
    this.sortOrder = event.sortOrder ?? -1;
    this.loadSessions();
  }

  loadFilterOptions() {
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

    this.machineService.getAll().subscribe({
      next: (data: any) => {
        this.machines = data?.results ?? data ?? [];
        this.machineFilterOptions = [
          { label: 'Tất cả máy', value: null },
          ...this.machines.map((m) => ({ label: m.name, value: m.machine_id })),
        ];
      },
      error: () => {},
    });
  }

  loadSessions() {
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
    if (this.patientFilter !== null) {
      params['patient'] = this.patientFilter;
    }
    if (this.machineFilter !== null) {
      params['machine'] = this.machineFilter;
    }
    if (this.sortField) {
      params['ordering'] = this.sortField;
    }

    this.sessionService.getAll(params).subscribe({
      next: (data: any) => {
        this.sessions = data?.results ?? data ?? [];
        this.totalRecords = data?.count ?? this.sessions.length;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách phiên lọc.' });
        this.sessions = [];
        this.totalRecords = 0;
        this.loading = false;
      },
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      SCHEDULED: 'Đã lên lịch',
      IN_PROGRESS: 'Đang thực hiện',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    const severities: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      SCHEDULED: 'info',
      IN_PROGRESS: 'success',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return severities[status] || 'info';
  }

  confirmDelete(session: DialysisSession) {
    this.confirmationService.confirm({
      header: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa phiên lọc "${session.session_id}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      accept: () => {
        this.sessionService.delete(session.session_id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã xóa phiên lọc "${session.session_id}".` });
            this.loadSessions();
          },
          error: (err) => {
            const detail = err?.error?.detail || 'Không thể xóa phiên lọc này.';
            this.messageService.add({ severity: 'error', summary: 'Lỗi', detail });
          },
        });
      },
    });
  }
}
