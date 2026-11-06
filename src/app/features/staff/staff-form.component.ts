import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { StaffService } from '../../core/services/staff.service';
import { DepartmentService } from '../../core/services/department.service';
import { CustomUser, Department } from '../../core/models';

@Component({
  selector: 'app-staff-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    DropdownModule,
    PasswordModule,
  ],
  templateUrl: './staff-form.component.html',
  styleUrls: ['./staff-form.component.scss'],
})
export class StaffFormComponent implements OnInit {
  form: FormGroup;
  editMode = false;
  staffId: number | null = null;
  loading = false;
  saving = false;

  departments: Department[] = [];
  roleOptions = [
    { label: 'Quản trị viên (Admin)', value: 'ADMIN' },
    { label: 'Bác sĩ điều trị (Doctor)', value: 'DOCTOR' },
    { label: 'Điều dưỡng (Nurse)', value: 'NURSE' },
  ];

  genderOptions = [
    { label: 'Nam (Male)', value: 'MALE' },
    { label: 'Nữ (Female)', value: 'FEMALE' },
    { label: 'Khác (Other)', value: 'OTHER' },
  ];

  degreeOptions = [
    { label: 'BS.CKII - Bác sĩ Chuyên khoa II', value: 'BS.CKII' },
    { label: 'BS.CKI - Bác sĩ Chuyên khoa I', value: 'BS.CKI' },
    { label: 'ThS.BS - Thạc sĩ Bác sĩ', value: 'ThS.BS' },
    { label: 'Bác sĩ Đa khoa', value: 'Bác sĩ Đa khoa' },
    { label: 'Cử nhân Điều dưỡng', value: 'Cử nhân Điều dưỡng' },
    { label: 'Điều dưỡng Cao đẳng', value: 'Điều dưỡng Cao đẳng' },
    { label: 'Kỹ sư CNTT / Quản trị Y tế', value: 'Kỹ sư CNTT / Quản trị' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private staffService: StaffService,
    private departmentService: DepartmentService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      // Phân vùng 1: Tài khoản & Phân quyền
      employee_code: [''],
      username: ['', Validators.required],
      password: [''],
      role: ['', Validators.required],
      department: [null, Validators.required],
      is_active: [true],

      // Phân vùng 2: Cá nhân & Định danh CCCD
      first_name: [''],
      last_name: [''],
      gender: ['MALE'],
      date_of_birth: [''],
      citizen_id: [''],
      phone_number: [''],
      email: ['', [Validators.required, Validators.email]],
      address: [''],

      // Phân vùng 3: Chuyên môn y tế
      degree_title: [''],
      license_number: [''],
      specialization: [''],
    });
  }

  ngOnInit() {
    this.loadDepartments();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      const id = Number(idParam);
      if (Number.isNaN(id)) {
        this.router.navigate(['/staff']);
        return;
      }
      this.editMode = true;
      this.staffId = id;
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
      this.loadStaff();
    } else {
      this.form.get('password')?.setValidators(Validators.required);
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  loadDepartments() {
    this.departmentService.getAll({ is_active: true }).subscribe({
      next: (data: any) => {
        this.departments = data?.results ?? data ?? [];
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách khoa/phòng ban.' });
      },
    });
  }

  loadStaff() {
    this.loading = true;
    this.staffService.getById(this.staffId!).subscribe({
      next: (staff: CustomUser) => {
        this.form.patchValue({
          employee_code: staff.employee_code || '',
          username: staff.username,
          email: staff.email,
          first_name: staff.first_name || '',
          last_name: staff.last_name || '',
          gender: staff.gender || 'MALE',
          date_of_birth: staff.date_of_birth || '',
          citizen_id: staff.citizen_id || '',
          phone_number: staff.phone_number || '',
          address: staff.address || '',
          role: staff.role,
          department: staff.department,
          is_active: staff.is_active,
          degree_title: staff.degree_title || '',
          license_number: staff.license_number || '',
          specialization: staff.specialization || '',
          password: '',
        });
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy nhân sự hoặc không thể tải dữ liệu.' });
        this.router.navigate(['/staff']);
      },
    });
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.hasError(error) && (ctrl.touched || ctrl.dirty));
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const val = { ...this.form.value };
    if (this.editMode && !val.password) {
      delete val.password;
    }

    const obs = this.editMode
      ? this.staffService.update(this.staffId!, val)
      : this.staffService.create(val);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: this.editMode ? 'Cập nhật hồ sơ nhân sự thành công.' : 'Thêm nhân sự mới thành công.',
        });
        this.router.navigate(['/staff']);
      },
      error: (err) => {
        this.saving = false;
        if (err.status === 400 && err.error) {
          Object.keys(err.error).forEach((key) => {
            const ctrl = this.form.get(key);
            if (ctrl) {
              const msgs = Array.isArray(err.error[key]) ? err.error[key].join(' ') : err.error[key];
              ctrl.setErrors({ server: msgs });
            }
          });
          this.messageService.add({ severity: 'error', summary: 'Lỗi xác thực', detail: 'Vui lòng kiểm tra lại các trường báo lỗi.' });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể lưu thông tin nhân sự. Vui lòng thử lại.' });
        }
      },
    });
  }

  cancel() {
    this.router.navigate(['/staff']);
  }
}
