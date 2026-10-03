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
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Doctor', value: 'DOCTOR' },
    { label: 'Nurse', value: 'NURSE' },
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
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      first_name: [''],
      last_name: [''],
      phone_number: [''],
      role: ['', Validators.required],
      department: [null, Validators.required],
      password: [''],
      is_active: [true],
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
          username: staff.username,
          email: staff.email,
          first_name: staff.first_name,
          last_name: staff.last_name,
          phone_number: staff.phone_number,
          role: staff.role,
          department: staff.department,
          is_active: staff.is_active,
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
    const payload: any = {
      username: (raw.username || '').trim(),
      email: (raw.email || '').trim(),
      first_name: (raw.first_name || '').trim(),
      last_name: (raw.last_name || '').trim(),
      phone_number: raw.phone_number || null,
      role: raw.role,
      department: raw.department,
      is_active: raw.is_active,
    };

    if (raw.password) {
      payload.password = raw.password;
    }

    const request = this.editMode
      ? this.staffService.update(this.staffId!, payload)
      : this.staffService.create(payload);

    request.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: this.editMode ? 'Cập nhật nhân sự thành công' : 'Thêm nhân sự thành công',
        });
        this.router.navigate(['/staff']);
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
      detail: fieldErrors?.detail || 'Không thể lưu nhân sự. Vui lòng thử lại.',
    });
  }

  cancel() {
    this.router.navigate(['/staff']);
  }
}
