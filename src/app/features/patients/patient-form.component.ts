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
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { Patient, Department } from '../../core/models';

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
  departments: Department[] = [];

  genderOptions = [
    { label: 'Nam (Male)', value: 'MALE' },
    { label: 'Nữ (Female)', value: 'FEMALE' },
    { label: 'Khác (Other)', value: 'OTHER' },
  ];

  statusOptions = [
    { label: 'Đang hoạt động (Active)', value: 'ACTIVE' },
    { label: 'Đang điều trị (In treatment)', value: 'IN_TREATMENT' },
    { label: 'Ổn định (Stable)', value: 'STABLE' },
    { label: 'Đã xuất viện (Discharged)', value: 'DISCHARGED' },
  ];

  shiftOptions = [
    { label: 'Chưa thiết lập ca', value: null },
    { label: 'Ca 1 (Sáng: 07:00 - 11:00)', value: 'SHIFT_1' },
    { label: 'Ca 2 (Trưa: 11:30 - 15:30)', value: 'SHIFT_2' },
    { label: 'Ca 3 (Chiều: 16:00 - 20:00)', value: 'SHIFT_3' },
  ];

  patternOptions = [
    { label: 'Chưa thiết lập chu kỳ', value: null },
    { label: 'Thứ 2 - Thứ 4 - Thứ 6 (Chu kỳ 1)', value: 'T2_T4_T6' },
    { label: 'Thứ 3 - Thứ 5 - Thứ 7 (Chu kỳ 2)', value: 'T3_T5_T7' },
  ];

  bloodTypeOptions = [
    { label: 'O+ (Phổ biến)', value: 'O+' },
    { label: 'A+', value: 'A+' },
    { label: 'B+', value: 'B+' },
    { label: 'AB+', value: 'AB+' },
    { label: 'O- (Hiếm)', value: 'O-' },
    { label: 'A- (Hiếm)', value: 'A-' },
    { label: 'B- (Hiếm)', value: 'B-' },
    { label: 'AB- (Hiếm)', value: 'AB-' },
  ];

  relationshipOptions = [
    { label: 'Vợ/Chồng', value: 'Vợ/Chồng' },
    { label: 'Con ruột', value: 'Con ruột' },
    { label: 'Cha/Mẹ', value: 'Cha/Mẹ' },
    { label: 'Anh/Chị/Em', value: 'Anh/Chị/Em' },
    { label: 'Người giám hộ hợp pháp', value: 'Người giám hộ' },
  ];

  vascularAccessOptions = [
    { label: 'AVF — Cầu nối Động-Tĩnh mạch tự thân', value: 'AVF' },
    { label: 'AVG — Cầu nối mạch máu nhân tạo', value: 'AVG' },
    { label: 'CATHETER_TUNNELED — Catheter TM cảnh có đường hầm', value: 'CATHETER_TUNNELED' },
    { label: 'CATHETER_TEMP — Catheter tạm thời (Đùi / Cảnh)', value: 'CATHETER_TEMP' },
  ];

  quickLocations = [
    { label: 'Quận 1 - Bến Nghé (Gần BV Chợ Rẫy)', lat: 10.7769, lng: 106.7009 },
    { label: 'Quận 3 - Võ Thị Sáu', lat: 10.7842, lng: 106.6843 },
    { label: 'Quận 5 - Chợ Lớn (BV Chợ Rẫy)', lat: 10.7554, lng: 106.6621 },
    { label: 'Quận 10 - Sư Vạn Hạnh', lat: 10.7725, lng: 106.6678 },
    { label: 'Quận 8 - Tạ Quang Bửu', lat: 10.7412, lng: 106.6785 },
    { label: 'Quận 6 - Hậu Giang', lat: 10.7495, lng: 106.6412 },
    { label: 'Tân Bình - Hoàng Văn Thụ', lat: 10.7992, lng: 106.6534 },
    { label: 'Bình Thạnh - Bạch Đằng', lat: 10.8016, lng: 106.7107 },
    { label: 'TP. Thủ Đức - Linh Trung', lat: 10.8655, lng: 106.7745 },
  ];

  private currentPatientId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private departmentService: DepartmentService,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.isNurse = this.authService.hasRole('NURSE');
    this.form = this.fb.group({
      // Phân vùng 1: Hành chính & BHYT
      patient_id: ['', Validators.required],
      full_name: ['', Validators.required],
      date_of_birth: [null, Validators.required],
      gender: ['MALE'],
      citizen_id: [''],
      health_insurance_number: [''],
      phone_number: [''],
      permanent_address: [''],

      // Phân vùng 2: Người thân liên hệ khẩn cấp
      emergency_contact_name: [''],
      emergency_contact_relationship: ['Vợ/Chồng'],
      emergency_contact_phone: [''],

      // Phân vùng 3: Lâm sàng & Phác đồ
      department: [null],
      status: ['ACTIVE', Validators.required],
      blood_type: ['O+'],
      dry_weight: [null, [Validators.min(20), Validators.max(200)]],
      vascular_access_type: ['AVF'],
      treatment_pattern: [null],
      preferred_shift: [null],
      medical_history: [''],

      // Phân vùng 4: Tọa độ PostGIS
      latitude: [null, [Validators.min(10.3), Validators.max(11.2)]],
      longitude: [null, [Validators.min(106.3), Validators.max(107.1)]],
    });
  }

  ngOnInit() {
    this.loadDepartments();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.editMode = true;
      this.currentPatientId = idParam;
      this.loadPatient(idParam);
    }
  }

  loadDepartments() {
    this.departmentService.getAll({ is_active: true }).subscribe({
      next: (data: any) => {
        this.departments = data?.results ?? data ?? [];
      },
      error: () => {},
    });
  }

  loadPatient(patientId: string) {
    this.loading = true;
    this.patientService.getById(patientId).subscribe({
      next: (patient: Patient) => {
        this.form.patchValue({
          patient_id: patient.patient_id,
          full_name: patient.full_name,
          date_of_birth: patient.date_of_birth ? new Date(patient.date_of_birth) : null,
          gender: patient.gender || 'MALE',
          citizen_id: patient.citizen_id || '',
          health_insurance_number: patient.health_insurance_number || '',
          phone_number: patient.phone_number || '',
          permanent_address: patient.permanent_address || '',

          emergency_contact_name: patient.emergency_contact_name || '',
          emergency_contact_relationship: patient.emergency_contact_relationship || 'Vợ/Chồng',
          emergency_contact_phone: patient.emergency_contact_phone || '',

          department: patient.department || null,
          status: patient.status || 'ACTIVE',
          blood_type: patient.blood_type || 'O+',
          dry_weight: patient.dry_weight || null,
          vascular_access_type: patient.vascular_access_type || 'AVF',
          treatment_pattern: patient.treatment_pattern || null,
          preferred_shift: patient.preferred_shift || null,
          medical_history: patient.medical_history || '',

          latitude: patient.latitude ?? null,
          longitude: patient.longitude ?? null,
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
    const dobStr = dob ? (dob instanceof Date ? this.formatDate(dob) : dob) : '';

    const payload: Patient = {
      patient_id: (raw.patient_id || '').trim().toUpperCase(),
      full_name: (raw.full_name || '').trim(),
      date_of_birth: dobStr,
      gender: raw.gender || 'MALE',
      citizen_id: raw.citizen_id || null,
      health_insurance_number: raw.health_insurance_number || null,
      phone_number: raw.phone_number || null,
      permanent_address: raw.permanent_address || null,

      emergency_contact_name: raw.emergency_contact_name || null,
      emergency_contact_relationship: raw.emergency_contact_relationship || null,
      emergency_contact_phone: raw.emergency_contact_phone || null,

      department: raw.department || null,
      status: raw.status,
      blood_type: raw.blood_type || null,
      dry_weight: raw.dry_weight !== null && raw.dry_weight !== undefined ? Number(raw.dry_weight) : null,
      vascular_access_type: raw.vascular_access_type || null,
      preferred_shift: raw.preferred_shift || null,
      treatment_pattern: raw.treatment_pattern || null,
      medical_history: raw.medical_history || '',

      latitude: raw.latitude !== null && raw.latitude !== undefined ? Number(raw.latitude) : null,
      longitude: raw.longitude !== null && raw.longitude !== undefined ? Number(raw.longitude) : null,
    };

    const request = this.editMode && this.currentPatientId
      ? this.patientService.update(this.currentPatientId, payload)
      : this.patientService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: this.editMode ? 'Cập nhật hồ sơ bệnh nhân thành công' : 'Thêm bệnh nhân mới thành công',
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
      detail: fieldErrors?.detail || 'Không thể lưu hồ sơ bệnh nhân. Vui lòng thử lại.',
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  onQuickPickLocation(loc: { label: string; lat: number; lng: number }): void {
    this.form.patchValue({
      latitude: loc.lat,
      longitude: loc.lng,
    });
    this.messageService.add({
      severity: 'info',
      summary: 'Đã chọn tọa độ',
      detail: `Đã điền tọa độ ${loc.label}`,
      life: 2000,
    });
  }

  cancel() {
    this.router.navigate(['/patients']);
  }
}
