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
  template: `
    <div class="page-shell">
      <p-card [header]="editMode ? 'Sửa Nhân sự' : 'Thêm Nhân sự'">
        <div *ngIf="loading" class="loading-box">
          <i class="pi pi-spin pi-spinner"></i> Đang tải dữ liệu...
        </div>

        <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="save()">
          <div class="field">
            <label for="username">Tên đăng nhập <span class="required">*</span></label>
            <input id="username" pInputText formControlName="username" class="w-full" />
            <small class="p-error" *ngIf="hasError('username', 'required')">Tên đăng nhập không được rỗng</small>
            <small class="p-error" *ngIf="hasError('username', 'server')">{{ form.get('username')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <label for="email">Email <span class="required">*</span></label>
            <input id="email" pInputText type="email" formControlName="email" class="w-full" />
            <small class="p-error" *ngIf="hasError('email', 'required')">Email không được rỗng</small>
            <small class="p-error" *ngIf="hasError('email', 'email')">Email không hợp lệ</small>
            <small class="p-error" *ngIf="hasError('email', 'server')">{{ form.get('email')?.errors?.['server'] }}</small>
          </div>

          <div class="form-row">
            <div class="field">
              <label for="first_name">Tên</label>
              <input id="first_name" pInputText formControlName="first_name" class="w-full" />
              <small class="p-error" *ngIf="hasError('first_name', 'server')">{{ form.get('first_name')?.errors?.['server'] }}</small>
            </div>

            <div class="field">
              <label for="last_name">Họ</label>
              <input id="last_name" pInputText formControlName="last_name" class="w-full" />
              <small class="p-error" *ngIf="hasError('last_name', 'server')">{{ form.get('last_name')?.errors?.['server'] }}</small>
            </div>
          </div>

          <div class="field">
            <label for="phone_number">Số điện thoại</label>
            <input id="phone_number" pInputText formControlName="phone_number" class="w-full" />
            <small class="p-error" *ngIf="hasError('phone_number', 'server')">{{ form.get('phone_number')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <label for="role">Vai trò <span class="required">*</span></label>
            <p-dropdown
              id="role"
              [options]="roleOptions"
              formControlName="role"
              [showClear]="false"
              class="w-full"
            ></p-dropdown>
            <small class="p-error" *ngIf="hasError('role', 'required')">Vai trò không được rỗng</small>
            <small class="p-error" *ngIf="hasError('role', 'server')">{{ form.get('role')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <label for="department">Khoa/Phòng ban <span class="required">*</span></label>
            <p-dropdown
              id="department"
              [options]="departments"
              optionLabel="name"
              optionValue="id"
              formControlName="department"
              [showClear]="false"
              class="w-full"
            ></p-dropdown>
            <small class="p-error" *ngIf="hasError('department', 'required')">Khoa/Phòng ban không được rỗng</small>
            <small class="p-error" *ngIf="hasError('department', 'server')">{{ form.get('department')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <label for="password">
              Mật khẩu <span class="required" *ngIf="!editMode">*</span>
              <span class="hint" *ngIf="editMode">(để trống nếu không đổi)</span>
            </label>
            <p-password
              id="password"
              formControlName="password"
              [feedback]="false"
              [toggleMask]="true"
              class="w-full"
            />
            <small class="p-error" *ngIf="hasError('password', 'required')">Mật khẩu không được rỗng</small>
            <small class="p-error" *ngIf="hasError('password', 'server')">{{ form.get('password')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <p-checkbox formControlName="is_active" label="Hoạt động" [binary]="true"></p-checkbox>
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
    '.page-shell { padding: 24px; max-width: 640px; }',
    '.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }',
    '.field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }',
    'label { font-weight: 600; }',
    '.required { color: red; }',
    '.hint { color: #64748b; font-size: 0.8rem; font-weight: normal; }',
    '.p-error { color: #f87171; font-size: 0.875rem; }',
    '.form-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }',
    '.loading-box { padding: 32px 0; color: #64748b; }',
    '.loading-box i { margin-right: 8px; }',
    '::ng-deep .p-password { width: 100%; }',
    '::ng-deep .p-password-input { width: 100%; }',
  ],
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
