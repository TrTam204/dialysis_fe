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
  templateUrl: './session-list.component.html',
  styleUrls: ['./session-list.component.scss'],
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
