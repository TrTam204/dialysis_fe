import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DialogModule } from 'primeng/dialog';
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
    InputTextareaModule,
    DialogModule,
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
    { label: 'Chờ thực hiện', value: 'SCHEDULED' },
    { label: 'Đang thực hiện', value: 'IN_PROGRESS' },
    { label: 'Hoàn thành', value: 'COMPLETED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];

  patientFilterOptions: { label: string; value: string | null }[] = [
    { label: 'Tất cả bệnh nhân', value: null },
  ];

  machineFilterOptions: { label: string; value: string | null }[] = [
    { label: 'Tất cả máy lọc', value: null },
  ];

  sortField = 'scheduled_start';
  sortOrder = -1;

  canWrite = false;

  // Quick Bedside SOS state
  showQuickSosDialog = false;
  targetSosSession: DialysisSession | null = null;
  sosReason = 'Tụt huyết áp cấp (MAP giảm đột ngột < 60 mmHg hoặc HA tâm thu giảm > 30 mmHg)';
  sosNotes = '';
  sosSaving = false;

  readonly sosReasonOptions = [
    'Tụt huyết áp cấp (MAP giảm đột ngột < 60 mmHg hoặc HA tâm thu giảm > 30 mmHg)',
    'Khó thở cấp / Phù phổi cấp',
    'Choáng phản vệ / Dị ứng màng lọc',
    'Chuột rút cơ dữ dội kèm co giật',
    'Sự cố đường mạch máu (vỡ FAV, tuột kim chảy máu)',
    'Lý do cấp tính khác',
  ];

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
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.canWrite = this.authService.hasRole(['ADMIN', 'DOCTOR']);

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.first = 0;
        this.loadSessions();
      });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      let shouldReload = false;

      if (params['page']) {
        const pageNum = parseInt(params['page'], 10);
        if (!isNaN(pageNum) && pageNum > 0) {
          this.first = (pageNum - 1) * this.rows;
          shouldReload = true;
        }
      }
      if (params['search'] !== undefined && params['search'] !== this.searchText) {
        this.searchText = params['search'];
        shouldReload = true;
      }
      if (params['status'] !== undefined && params['status'] !== this.statusFilter) {
        this.statusFilter = params['status'] || null;
        shouldReload = true;
      }
      if (params['patient'] !== undefined && params['patient'] !== this.patientFilter) {
        this.patientFilter = params['patient'] || null;
        shouldReload = true;
      }
      if (params['machine'] !== undefined && params['machine'] !== this.machineFilter) {
        this.machineFilter = params['machine'] || null;
        shouldReload = true;
      }

      if (shouldReload) {
        this.loadSessions();
      }
    });

    this.loadFilterOptions();
    this.loadSessions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatIndex(idx: number): string {
    return idx < 10 ? `0${idx}` : `${idx}`;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'Chờ lọc',
      IN_PROGRESS: 'Đang lọc',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
    };
    return map[status] || status;
  }

  getStatusSeverity(status: string): 'info' | 'warning' | 'success' | 'danger' {
    const map: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
      SCHEDULED: 'info',
      IN_PROGRESS: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return map[status] || 'info';
  }

  onSearchInput(text: string) {
    this.searchText = text;
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

  onLazyLoad(event: TableLazyLoadEvent) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
    this.sortField = (Array.isArray(event.sortField) ? event.sortField[0] : event.sortField) || 'scheduled_start';
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
          { label: 'Tất cả máy lọc', value: null },
          ...this.machines.map((m) => ({ label: m.name, value: m.machine_id })),
        ];
      },
      error: () => {},
    });
  }

  loadSessions() {
    this.loading = true;
    const params: Record<string, string | number> = {
      page: Math.floor(this.first / this.rows) + 1,
    };
    const search = this.searchText.trim();
    if (search) params['search'] = search;
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.patientFilter) params['patient'] = this.patientFilter;
    if (this.machineFilter) params['machine'] = this.machineFilter;
    if (this.sortField) {
      params['ordering'] = (this.sortOrder === -1 ? '-' : '') + this.sortField;
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

  getSessionNavigationParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {
      page: Math.floor(this.first / this.rows) + 1,
    };
    if (this.searchText.trim()) params['search'] = this.searchText.trim();
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.patientFilter) params['patient'] = this.patientFilter;
    if (this.machineFilter) params['machine'] = this.machineFilter;
    return params;
  }

  navigateToSession(session: DialysisSession) {
    this.router.navigate(['/sessions', session.session_id], {
      queryParams: this.getSessionNavigationParams(),
    });
  }

  confirmDelete(session: DialysisSession) {
    this.confirmationService.confirm({
      header: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa ca lọc "${session.session_id}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      accept: () => {
        this.sessionService.delete(session.session_id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã xóa ca lọc "${session.session_id}".` });
            this.loadSessions();
          },
          error: (err) => {
            const detail = err?.error?.detail || 'Không thể xóa ca lọc này.';
            this.messageService.add({ severity: 'error', summary: 'Lỗi', detail });
          },
        });
      },
    });
  }

  // Quick SOS from table
  openQuickSos(session: DialysisSession): void {
    this.targetSosSession = session;
    this.showQuickSosDialog = true;
    this.sosNotes = '';
  }

  playEmergencyAlarm(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch (e) {}
  }

  submitQuickSos(): void {
    if (!this.targetSosSession) return;
    this.sosSaving = true;
    const sess = this.targetSosSession;
    this.sessionService.triggerSos(sess.session_id, this.sosReason, this.sosNotes).subscribe({
      next: (updatedSession) => {
        this.sosSaving = false;
        this.showQuickSosDialog = false;
        sess.is_emergency = true;
        sess.emergency_details = updatedSession.emergency_details;
        this.playEmergencyAlarm();
        this.messageService.add({
          severity: 'error',
          summary: '🚨 ĐÃ PHÁT BÁO ĐỘNG SOS KHẨN CẤP',
          detail: `Báo động đỏ đã phát cho ca lọc ${sess.session_id} (BN ${sess.patient_name || sess.patient})!`,
          life: 8000,
        });
      },
      error: (err) => {
        this.sosSaving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: err.error?.detail || 'Không thể kích hoạt báo động SOS.',
        });
      },
    });
  }
}
