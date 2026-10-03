import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
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
    { label: 'Đã lên lịch', value: 'SCHEDULED' },
    { label: 'Đang thực hiện', value: 'IN_PROGRESS' },
    { label: 'Hoàn thành', value: 'COMPLETED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
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
      session_id: ['', Validators.required],
      patient: ['', Validators.required],
      machine: ['', Validators.required],
      assigned_nurse: [null, Validators.required],
      scheduled_start: [null, Validators.required],
      scheduled_end: [null, Validators.required],
      status: ['SCHEDULED', Validators.required],
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
    }
  }

  loadPatients() {
    this.patientService.getAll().subscribe({
      next: (data: any) => {
        this.patients = data?.results ?? data ?? [];
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách bệnh nhân.' });
      },
    });
  }

  loadMachines() {
    this.machineService.getAll().subscribe({
      next: (data: any) => {
        this.machines = data?.results ?? data ?? [];
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách máy lọc.' });
      },
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
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách điều dưỡng.' });
      },
    });
  }

  loadSession(sessionId: string) {
    this.loading = true;
    this.sessionService.getById(sessionId).subscribe({
      next: (session: DialysisSession) => {
        this.form.patchValue({
          session_id: session.session_id,
          patient: session.patient,
          machine: session.machine,
          assigned_nurse: session.assigned_nurse,
          scheduled_start: session.scheduled_start ? new Date(session.scheduled_start) : null,
          scheduled_end: session.scheduled_end ? new Date(session.scheduled_end) : null,
          status: session.status,
          notes: session.notes,
        });
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy phiên lọc hoặc không thể tải dữ liệu.' });
        this.router.navigate(['/sessions']);
      },
    });
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

    const payload: DialysisSession = {
      session_id: (raw.session_id || '').trim().toUpperCase(),
      patient: raw.patient,
      machine: raw.machine,
      assigned_nurse: raw.assigned_nurse,
      scheduled_start: raw.scheduled_start ? raw.scheduled_start.toISOString() : '',
      scheduled_end: raw.scheduled_end ? raw.scheduled_end.toISOString() : '',
      status: raw.status,
      notes: raw.notes || undefined,
    };

    const request = this.editMode && this.currentSessionId
      ? this.sessionService.update(this.currentSessionId, payload)
      : this.sessionService.create(payload);

    request.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: this.editMode ? 'Cập nhật phiên lọc thành công' : 'Thêm phiên lọc thành công',
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
      detail: fieldErrors?.detail || 'Không thể lưu phiên lọc. Vui lòng thử lại.',
    });
  }

  cancel() {
    this.router.navigate(['/sessions']);
  }
}
