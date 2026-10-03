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
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.scss'],
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
