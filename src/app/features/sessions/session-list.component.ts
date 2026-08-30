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
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
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
  ],
  template: `
    <div class="page-shell">
      <p-card header="Quản lý Phiên lọc máu">
        <div class="toolbar">
          <span class="p-input-icon-left search-box">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              placeholder="Tìm theo mã phiên / tên bệnh nhân..."
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
            [style]="{ minWidth: '150px' }"
          ></p-dropdown>

          <p-dropdown
            [options]="patientFilterOptions"
            [(ngModel)]="patientFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            [style]="{ minWidth: '180px' }"
          ></p-dropdown>

          <p-dropdown
            [options]="machineFilterOptions"
            [(ngModel)]="machineFilter"
            (ngModelChange)="onFilterChange()"
            optionLabel="label"
            optionValue="value"
            [style]="{ minWidth: '150px' }"
          ></p-dropdown>

          <a pButton *ngIf="canWrite" routerLink="/sessions/new" icon="pi pi-plus" label="Thêm mới" class="p-button-success"></a>
        </div>

        <p-table
          [value]="sessions"
          [lazy]="true"
          [lazyLoadOnInit]="false"
          (onLazyLoad)="onLazyLoad($event)"
          [paginator]="true"
          [rows]="rows"
          [first]="first"
          [totalRecords]="totalRecords"
          [loading]="loading"
          dataKey="session_id"
          responsiveLayout="scroll"
        >
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="session_id">Mã phiên <p-sortIcon field="session_id"></p-sortIcon></th>
              <th pSortableColumn="patient__full_name">Bệnh nhân <p-sortIcon field="patient__full_name"></p-sortIcon></th>
              <th pSortableColumn="machine__name">Máy lọc <p-sortIcon field="machine__name"></p-sortIcon></th>
              <th pSortableColumn="assigned_nurse__first_name">Điều dưỡng <p-sortIcon field="assigned_nurse__first_name"></p-sortIcon></th>
              <th pSortableColumn="scheduled_start">Bắt đầu <p-sortIcon field="scheduled_start"></p-sortIcon></th>
              <th pSortableColumn="scheduled_end">Kết thúc <p-sortIcon field="scheduled_end"></p-sortIcon></th>
              <th pSortableColumn="status">Trạng thái <p-sortIcon field="status"></p-sortIcon></th>
              <th *ngIf="canWrite" style="width: 120px">Hành động</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-session>
            <tr>
              <td><p-tag [value]="session.session_id"></p-tag></td>
              <td>{{ session.patient_name || session.patient }}</td>
              <td>{{ session.machine_name || session.machine }}</td>
              <td>{{ session.nurse_name || session.assigned_nurse }}</td>
              <td>{{ session.scheduled_start | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ session.scheduled_end | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <p-tag [value]="getStatusLabel(session.status)" [severity]="getStatusSeverity(session.status)"></p-tag>
              </td>
              <td *ngIf="canWrite">
                <a
                  pButton
                  type="button"
                  icon="pi pi-eye"
                  class="p-button-text"
                  [routerLink]="['/sessions', session.session_id]"
                  [attr.aria-label]="'Xem ' + session.session_id"
                ></a>
                <a
                  pButton
                  type="button"
                  icon="pi pi-pencil"
                  class="p-button-text"
                  [routerLink]="['/sessions', session.session_id, 'edit']"
                  [attr.aria-label]="'Sửa ' + session.session_id"
                ></a>
                <button
                  pButton
                  type="button"
                  icon="pi pi-trash"
                  class="p-button-text p-button-danger"
                  (click)="confirmDelete(session)"
                ></button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="canWrite ? 8 : 7" class="text-center">Không có dữ liệu</td>
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
    private confirmationService: ConfirmationService
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
