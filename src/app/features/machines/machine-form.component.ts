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
import { MachineService } from '../../core/services/machine.service';
import { DepartmentService } from '../../core/services/department.service';
import { DialysisMachine, Department } from '../../core/models';

@Component({
  selector: 'app-machine-form',
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
      <p-card [header]="editMode ? 'Sửa Máy lọc' : 'Thêm Máy lọc'">
        <div *ngIf="loading" class="loading-box">
          <i class="pi pi-spin pi-spinner"></i> Đang tải dữ liệu...
        </div>

        <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="save()">
          <div class="field">
            <label for="machine_id">Mã máy <span class="required">*</span></label>
            <input id="machine_id" pInputText formControlName="machine_id" class="w-full" [readonly]="editMode" />
            <small class="p-error" *ngIf="hasError('machine_id', 'required')">Mã máy không được rỗng</small>
            <small class="p-error" *ngIf="hasError('machine_id', 'server')">{{ form.get('machine_id')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <label for="name">Tên máy <span class="required">*</span></label>
            <input id="name" pInputText formControlName="name" class="w-full" />
            <small class="p-error" *ngIf="hasError('name', 'required')">Tên máy không được rỗng</small>
            <small class="p-error" *ngIf="hasError('name', 'server')">{{ form.get('name')?.errors?.['server'] }}</small>
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
            <label for="last_maintenance_date">Ngày bảo trì gần nhất</label>
            <p-calendar
              id="last_maintenance_date"
              formControlName="last_maintenance_date"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              [maxDate]="today"
              appendTo="body"
            ></p-calendar>
            <small class="p-error" *ngIf="hasError('last_maintenance_date', 'server')">{{ form.get('last_maintenance_date')?.errors?.['server'] }}</small>
          </div>

          <div class="field">
            <label for="maintenance_log">Ghi chú bảo trì</label>
            <textarea id="maintenance_log" pInputTextarea formControlName="maintenance_log" class="w-full" rows="3"></textarea>
            <small class="p-error" *ngIf="hasError('maintenance_log', 'server')">{{ form.get('maintenance_log')?.errors?.['server'] }}</small>
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
    '.field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }',
    'label { font-weight: 600; }',
    '.required { color: red; }',
    '.p-error { color: #f87171; font-size: 0.875rem; }',
    '.form-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }',
    '.loading-box { padding: 32px 0; color: #64748b; }',
    '.loading-box i { margin-right: 8px; }',
    '::ng-deep .p-calendar { width: 100%; }',
  ],
})
export class MachineFormComponent implements OnInit {
  form: FormGroup;
  editMode = false;
  loading = false;
  saving = false;
  today = new Date();

  departments: Department[] = [];
  statusOptions = [
    { label: 'Sẵn sàng', value: 'AVAILABLE' },
    { label: 'Đang sử dụng', value: 'IN_USE' },
    { label: 'Bảo trì', value: 'MAINTENANCE' },
    { label: 'Hỏng', value: 'BROKEN' },
  ];

  private currentMachineId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private machineService: MachineService,
    private departmentService: DepartmentService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      machine_id: ['', Validators.required],
      name: ['', Validators.required],
      department: [null, Validators.required],
      status: ['AVAILABLE', Validators.required],
      last_maintenance_date: [null],
      maintenance_log: [''],
    });
  }

  ngOnInit() {
    this.loadDepartments();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.editMode = true;
      this.currentMachineId = idParam;
      this.loadMachine(idParam);
    }
  }

  loadDepartments() {
    this.departmentService.getAll().subscribe({
      next: (data: any) => {
        this.departments = data?.results ?? data ?? [];
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải danh sách khoa/phòng ban.' });
      },
    });
  }

  loadMachine(machineId: string) {
    this.loading = true;
    this.machineService.getById(machineId).subscribe({
      next: (machine: DialysisMachine) => {
        this.form.patchValue({
          machine_id: machine.machine_id,
          name: machine.name,
          department: machine.department,
          status: machine.status,
          last_maintenance_date: machine.last_maintenance_date ? new Date(machine.last_maintenance_date) : null,
          maintenance_log: machine.maintenance_log,
        });
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy máy lọc hoặc không thể tải dữ liệu.' });
        this.router.navigate(['/machines']);
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

    const maintDate: Date | null = raw.last_maintenance_date;
    const maintDateStr = maintDate ? this.formatDate(maintDate) : null;

    const payload: DialysisMachine = {
      machine_id: (raw.machine_id || '').trim().toUpperCase(),
      name: (raw.name || '').trim(),
      department: raw.department,
      status: raw.status,
      last_maintenance_date: maintDateStr,
      maintenance_log: raw.maintenance_log || '',
    };

    const request = this.editMode && this.currentMachineId
      ? this.machineService.update(this.currentMachineId, payload)
      : this.machineService.create(payload);

    request.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: this.editMode ? 'Cập nhật máy lọc thành công' : 'Thêm máy lọc thành công',
        });
        this.router.navigate(['/machines']);
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
      detail: fieldErrors?.detail || 'Không thể lưu máy lọc. Vui lòng thử lại.',
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  cancel() {
    this.router.navigate(['/machines']);
  }
}
