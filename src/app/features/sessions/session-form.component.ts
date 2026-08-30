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
  template: `
    <div class="page-shell">
      <p-card [header]="editMode ? 'Sửa Phiên lọc' : 'Thêm Phiên lọc'">
        <div *ngIf="loading" class="loading-box">
          <i class="pi pi-spin pi-spinner"></i> Đang tải dữ liệu...
        </div>

        <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="save()">
          <div class="field">
            <label for="session_id">Mã phiên lọc <span class="required">*</span></label>
            <input id="session_id" pInputText formControlName="session_id" class="w-full" [readonly]="editMode" />
            <small class="p-error" *ngIf="hasError('session_id', 'required')">Mã phiên không được rỗng</small>
            <small class="p-error" *ngIf="hasError('session_id', 'server')">{{ form.get('session_id')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <label for="patient">Bệnh nhân <span class="required">*</span></label>
            <p-dropdown
              id="patient"
              [options]="patients"
              optionLabel="full_name"
              optionValue="patient_id"
              formControlName="patient"
              [showClear]="false"
              class="w-full"
              placeholder="Chọn bệnh nhân"
            ></p-dropdown>
            <small class="p-error" *ngIf="hasError('patient', 'required')">Bệnh nhân không được rỗng</small>
            <small class="p-error" *ngIf="hasError('patient', 'server')">{{ form.get('patient')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <label for="machine">Máy lọc <span class="required">*</span></label>
            <p-dropdown
              id="machine"
              [options]="machines"
              optionLabel="name"
              optionValue="machine_id"
              formControlName="machine"
              [showClear]="false"
              class="w-full"
              placeholder="Chọn máy lọc"
            ></p-dropdown>
            <small class="p-error" *ngIf="hasError('machine', 'required')">Máy lọc không được rỗng</small>
            <small class="p-error" *ngIf="hasError('machine', 'server')">{{ form.get('machine')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <label for="assigned_nurse">Điều dưỡng phụ trách <span class="required">*</span></label>
            <p-dropdown
              id="assigned_nurse"
              [options]="nurses"
              optionLabel="full_name"
              optionValue="id"
              formControlName="assigned_nurse"
              [showClear]="false"
              class="w-full"
              placeholder="Chọn điều dưỡng"
            ></p-dropdown>
            <small class="p-error" *ngIf="hasError('assigned_nurse', 'required')">Điều dưỡng không được rỗng</small>
            <small class="p-error" *ngIf="hasError('assigned_nurse', 'server')">{{ form.get('assigned_nurse')?.errors?.['server'] }}</small>
          </div>

          <div class="form-row">
            <div class="field">
              <label for="scheduled_start">Thời gian bắt đầu <span class="required">*</span></label>
              <p-calendar
                id="scheduled_start"
                formControlName="scheduled_start"
                [showTime]="true"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                appendTo="body"
              ></p-calendar>
              <small class="p-error" *ngIf="hasError('scheduled_start', 'required')">Thời gian bắt đầu không được rỗng</small>
              <small class="p-error" *ngIf="hasError('scheduled_start', 'server')">{{ form.get('scheduled_start')?.errors?.['server'] }}</small>
            </div>

            <div class="field">
              <label for="scheduled_end">Thời gian kết thúc <span class="required">*</span></label>
              <p-calendar
                id="scheduled_end"
                formControlName="scheduled_end"
                [showTime]="true"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                appendTo="body"
              ></p-calendar>
              <small class="p-error" *ngIf="hasError('scheduled_end', 'required')">Thời gian kết thúc không được rỗng</small>
              <small class="p-error" *ngIf="hasError('scheduled_end', 'server')">{{ form.get('scheduled_end')?.errors?.['server'] }}</small>
            </div>
          </div>

          <div class="field">
            <label for="status">Trạng thái <span class="required">*</span></label>
            <p-dropdown
              id="status"
              [options]="statusOptions"
              formControlName="status"
              [showClear]="false"
              class="w-full"
            ></p-dropdown>
            <small class="p-error" *ngIf="hasError('status', 'required')">Trạng thái không được rỗng</small>
            <small class="p-error" *ngIf="hasError('status', 'server')">{{ form.get('status')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <label for="notes">Ghi chú</label>
            <textarea id="notes" pInputTextarea formControlName="notes" class="w-full" rows="3"></textarea>
            <small class="p-error" *ngIf="hasError('notes', 'server')">{{ form.get('notes')?.errors?.['server'] }}</small>
          </div>

          <div class="form-footer">
            <button pButton type="button" label="Hủy" icon="pi pi-times" class="p-button-text" (click)="cancel()"></button>
            <button pButton type="submit" [label]="editMode ? 'Cập nhật' : 'Thêm mới'" icon="pi pi-check" [disabled]="form.invalid || saving" [loading]="saving"></button>
          </div>
        </form>
      </p-card>
    </div>
  `,
  styles: [
    '.page-shell { padding: 24px; max-width: 720px; }',
    '.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }',
    '.field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }',
    'label { font-weight: 600; }',
    '.required { color: red; }',
    '.p-error { color: #f87171; font-size: 0.875rem; }',
    '.form-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }',
    '.loading-box { padding: 32px 0; color: #64748b; }',
    '.loading-box i { margin-right: 8px; }',
    '::ng-deep .p-calendar { width: 100%; }',
    '::ng-deep .p-dropdown { width: 100%; }',
  ],
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
