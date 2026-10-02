import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ChartModule } from 'primeng/chart';
import { Subject, Subscription, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionService } from '../../core/services/session.service';
import { VitalSignService } from '../../core/services/vital-sign.service';
import { AuthService } from '../../core/services/auth.service';
import { DialysisSession, VitalSign } from '../../core/models';

@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    DividerModule,
    TableModule,
    DialogModule,
    CalendarModule,
    InputNumberModule,
    InputTextareaModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    ChartModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './session-detail.component.html',
  styleUrl: './session-detail.component.scss',
})
export class SessionDetailComponent implements OnInit, OnDestroy {
  session: DialysisSession | null = null;
  vitalSigns: VitalSign[] = [];
  loading = false;
  vitalSignsLoading = false;
  vitalSignsError = false;

  // Step 4: Quick Refresh & Safe Polling
  lastUpdated: Date = new Date();
  autoRefreshEnabled = false;
  private destroy$ = new Subject<void>();
  private pollingSub?: Subscription;

  // Permissions
  canEditFull = false;      // ADMIN, DOCTOR
  canManageWorkflow = false; // ADMIN, DOCTOR, or ASSIGNED NURSE
  canCancel = false;        // ADMIN, DOCTOR
  canWriteVitals = false;   // ADMIN, DOCTOR, or ASSIGNED NURSE
  canDeleteVitals = false;  // ADMIN only (Rule 3: Nurse cannot delete vitals)

  // Chart properties (Step 2)
  activeChartTab: 'bp' | 'vitals' = 'bp';
  bpChartData: any = null;
  multiChartData: any = null;

  readonly bpChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Thời gian', font: { size: 11 } },
        ticks: { font: { size: 11 } },
      },
      y: {
        title: { display: true, text: 'Huyết áp (mmHg)', font: { size: 11 } },
        ticks: { font: { size: 11 } },
      },
    },
  };

  readonly multiChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Thời gian', font: { size: 11 } },
        ticks: { font: { size: 11 } },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'Mạch (bpm)', font: { size: 11 } },
        ticks: { font: { size: 11 } },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'SpO2 (%) & Thân nhiệt (°C)', font: { size: 11 } },
        ticks: { font: { size: 11 } },
      },
    },
  };

  // Dialogs & saving states
  startSessionDialog = false;
  endSessionDialog = false;
  clinicalParamsDialog = false;
  vitalSignDialog = false;
  editingVitalSign: VitalSign | null = null;

  actionSaving = false;
  vitalSignSaving = false;

  // Reactive Forms
  startForm: FormGroup;
  endForm: FormGroup;
  clinicalParamsForm: FormGroup;
  vitalSignForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private sessionService: SessionService,
    private vitalSignService: VitalSignService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    // Form bắt đầu ca lọc
    this.startForm = this.fb.group({
      pre_weight: [null, [Validators.required, Validators.min(1), Validators.max(300)]],
      uf_target: [null, [Validators.required, Validators.min(0), Validators.max(10)]],
    });

    // Form kết thúc ca lọc
    this.endForm = this.fb.group({
      post_weight: [null, [Validators.required, Validators.min(1), Validators.max(300)]],
      uf_actual: [null, [Validators.required, Validators.min(0), Validators.max(10)]],
      clinical_notes: [''],
    });

    // Form cập nhật thông số điều trị
    this.clinicalParamsForm = this.fb.group({
      pre_weight: [null, [Validators.min(1), Validators.max(300)]],
      post_weight: [null, [Validators.min(1), Validators.max(300)]],
      uf_target: [null, [Validators.min(0), Validators.max(10)]],
      uf_actual: [null, [Validators.min(0), Validators.max(10)]],
      clinical_notes: [''],
    });

    // Form ghi nhận sinh hiệu
    this.vitalSignForm = this.fb.group({
      recorded_at: [new Date(), Validators.required],
      systolic_bp: [null, [Validators.min(1), Validators.max(300)]],
      diastolic_bp: [null, [Validators.min(1), Validators.max(200)]],
      heart_rate: [null, [Validators.min(1), Validators.max(299)]],
      spo2: [null, [Validators.min(0), Validators.max(100)]],
      temperature: [null, [Validators.min(30), Validators.max(45)]],
      notes: [''],
    });
  }

  ngOnInit(): void {
    const sessionId = this.route.snapshot.paramMap.get('id');
    if (sessionId) {
      this.loadSession(sessionId);
      this.loadVitalSigns(sessionId);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSession(sessionId: string): void {
    this.loading = true;
    this.sessionService.getById(sessionId).subscribe({
      next: (session: DialysisSession) => {
        this.session = session;
        this.loading = false;
        this.calculatePermissions();
        if (session.status !== 'IN_PROGRESS' && this.autoRefreshEnabled) {
          this.autoRefreshEnabled = false;
          this.stopPolling();
        }
        this.updateCharts();
      },
      error: () => {
        this.loading = false;
        this.session = null;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể tải thông tin phiên lọc máu.',
        });
      },
    });
  }

  loadVitalSigns(sessionId: string, silent = false): void {
    if (!silent) {
      this.vitalSignsLoading = true;
    }
    this.vitalSignsError = false;
    this.vitalSignService.getBySession(sessionId).subscribe({
      next: (vitals: VitalSign[]) => {
        this.vitalSigns = vitals;
        this.vitalSignsLoading = false;
        this.vitalSignsError = false;
        this.lastUpdated = new Date();
        this.updateCharts();
      },
      error: () => {
        this.vitalSignsLoading = false;
        if (!silent) {
          this.vitalSignsError = true;
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải dữ liệu sinh hiệu.',
          });
        }
      },
    });
  }

  manualRefreshVitalSigns(): void {
    if (this.session && !this.vitalSignsLoading) {
      this.loadVitalSigns(this.session.session_id);
      this.messageService.add({
        severity: 'info',
        summary: 'Đã làm mới',
        detail: 'Dữ liệu diễn biến sinh hiệu đã được cập nhật.',
        life: 2000,
      });
    }
  }

  toggleAutoRefresh(): void {
    if (this.session?.status !== 'IN_PROGRESS') {
      this.autoRefreshEnabled = false;
      this.stopPolling();
      return;
    }

    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    if (this.autoRefreshEnabled) {
      this.startPolling();
      this.messageService.add({
        severity: 'info',
        summary: 'Tự động làm mới',
        detail: 'Đã bật tự động cập nhật mỗi 30 giây.',
        life: 2500,
      });
    } else {
      this.stopPolling();
      this.messageService.add({
        severity: 'info',
        summary: 'Tự động làm mới',
        detail: 'Đã tắt tự động cập nhật.',
        life: 2000,
      });
    }
  }

  startPolling(): void {
    this.stopPolling();
    if (!this.session || this.session.status !== 'IN_PROGRESS') return;

    this.pollingSub = interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const isDialogOpen = this.vitalSignDialog || this.startSessionDialog || this.endSessionDialog || this.clinicalParamsDialog;
        if (this.session?.status === 'IN_PROGRESS' && !isDialogOpen && !this.vitalSignsLoading) {
          this.loadVitalSigns(this.session.session_id, true);
        } else if (this.session?.status !== 'IN_PROGRESS') {
          this.autoRefreshEnabled = false;
          this.stopPolling();
        }
      });
  }

  stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  retryLoadVitalSigns(): void {
    if (this.session) {
      this.loadVitalSigns(this.session.session_id);
    }
  }

  calculatePermissions(): void {
    const role = this.authService.getUserRole();
    const currentUserId = this.authService.getCurrentUser()?.id;

    const isAdmin = role === 'ADMIN';
    const isDoctor = role === 'DOCTOR';
    const isAssignedNurse = role === 'NURSE' && this.session?.assigned_nurse === currentUserId;

    this.canEditFull = isAdmin || isDoctor;
    this.canCancel = isAdmin || isDoctor;
    this.canManageWorkflow = isAdmin || isDoctor || isAssignedNurse;
    this.canWriteVitals = isAdmin || isDoctor || isAssignedNurse;
    this.canDeleteVitals = isAdmin; // Strictly Rule 3: Nurse/Doctor cannot delete
  }

  // Helper metrics
  get weightGain(): number | null {
    if (this.session?.pre_weight && this.session?.patient_dry_weight) {
      return this.session.pre_weight - this.session.patient_dry_weight;
    }
    return null;
  }

  get actualDuration(): string | null {
    if (this.session?.actual_start && this.session?.actual_end) {
      const start = new Date(this.session.actual_start).getTime();
      const end = new Date(this.session.actual_end).getTime();
      const diffMin = Math.round((end - start) / 60000);
      if (diffMin <= 0) return '0 phút';
      const hours = Math.floor(diffMin / 60);
      const minutes = diffMin % 60;
      return hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;
    }
    return null;
  }

  get chronologicalVitals(): VitalSign[] {
    return [...this.vitalSigns].sort((a, b) => {
      const tA = a.recorded_at ? new Date(a.recorded_at).getTime() : 0;
      const tB = b.recorded_at ? new Date(b.recorded_at).getTime() : 0;
      return tA - tB;
    });
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  }

  updateCharts(): void {
    const vitals = this.chronologicalVitals;
    if (vitals.length < 2) {
      this.bpChartData = null;
      this.multiChartData = null;
      return;
    }

    const labels = vitals.map((v) => this.formatTime(v.recorded_at));

    this.bpChartData = {
      labels,
      datasets: [
        {
          label: 'Huyết áp tâm thu (Systolic)',
          data: vitals.map((v) => v.systolic_bp ?? null),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Huyết áp tâm trương (Diastolic)',
          data: vitals.map((v) => v.diastolic_bp ?? null),
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.08)',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };

    this.multiChartData = {
      labels,
      datasets: [
        {
          label: 'Nhịp tim (bpm)',
          data: vitals.map((v) => v.heart_rate ?? null),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          yAxisID: 'y',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'SpO2 (%)',
          data: vitals.map((v) => v.spo2 ?? null),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          yAxisID: 'y1',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Thân nhiệt (°C)',
          data: vitals.map((v) => v.temperature ?? null),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          yAxisID: 'y1',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }

  getVitalPhase(vital: VitalSign): 'PRE' | 'INTRA' | 'POST' {
    if (!vital?.recorded_at) return 'INTRA';
    const vTime = new Date(vital.recorded_at).getTime();

    const startTime = this.session?.actual_start
      ? new Date(this.session.actual_start).getTime()
      : (this.session?.scheduled_start ? new Date(this.session.scheduled_start).getTime() : null);

    const endTime = this.session?.actual_end
      ? new Date(this.session.actual_end).getTime()
      : null;

    if (startTime !== null && vTime < startTime) {
      return 'PRE';
    }

    if (endTime !== null && vTime > endTime) {
      return 'POST';
    }

    return 'INTRA';
  }

  getPhaseLabel(phase: 'PRE' | 'INTRA' | 'POST'): string {
    switch (phase) {
      case 'PRE': return 'Trước lọc';
      case 'INTRA': return 'Trong lọc';
      case 'POST': return 'Sau lọc';
      default: return 'Trong lọc';
    }
  }

  getPhaseSeverity(phase: 'PRE' | 'INTRA' | 'POST'): 'info' | 'warning' | 'success' {
    switch (phase) {
      case 'PRE': return 'info';
      case 'INTRA': return 'warning';
      case 'POST': return 'success';
      default: return 'info';
    }
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'SCHEDULED': return 'Chờ thực hiện';
      case 'IN_PROGRESS': return 'Đang thực hiện';
      case 'COMPLETED': return 'Hoàn thành';
      case 'CANCELLED': return 'Đã hủy';
      default: return status || 'Không rõ';
    }
  }

  getStatusSeverity(status?: string): 'info' | 'warning' | 'success' | 'danger' {
    switch (status) {
      case 'SCHEDULED': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'danger';
      default: return 'info';
    }
  }

  // Dialog 1: Bắt đầu ca lọc
  openStartSessionDialog(): void {
    if (!this.session) return;
    this.startForm.patchValue({
      pre_weight: this.session.pre_weight || null,
      uf_target: this.session.uf_target !== null && this.session.uf_target !== undefined ? this.session.uf_target : null,
    });
    this.startSessionDialog = true;
  }

  submitStartSession(): void {
    if (this.startForm.invalid || !this.session) return;
    this.actionSaving = true;

    const payload: Partial<DialysisSession> = {
      status: 'IN_PROGRESS',
      pre_weight: this.startForm.value.pre_weight,
      uf_target: this.startForm.value.uf_target,
      actual_start: new Date().toISOString(),
    };

    this.sessionService.patch(this.session.session_id, payload).subscribe({
      next: (updated: DialysisSession) => {
        this.session = updated;
        this.actionSaving = false;
        this.startSessionDialog = false;
        this.calculatePermissions();
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Phiên lọc máu đã bắt đầu vận hành.',
        });
      },
      error: (err) => {
        this.actionSaving = false;
        const msg = err.error?.status?.[0] || err.error?.detail || 'Không thể bắt đầu ca lọc.';
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: msg });
      },
    });
  }

  // Dialog 2: Kết thúc ca lọc
  openEndSessionDialog(): void {
    if (!this.session) return;
    this.endForm.patchValue({
      post_weight: this.session.post_weight || null,
      uf_actual: this.session.uf_actual !== null && this.session.uf_actual !== undefined ? this.session.uf_actual : (this.session.uf_target || null),
      clinical_notes: this.session.clinical_notes || '',
    });
    this.endSessionDialog = true;
  }

  submitEndSession(): void {
    if (this.endForm.invalid || !this.session) return;
    this.actionSaving = true;

    const payload: Partial<DialysisSession> = {
      status: 'COMPLETED',
      post_weight: this.endForm.value.post_weight,
      uf_actual: this.endForm.value.uf_actual,
      clinical_notes: this.endForm.value.clinical_notes,
      actual_end: new Date().toISOString(),
    };

    this.sessionService.patch(this.session.session_id, payload).subscribe({
      next: (updated: DialysisSession) => {
        this.session = updated;
        this.actionSaving = false;
        this.endSessionDialog = false;
        this.calculatePermissions();
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Phiên lọc máu đã hoàn thành và lưu hồ sơ điều trị.',
        });
      },
      error: (err) => {
        this.actionSaving = false;
        const msg = err.error?.status?.[0] || err.error?.detail || 'Không thể kết thúc ca lọc.';
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: msg });
      },
    });
  }

  // Dialog 3: Cập nhật thông số điều trị
  openClinicalParamsDialog(): void {
    if (!this.session) return;
    this.clinicalParamsForm.patchValue({
      pre_weight: this.session.pre_weight,
      post_weight: this.session.post_weight,
      uf_target: this.session.uf_target,
      uf_actual: this.session.uf_actual,
      clinical_notes: this.session.clinical_notes,
    });
    this.clinicalParamsDialog = true;
  }

  submitClinicalParams(): void {
    if (this.clinicalParamsForm.invalid || !this.session) return;
    this.actionSaving = true;

    const val = this.clinicalParamsForm.value;
    const payload: Partial<DialysisSession> = {};
    if (val.pre_weight !== undefined) payload.pre_weight = val.pre_weight;
    if (val.post_weight !== undefined) payload.post_weight = val.post_weight;
    if (val.uf_target !== undefined) payload.uf_target = val.uf_target;
    if (val.uf_actual !== undefined) payload.uf_actual = val.uf_actual;
    if (val.clinical_notes !== undefined) payload.clinical_notes = val.clinical_notes;

    this.sessionService.patch(this.session.session_id, payload).subscribe({
      next: (updated: DialysisSession) => {
        this.session = updated;
        this.actionSaving = false;
        this.clinicalParamsDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Đã cập nhật thông số điều trị lâm sàng.',
        });
      },
      error: (err) => {
        this.actionSaving = false;
        const msg = err.error?.detail || 'Lỗi khi cập nhật thông số.';
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: msg });
      },
    });
  }

  // Hủy ca lọc
  confirmCancelSession(): void {
    if (!this.session) return;
    this.confirmationService.confirm({
      header: 'Hủy phiên lọc máu',
      message: `Bạn có chắc chắn muốn hủy phiên lọc ${this.session.session_id}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xác nhận hủy',
      rejectLabel: 'Đóng',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.sessionService.patch(this.session!.session_id, { status: 'CANCELLED' }).subscribe({
          next: (updated) => {
            this.session = updated;
            this.calculatePermissions();
            this.messageService.add({
              severity: 'warn',
              summary: 'Đã hủy',
              detail: 'Phiên lọc máu đã chuyển sang trạng thái Hủy.',
            });
          },
          error: (err) => {
            const msg = err.error?.status?.[0] || err.error?.detail || 'Không thể hủy ca lọc.';
            this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: msg });
          },
        });
      },
    });
  }

  // Dialog 4: Thêm / Sửa Sinh hiệu
  openAddVitalSign(): void {
    this.editingVitalSign = null;
    this.vitalSignForm.reset({
      recorded_at: new Date(),
      systolic_bp: null,
      diastolic_bp: null,
      heart_rate: null,
      spo2: null,
      temperature: null,
      notes: '',
    });
    this.vitalSignDialog = true;
  }

  openEditVitalSign(vital: VitalSign): void {
    this.editingVitalSign = vital;
    this.vitalSignForm.patchValue({
      recorded_at: new Date(vital.recorded_at),
      systolic_bp: vital.systolic_bp,
      diastolic_bp: vital.diastolic_bp,
      heart_rate: vital.heart_rate,
      spo2: vital.spo2,
      temperature: vital.temperature,
      notes: vital.notes || '',
    });
    this.vitalSignDialog = true;
  }

  saveVitalSign(): void {
    if (this.vitalSignForm.invalid || !this.session) return;
    this.vitalSignSaving = true;

    const formVal = this.vitalSignForm.value;
    const recordedAt = formVal.recorded_at instanceof Date
      ? formVal.recorded_at.toISOString()
      : new Date(formVal.recorded_at).toISOString();

    const dataPayload = {
      recorded_at: recordedAt,
      systolic_bp: formVal.systolic_bp,
      diastolic_bp: formVal.diastolic_bp,
      heart_rate: formVal.heart_rate,
      spo2: formVal.spo2,
      temperature: formVal.temperature,
      notes: formVal.notes || '',
    };

    if (this.editingVitalSign && this.editingVitalSign.id) {
      this.vitalSignService.patch(this.editingVitalSign.id, dataPayload).subscribe({
        next: () => {
          this.vitalSignSaving = false;
          this.vitalSignDialog = false;
          this.loadVitalSigns(this.session!.session_id);
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật sinh hiệu.' });
        },
        error: (err) => {
          this.vitalSignSaving = false;
          const msg = err.error?.detail || 'Lỗi khi cập nhật sinh hiệu.';
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: msg });
        },
      });
    } else {
      this.vitalSignService.createForSession(this.session.session_id, dataPayload).subscribe({
        next: () => {
          this.vitalSignSaving = false;
          this.vitalSignDialog = false;
          this.loadVitalSigns(this.session!.session_id);
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã ghi nhận sinh hiệu mới.' });
        },
        error: (err) => {
          this.vitalSignSaving = false;
          const msg = err.error?.detail || 'Lỗi khi tạo bản ghi sinh hiệu.';
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: msg });
        },
      });
    }
  }

  confirmDeleteVitalSign(vital: VitalSign): void {
    if (!vital.id || !this.session) return;
    this.confirmationService.confirm({
      header: 'Xác nhận xóa sinh hiệu',
      message: 'Bạn có chắc chắn muốn xóa bản ghi sinh hiệu này?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.vitalSignService.delete(vital.id!).subscribe({
          next: () => {
            this.loadVitalSigns(this.session!.session_id);
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa bản ghi sinh hiệu.' });
          },
          error: (err) => {
            const msg = err.error?.detail || 'Lỗi khi xóa bản ghi sinh hiệu.';
            this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: msg });
          },
        });
      },
    });
  }
}
