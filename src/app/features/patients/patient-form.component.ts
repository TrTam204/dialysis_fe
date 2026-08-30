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
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { MessageService } from 'primeng/api';
import { PatientService } from '../../core/services/patient.service';
import { AuthService } from '../../core/services/auth.service';
import { Patient } from '../../core/models';

@Component({
  selector: 'app-patient-form',
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
    CheckboxModule,
    DropdownModule,
  ],
  template: `
    <div class="page-shell">
      <p-card [header]="editMode ? 'Sửa Bệnh nhân' : 'Thêm Bệnh nhân'">
        <div *ngIf="loading" class="loading-box">
          <i class="pi pi-spin pi-spinner"></i> Đang tải dữ liệu...
        </div>

        <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="save()">
          <div class="field">
            <label for="patient_id">Mã bệnh nhân <span class="required">*</span></label>
            <input id="patient_id" pInputText formControlName="patient_id" class="w-full" [readonly]="editMode" />
            <small class="p-error" *ngIf="hasError('patient_id', 'required')">Mã bệnh nhân không được rỗng</small>
            <small class="p-error" *ngIf="hasError('patient_id', 'server')">{{ form.get('patient_id')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <label for="full_name">Họ và tên <span class="required">*</span></label>
            <input id="full_name" pInputText formControlName="full_name" class="w-full" />
            <small class="p-error" *ngIf="hasError('full_name', 'required')">Họ và tên không được rỗng</small>
            <small class="p-error" *ngIf="hasError('full_name', 'server')">{{ form.get('full_name')?.errors?.['server'] }}</small>
          </div>

          <div class="form-row">
            <div class="field">
              <label for="date_of_birth">Ngày sinh <span class="required">*</span></label>
              <p-calendar
                id="date_of_birth"
                formControlName="date_of_birth"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                appendTo="body"
              ></p-calendar>
              <small class="p-error" *ngIf="hasError('date_of_birth', 'required')">Ngày sinh không được rỗng</small>
              <small class="p-error" *ngIf="hasError('date_of_birth', 'server')">{{ form.get('date_of_birth')?.errors?.['server'] }}</small>
            </div>

            <div class="field">
              <label for="gender">Giới tính</label>
              <p-dropdown
                id="gender"
                [options]="genderOptions"
                formControlName="gender"
                [showClear]="true"
                class="w-full"
              ></p-dropdown>
              <small class="p-error" *ngIf="hasError('gender', 'server')">{{ form.get('gender')?.errors?.['server'] }}</small>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label for="phone_number">Số điện thoại</label>
              <input id="phone_number" pInputText formControlName="phone_number" class="w-full" />
              <small class="p-error" *ngIf="hasError('phone_number', 'server')">{{ form.get('phone_number')?.errors?.['server'] }}</small>
            </div>

            <div class="field">
              <label for="dry_weight">Cân nặng khô (kg)</label>
              <p-inputNumber id="dry_weight" formControlName="dry_weight" [min]="0" [maxFractionDigits]="2" class="w-full"></p-inputNumber>
              <small class="p-error" *ngIf="hasError('dry_weight', 'server')">{{ form.get('dry_weight')?.errors?.['server'] }}</small>
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

          <div class="field" *ngIf="!isNurse || !editMode">
            <label for="medical_history">Tiền sử bệnh lý</label>
            <textarea id="medical_history" pInputTextarea formControlName="medical_history" class="w-full" rows="3"></textarea>
            <small class="p-error" *ngIf="hasError('medical_history', 'server')">{{ form.get('medical_history')?.errors?.['server'] }}</small>
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
    '::ng-deep .p-inputnumber { width: 100%; }',
  ],
})
export class PatientFormComponent implements OnInit {
  form: FormGroup;
  editMode = false;
  loading = false;
  saving = false;
  isNurse = false;

  genderOptions = [
    { label: 'Nam', value: 'MALE' },
    { label: 'Nữ', value: 'FEMALE' },
    { label: 'Khác', value: 'OTHER' },
  ];

  statusOptions = [
    { label: 'Đang hoạt động', value: 'ACTIVE' },
    { label: 'Đang điều trị', value: 'IN_TREATMENT' },
    { label: 'Ổn định', value: 'STABLE' },
    { label: 'Đã xuất viện', value: 'DISCHARGED' },
  ];

  private currentPatientId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.isNurse = this.authService.hasRole('NURSE');
    this.form = this.fb.group({
      patient_id: ['', Validators.required],
      full_name: ['', Validators.required],
      date_of_birth: [null, Validators.required],
      gender: ['OTHER'],
      phone_number: [''],
      dry_weight: [null],
      status: ['', Validators.required],
      medical_history: [''],
    });
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.editMode = true;
      this.currentPatientId = idParam;
      this.loadPatient(idParam);
    }
  }

  loadPatient(patientId: string) {
    this.loading = true;
    this.patientService.getById(patientId).subscribe({
      next: (patient: Patient) => {
        this.form.patchValue({
          patient_id: patient.patient_id,
          full_name: patient.full_name,
          date_of_birth: patient.date_of_birth ? new Date(patient.date_of_birth) : null,
          gender: patient.gender,
          phone_number: patient.phone_number,
          dry_weight: patient.dry_weight,
          status: patient.status,
          medical_history: patient.medical_history,
        });
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy bệnh nhân hoặc không thể tải dữ liệu.' });
        this.router.navigate(['/patients']);
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

    const dob: Date | null = raw.date_of_birth;
    const dobStr = dob ? this.formatDate(dob) : '';

    const payload: Patient = {
      patient_id: (raw.patient_id || '').trim().toUpperCase(),
      full_name: (raw.full_name || '').trim(),
      date_of_birth: dobStr,
      gender: raw.gender || 'OTHER',
      phone_number: raw.phone_number || null,
      dry_weight: raw.dry_weight || null,
      status: raw.status,
      medical_history: raw.medical_history || undefined,
    };

    const request = this.editMode && this.currentPatientId
      ? this.patientService.update(this.currentPatientId, payload)
      : this.patientService.create(payload);

    request.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: this.editMode ? 'Cập nhật bệnh nhân thành công' : 'Thêm bệnh nhân thành công',
        });
        this.router.navigate(['/patients']);
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
      detail: fieldErrors?.detail || 'Không thể lưu bệnh nhân. Vui lòng thử lại.',
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  cancel() {
    this.router.navigate(['/patients']);
  }
}
