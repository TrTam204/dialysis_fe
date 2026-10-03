import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
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
      sample_id: ['', Validators.required],
      patient: ['', Validators.required],
      collection_date: [null, Validators.required],
      hemoglobin_level: [null, Validators.required],
      potassium_level: [null, Validators.required],
      notes: [''],
    });
  }

  ngOnInit() {
    this.loadPatients();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.editMode = true;
      this.currentSampleId = idParam;
      this.loadBloodSample(idParam);
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

  loadBloodSample(sampleId: string) {
    this.loading = true;
    this.bloodSampleService.getById(sampleId).subscribe({
      next: (sample: BloodSample) => {
        this.form.patchValue({
          sample_id: sample.sample_id,
          patient: sample.patient,
          collection_date: sample.collection_date ? new Date(sample.collection_date) : null,
          hemoglobin_level: sample.hemoglobin_level,
          potassium_level: sample.potassium_level,
          notes: sample.notes,
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

    const collDate: Date | null = raw.collection_date;
    const collDateStr = collDate ? this.formatDateTime(collDate) : '';

    const payload: BloodSample = {
      sample_id: (raw.sample_id || '').trim().toUpperCase(),
      patient: raw.patient,
      collection_date: collDateStr,
      hemoglobin_level: raw.hemoglobin_level,
      potassium_level: raw.potassium_level,
      notes: raw.notes || undefined,
      created_by: 0,
    };

    const request = this.editMode && this.currentSampleId
      ? this.bloodSampleService.update(this.currentSampleId, payload)
      : this.bloodSampleService.create(payload);

    request.subscribe({
      next: () => {
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

  private formatDateTime(date: Date): string {
    return date.toISOString();
  }

  cancel() {
    this.router.navigate(['/blood-samples']);
  }
}
