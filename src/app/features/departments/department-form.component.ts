import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { DepartmentService } from '../../core/services/department.service';
import { Department } from '../../core/models';

@Component({
  selector: 'app-department-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, ButtonModule, InputTextModule, InputTextareaModule, CheckboxModule],
  templateUrl: './department-form.component.html',
  styleUrls: ['./department-form.component.scss'],
})
export class DepartmentFormComponent implements OnInit {
  form: FormGroup;
  editMode = false;
  departmentId: number | null = null;
  loading = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private departmentService: DepartmentService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      code: ['', [Validators.required, Validators.maxLength(30)]],
      description: [''],
      is_active: [true],
    });
  }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      const id = Number(idParam);
      if (Number.isNaN(id)) {
        this.router.navigate(['/departments']);
        return;
      }
      this.editMode = true;
      this.departmentId = id;
      this.loadDepartment();
    }
  }

  loadDepartment() {
    this.loading = true;
    this.departmentService.getById(this.departmentId!).subscribe({
      next: (dept: Department) => {
        this.form.patchValue(dept);
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy khoa/phòng ban hoặc không thể tải dữ liệu.' });
        this.router.navigate(['/departments']);
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
    const payload: Department = {
      ...raw,
      name: (raw.name || '').trim(),
      code: (raw.code || '').trim().toUpperCase(),
    };

    const request = this.editMode
      ? this.departmentService.update(this.departmentId!, payload)
      : this.departmentService.create(payload);

    request.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: this.editMode ? 'Cập nhật khoa/phòng ban thành công' : 'Thêm khoa/phòng ban thành công',
        });
        this.router.navigate(['/departments']);
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
      detail: fieldErrors?.detail || 'Không thể lưu khoa/phòng ban. Vui lòng thử lại.',
    });
  }

  cancel() {
    this.router.navigate(['/departments']);
  }
}
