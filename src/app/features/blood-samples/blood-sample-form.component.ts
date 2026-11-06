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
import { BloodSampleService } from '../../core/services/blood-sample.service';
import { PatientService } from '../../core/services/patient.service';
import { BloodSample, Patient } from '../../core/models';

@Component({
  selector: 'app-blood-sample-form',
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
  templateUrl: './blood-sample-form.component.html',
  styleUrls: ['./blood-sample-form.component.scss'],
})
export class BloodSampleFormComponent implements OnInit {
  form: FormGroup;
  editMode = false;
  loading = false;
  saving = false;
  today = new Date();

  patients: Patient[] = [];
  private currentSampleId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private bloodSampleService: BloodSampleService,
    private patientService: PatientService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      // Phân vùng 1: Định danh mẫu & Bệnh nhân
      sample_id: ['', Validators.required],
      patient: ['', Validators.required],
      collection_date: [null, Validators.required],

      // Phân vùng 2: Huyết học & Điện giải đồ
      hemoglobin_level: [null, [Validators.required, Validators.min(1), Validators.max(25)]],
      potassium_level: [null, [Validators.required, Validators.min(1), Validators.max(12)]],
      sodium_level: [null, [Validators.min(100), Validators.max(180)]],
      calcium_level: [null, [Validators.min(0.5), Validators.max(5.0)]],
      phosphorus_level: [null, [Validators.min(0.2), Validators.max(6.0)]],

      // Phân vùng 3: Độc chất thận & Hiệu quả lọc máu
      urea_level: [null, [Validators.min(1), Validators.max(80)]],
      creatinine_level: [null, [Validators.min(50), Validators.max(2500)]],
      albumin_level: [null, [Validators.min(1), Validators.max(7)]],
      kt_v: [null, [Validators.min(0.1), Validators.max(3.5)]],
      notes: [''],
    });
  }

  ngOnInit() {
    this.loadPatients();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.editMode = true;
      this.currentSampleId = idParam;
      this.loadSample(idParam);
    } else {
      // Default collection date to now
      this.form.patchValue({ collection_date: new Date() });
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

  loadSample(sampleId: string) {
    this.loading = true;
    this.bloodSampleService.getById(sampleId).subscribe({
      next: (sample: BloodSample) => {
        this.form.patchValue({
          sample_id: sample.sample_id,
          patient: sample.patient,
          collection_date: sample.collection_date ? new Date(sample.collection_date) : null,
          hemoglobin_level: sample.hemoglobin_level,
          potassium_level: sample.potassium_level,
          sodium_level: sample.sodium_level ?? null,
          calcium_level: sample.calcium_level ?? null,
          phosphorus_level: sample.phosphorus_level ?? null,
          urea_level: sample.urea_level ?? null,
          creatinine_level: sample.creatinine_level ?? null,
          albumin_level: sample.albumin_level ?? null,
          kt_v: sample.kt_v ?? null,
          notes: sample.notes || '',
        });
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy mẫu xét nghiệm hoặc không thể tải dữ liệu.' });
        this.router.navigate(['/blood-samples']);
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

    const colDate: Date | null = raw.collection_date;
    const colDateStr = colDate ? (colDate instanceof Date ? colDate.toISOString() : colDate) : new Date().toISOString();

    const payload: Partial<BloodSample> = {
      sample_id: (raw.sample_id || '').trim().toUpperCase(),
      patient: raw.patient,
      collection_date: colDateStr,
      hemoglobin_level: Number(raw.hemoglobin_level),
      potassium_level: Number(raw.potassium_level),
      sodium_level: raw.sodium_level !== null && raw.sodium_level !== undefined ? Number(raw.sodium_level) : null,
      calcium_level: raw.calcium_level !== null && raw.calcium_level !== undefined ? Number(raw.calcium_level) : null,
      phosphorus_level: raw.phosphorus_level !== null && raw.phosphorus_level !== undefined ? Number(raw.phosphorus_level) : null,
      urea_level: raw.urea_level !== null && raw.urea_level !== undefined ? Number(raw.urea_level) : null,
      creatinine_level: raw.creatinine_level !== null && raw.creatinine_level !== undefined ? Number(raw.creatinine_level) : null,
      albumin_level: raw.albumin_level !== null && raw.albumin_level !== undefined ? Number(raw.albumin_level) : null,
      kt_v: raw.kt_v !== null && raw.kt_v !== undefined ? Number(raw.kt_v) : null,
      notes: raw.notes || '',
    };

    const request = this.editMode && this.currentSampleId
      ? this.bloodSampleService.update(this.currentSampleId, payload as BloodSample)
      : this.bloodSampleService.create(payload as BloodSample);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: this.editMode ? 'Cập nhật mẫu xét nghiệm thành công' : 'Thêm mẫu xét nghiệm thành công',
        });
        this.router.navigate(['/blood-samples']);
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
      detail: fieldErrors?.detail || 'Không thể lưu mẫu xét nghiệm. Vui lòng thử lại.',
    });
  }

  cancel() {
    this.router.navigate(['/blood-samples']);
  }
}
