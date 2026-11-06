import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { MessageService } from 'primeng/api';
import { SessionService } from '../../core/services/session.service';
import { PatientService } from '../../core/services/patient.service';
import { MachineService } from '../../core/services/machine.service';
import { StaffService } from '../../core/services/staff.service';
import { DialysisSession, Patient, DialysisMachine, CustomUser } from '../../core/models';

@Component({
  selector: 'app-session-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    CalendarModule,
    DropdownModule,
  ],
  templateUrl: './session-form.component.html',
  styleUrls: ['./session-form.component.scss'],
})
export class SessionFormComponent implements OnInit {
  form: FormGroup;
  editMode = false;
  loading = false;
  saving = false;

  patients: Patient[] = [];
  machines: DialysisMachine[] = [];
  nurses: CustomUser[] = [];

  statusOptions = [
    { label: 'Đã lên lịch (Scheduled)', value: 'SCHEDULED' },
    { label: 'Đang thực hiện (In Progress)', value: 'IN_PROGRESS' },
    { label: 'Hoàn thành (Completed)', value: 'COMPLETED' },
    { label: 'Đã hủy (Cancelled)', value: 'CANCELLED' },
  ];

  dialyzerOptions = [
    { label: 'High-Flux Fresenius FX60 (Polyflux 1.4 m²)', value: 'High-Flux Fresenius FX60' },
    { label: 'High-Flux Fresenius FX80 (Polyflux 1.8 m²)', value: 'High-Flux Fresenius FX80' },
    { label: 'Nipro Elisio 15H High-Flux', value: 'Nipro Elisio 15H High-Flux' },
    { label: 'B.Braun Diacap Pro 16H', value: 'B.Braun Diacap Pro 16H' },
    { label: 'Low-Flux Fresenius F6HPS (Chống mất thăng bằng)', value: 'Low-Flux Fresenius F6HPS' },
  ];

  anticoagulantOptions = [
    { label: 'Heparin tiêu chuẩn (5000 IU/phiên)', value: 'Heparin tiêu chuẩn (5000 IU/phiên)' },
    { label: 'Heparin trọng lượng phân tử thấp (Lovenox 40mg)', value: 'Heparin trọng lượng phân tử thấp (Lovenox 40mg/0.4ml)' },
    { label: 'Tráng rửa NaCl 0.9% (Không dùng Heparin)', value: 'Tráng rửa NaCl 0.9% định kỳ (Không dùng Heparin - Nguy cơ xuất huyết)' },
  ];

  private currentSessionId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private patientService: PatientService,
    private machineService: MachineService,
    private staffService: StaffService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      // Phân vùng 1: Nhân sự & Thiết bị
      session_id: ['', Validators.required],
      patient: ['', Validators.required],
      machine: ['', Validators.required],
      assigned_nurse: [null, Validators.required],
      status: ['SCHEDULED', Validators.required],

      // Phân vùng 2: Thời gian
      scheduled_start: [null, Validators.required],
      scheduled_end: [null, Validators.required],

      // Phân vùng 3: Chỉ định Kỹ thuật Lọc máu (Prescription)
      dialyzer_type: ['High-Flux Fresenius FX60'],
      blood_flow_rate: [250, [Validators.min(100), Validators.max(500)]],
      dialysate_flow_rate: [500, [Validators.min(300), Validators.max(800)]],
      dialysate_temperature: [36.5, [Validators.min(35.0), Validators.max(38.0)]],
      anticoagulant_type: ['Heparin tiêu chuẩn (5000 IU/phiên)'],
      uf_target: [null, [Validators.min(0), Validators.max(8)]],
      notes: [''],
    });
  }

  ngOnInit() {
    this.loadPatients();
    this.loadMachines();
    this.loadNurses();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.editMode = true;
      this.currentSessionId = idParam;
      this.loadSession(idParam);
    } else {
      // Default scheduled_start to now rounded, scheduled_end +4h
      const start = new Date();
      start.setMinutes(0, 0, 0);
      const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
      this.form.patchValue({
        scheduled_start: start,
        scheduled_end: end,
      });
    }
  }

  loadPatients() {
    this.patientService.getAll().subscribe({
      next: (data: any) => {
        this.patients = data?.results ?? data ?? [];
      },
      error: () => {},
    });
  }

  loadMachines() {
    this.machineService.getAll().subscribe({
      next: (data: any) => {
        this.machines = data?.results ?? data ?? [];
      },
      error: () => {},
    });
  }

  loadNurses() {
    this.staffService.getAll({ role: 'NURSE' }).subscribe({
      next: (data: any) => {
        const users = data?.results ?? data ?? [];
        this.nurses = users.map((u: CustomUser) => ({
          ...u,
          full_name: `${u.last_name || ''} ${u.first_name || ''}`.trim() || u.username,
        }));
      },
      error: () => {},
    });
  }

  loadSession(sessionId: string) {
    this.loading = true;
    this.sessionService.getById(sessionId).subscribe({
      next: (sess: DialysisSession) => {
        this.form.patchValue({
          session_id: sess.session_id,
          patient: sess.patient,
          machine: sess.machine,
          assigned_nurse: sess.assigned_nurse || null,
          status: sess.status,
          scheduled_start: sess.scheduled_start ? new Date(sess.scheduled_start) : null,
          scheduled_end: sess.scheduled_end ? new Date(sess.scheduled_end) : null,
          dialyzer_type: sess.dialyzer_type || 'High-Flux Fresenius FX60',
          blood_flow_rate: sess.blood_flow_rate ?? 250,
          dialysate_flow_rate: sess.dialysate_flow_rate ?? 500,
          dialysate_temperature: sess.dialysate_temperature ?? 36.5,
          anticoagulant_type: sess.anticoagulant_type || 'Heparin tiêu chuẩn (5000 IU/phiên)',
          uf_target: sess.uf_target ?? null,
          notes: sess.notes || '',
        });
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy phiên lọc máu hoặc không thể tải dữ liệu.' });
        this.router.navigate(['/sessions']);
      },
    });
  }

  autoAdd4Hours() {
    const startVal: Date | null = this.form.get('scheduled_start')?.value;
    if (startVal) {
      const startDate = startVal instanceof Date ? startVal : new Date(startVal);
      const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000);
      this.form.patchValue({ scheduled_end: endDate });
      this.messageService.add({
        severity: 'info',
        summary: 'Thời gian tiêu chuẩn',
        detail: 'Đã tự động cộng +4 giờ tiêu chuẩn cho ca lọc.',
        life: 2000,
      });
    }
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && !!control.errors && control.errors[errorName] !== undefined && (control.touched || control.dirty || errorName === 'server');
  }

  clearServerErrors() {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control?.errors?.['server']) {
        const errors = { ...control.errors };
        delete errors['server'];
        control.setErrors(Object.keys(errors).length ? errors : null);
      }
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.clearServerErrors();
    const raw = this.form.value;

    const start: Date = raw.scheduled_start instanceof Date ? raw.scheduled_start : new Date(raw.scheduled_start);
    const end: Date = raw.scheduled_end instanceof Date ? raw.scheduled_end : new Date(raw.scheduled_end);

    const payload: Partial<DialysisSession> = {
      session_id: (raw.session_id || '').trim().toUpperCase(),
      patient: raw.patient,
      machine: raw.machine,
      assigned_nurse: raw.assigned_nurse || null,
      status: raw.status,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      dialyzer_type: raw.dialyzer_type || null,
      blood_flow_rate: raw.blood_flow_rate !== null && raw.blood_flow_rate !== undefined ? Number(raw.blood_flow_rate) : null,
      dialysate_flow_rate: raw.dialysate_flow_rate !== null && raw.dialysate_flow_rate !== undefined ? Number(raw.dialysate_flow_rate) : 500,
      dialysate_temperature: raw.dialysate_temperature !== null && raw.dialysate_temperature !== undefined ? Number(raw.dialysate_temperature) : 36.5,
      anticoagulant_type: raw.anticoagulant_type || null,
      uf_target: raw.uf_target !== null && raw.uf_target !== undefined ? Number(raw.uf_target) : null,
      notes: raw.notes || '',
    };

    const request = this.editMode && this.currentSessionId
      ? this.sessionService.update(this.currentSessionId, payload as DialysisSession)
      : this.sessionService.create(payload as DialysisSession);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: this.editMode ? 'Cập nhật phiên lọc máu thành công' : 'Thêm phiên lọc máu mới thành công',
        });
        this.router.navigate(['/sessions']);
      },
      error: (err) => {
        this.saving = false;
        this.applyServerErrors(err);
      },
    });
  }

  applyServerErrors(err: any) {
    const fieldErrors = err?.error;
    if (fieldErrors && typeof fieldErrors === 'object' && !fieldErrors.detail) {
      let mapped = false;
      Object.keys(fieldErrors).forEach((key) => {
        const control = this.form.get(key);
        if (control) {
          const messages = Array.isArray(fieldErrors[key]) ? fieldErrors[key].join(', ') : String(fieldErrors[key]);
          control.setErrors({ ...(control.errors || {}), server: messages });
          mapped = true;
        }
      });
      if (mapped) {
        this.messageService.add({ severity: 'warn', summary: 'Dữ liệu chưa hợp lệ', detail: 'Vui lòng kiểm tra lại các trường được đánh dấu.' });
        return;
      }
    }
    this.messageService.add({
      severity: 'error',
      summary: 'Lỗi',
      detail: fieldErrors?.detail || 'Không thể lưu phiên lọc máu. Vui lòng thử lại.',
    });
  }

  cancel() {
    this.router.navigate(['/sessions']);
  }
}
