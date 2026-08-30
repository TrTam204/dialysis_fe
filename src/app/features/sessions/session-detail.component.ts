import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SessionService } from '../../core/services/session.service';
import { VitalSignService } from '../../core/services/vital-sign.service';
import { AuthService } from '../../core/services/auth.service';
import { DialysisSession, VitalSign } from '../../core/models';

@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    DividerModule,
    TableModule,
    DialogModule,
    CalendarModule,
    InputNumberModule,
    InputTextareaModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="page-shell">
      <p-toast></p-toast>
      <p-confirmDialog header="Xác nhận xóa" icon="pi pi-exclamation-triangle" [style]="{ width: '420px' }"></p-confirmDialog>

      <div *ngIf="loading" class="loading-box">
        <i class="pi pi-spin pi-spinner"></i> Đang tải dữ liệu...
      </div>

      <div *ngIf="!loading && session">
        <p-card [header]="'Phiên lọc: ' + session.session_id">
          <div class="action-bar">
            <a
              pButton
              *ngIf="canWrite"
              type="button"
              icon="pi pi-pencil"
              label="Sửa"
              [routerLink]="['/sessions', session.session_id, 'edit']"
            ></a>
          </div>

          <p-divider align="left">
            <span class="divider-label">Thông tin phiên lọc</span>
          </p-divider>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Mã phiên:</span>
              <p-tag [value]="session.session_id"></p-tag>
            </div>
            <div class="info-item">
              <span class="info-label">Trạng thái:</span>
              <p-tag [value]="getStatusLabel(session.status)" [severity]="getStatusSeverity(session.status)"></p-tag>
            </div>
            <div class="info-item">
              <span class="info-label">Thời gian bắt đầu:</span>
              <span class="info-value">{{ session.scheduled_start | date: 'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Thời gian kết thúc:</span>
              <span class="info-value">{{ session.scheduled_end | date: 'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="info-item full-width" *ngIf="session.notes">
              <span class="info-label">Ghi chú:</span>
              <span class="info-value multiline">{{ session.notes }}</span>
            </div>
          </div>

          <p-divider align="left">
            <span class="divider-label">Bệnh nhân</span>
          </p-divider>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Tên bệnh nhân:</span>
              <span class="info-value">{{ session.patient_name || session.patient }}</span>
            </div>
          </div>

          <p-divider align="left">
            <span class="divider-label">Máy lọc</span>
          </p-divider>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Tên máy:</span>
              <span class="info-value">{{ session.machine_name || session.machine }}</span>
            </div>
          </div>

          <p-divider align="left">
            <span class="divider-label">Điều dưỡng phụ trách</span>
          </p-divider>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Điều dưỡng:</span>
              <span class="info-value">{{ session.nurse_name || session.assigned_nurse }}</span>
            </div>
          </div>

          <p-divider align="left">
            <span class="divider-label">Sinh hiệu (Vital Signs)</span>
          </p-divider>

          <div class="vital-signs-section">
            <div class="vs-toolbar">
              <button
                pButton
                *ngIf="canWriteVitals"
                type="button"
                icon="pi pi-plus"
                label="Thêm sinh hiệu"
                class="p-button-success"
                (click)="openAddVitalSign()"
              ></button>
            </div>

            <div *ngIf="vitalSignsLoading" class="vs-loading">
              <i class="pi pi-spin pi-spinner"></i> Đang tải sinh hiệu...
            </div>

            <p-table
              *ngIf="!vitalSignsLoading"
              [value]="vitalSigns"
              [responsiveLayout]="'scroll'"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th>Thời gian</th>
                  <th>Huyết áp</th>
                  <th>Nhịp tim</th>
                  <th>SpO2</th>
                  <th>Nhiệt độ</th>
                  <th>Người ghi nhận</th>
                  <th>Ghi chú</th>
                  <th *ngIf="canWriteVitals" style="width: 100px">Hành động</th>
                </tr>
              </ng-template>

              <ng-template pTemplate="body" let-vital>
                <tr>
                  <td>{{ vital.recorded_at | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ vital.systolic_bp || '-' }}/{{ vital.diastolic_bp || '-' }}</td>
                  <td>{{ vital.heart_rate || '-' }}</td>
                  <td>{{ vital.spo2 || '-' }}%</td>
                  <td>{{ vital.temperature || '-' }}°C</td>
                  <td>{{ vital.recorded_by_name || vital.recorded_by }}</td>
                  <td>{{ vital.notes || '-' }}</td>
                  <td *ngIf="canWriteVitals">
                    <button
                      pButton
                      type="button"
                      icon="pi pi-pencil"
                      class="p-button-text"
                      (click)="openEditVitalSign(vital)"
                    ></button>
                    <button
                      pButton
                      type="button"
                      icon="pi pi-trash"
                      class="p-button-text p-button-danger"
                      (click)="confirmDeleteVitalSign(vital)"
                    ></button>
                  </td>
                </tr>
              </ng-template>

              <ng-template pTemplate="emptymessage">
                <tr>
                  <td [attr.colspan]="canWriteVitals ? 8 : 7" class="text-center">Chưa có dữ liệu sinh hiệu</td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </p-card>
      </div>

      <div *ngIf="!loading && !session" class="error-box">
        <p-card>
          <p>Không tìm thấy phiên lọc.</p>
          <a pButton type="button" label="Quay lại danh sách" routerLink="/sessions"></a>
        </p-card>
      </div>

      <p-dialog
        [(visible)]="vitalSignDialog"
        [header]="editingVitalSign ? 'Sửa Sinh hiệu' : 'Thêm Sinh hiệu'"
        [modal]="true"
        [style]="{ width: '500px' }"
      >
        <form [formGroup]="vitalSignForm" (ngSubmit)="saveVitalSign()">
          <div class="field">
            <label for="recorded_at">Thời gian ghi nhận <span class="required">*</span></label>
            <p-calendar
              id="recorded_at"
              formControlName="recorded_at"
              [showTime]="true"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              appendTo="body"
            ></p-calendar>
            <small class="p-error" *ngIf="vitalSignForm.get('recorded_at')?.invalid && vitalSignForm.get('recorded_at')?.touched">
              Thời gian không được rỗng
            </small>
          </div>

          <div class="form-row">
            <div class="field">
              <label for="systolic_bp">Huyết áp tâm thu</label>
              <p-inputNumber id="systolic_bp" formControlName="systolic_bp" [min]="0" [max]="300" class="w-full"></p-inputNumber>
            </div>
            <div class="field">
              <label for="diastolic_bp">Huyết áp tâm trương</label>
              <p-inputNumber id="diastolic_bp" formControlName="diastolic_bp" [min]="0" [max]="200" class="w-full"></p-inputNumber>
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label for="heart_rate">Nhịp tim (bpm)</label>
              <p-inputNumber id="heart_rate" formControlName="heart_rate" [min]="0" [max]="300" class="w-full"></p-inputNumber>
            </div>
            <div class="field">
              <label for="spo2">SpO2 (%)</label>
              <p-inputNumber id="spo2" formControlName="spo2" [min]="0" [max]="100" class="w-full"></p-inputNumber>
            </div>
          </div>

          <div class="field">
            <label for="temperature">Nhiệt độ (°C)</label>
            <p-inputNumber id="temperature" formControlName="temperature" [min]="30" [max]="45" [maxFractionDigits]="1" class="w-full"></p-inputNumber>
          </div>

          <div class="field">
            <label for="notes">Ghi chú</label>
            <textarea id="notes" pInputTextarea formControlName="notes" class="w-full" rows="2"></textarea>
          </div>

          <div class="form-footer">
            <button pButton type="button" label="Hủy" (click)="vitalSignDialog = false" class="p-button-text"></button>
            <button pButton type="submit" [label]="editingVitalSign ? 'Cập nhật' : 'Thêm'" [disabled]="vitalSignForm.invalid || vitalSignSaving" [loading]="vitalSignSaving"></button>
          </div>
        </form>
      </p-dialog>
    </div>
  `,
  styles: [
    '.page-shell { padding: 24px; }',
    '.action-bar { margin-bottom: 16px; }',
    '.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }',
    '.info-item { display: flex; flex-direction: column; gap: 4px; }',
    '.info-item.full-width { grid-column: span 2; }',
    '.info-label { font-weight: 600; color: #64748b; font-size: 0.875rem; }',
    '.info-value { font-size: 1rem; }',
    '.info-value.multiline { white-space: pre-wrap; }',
    '.divider-label { font-weight: 600; color: #334155; }',
    '.vital-signs-section { margin-top: 16px; }',
    '.vs-toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }',
    '.vs-loading { padding: 24px; text-align: center; color: #64748b; }',
    '.vs-loading i { margin-right: 8px; }',
    '.text-center { text-align: center; }',
    '.loading-box { padding: 48px; text-align: center; color: #64748b; }',
    '.loading-box i { margin-right: 8px; }',
    '.error-box { text-align: center; }',
    '.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }',
    '.field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }',
    'label { font-weight: 600; }',
    '.required { color: red; }',
    '.p-error { color: #f87171; font-size: 0.875rem; }',
    '.form-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }',
    '::ng-deep .p-calendar { width: 100%; }',
    '::ng-deep .p-inputnumber { width: 100%; }',
  ],
})
export class SessionDetailComponent implements OnInit {
  session: DialysisSession | null = null;
  vitalSigns: VitalSign[] = [];
  loading = false;
  vitalSignsLoading = false;
  canWrite = false;
  canWriteVitals = false;

  vitalSignDialog = false;
  editingVitalSign: VitalSign | null = null;
  vitalSignSaving = false;
  vitalSignForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private sessionService: SessionService,
    private vitalSignService: VitalSignService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.vitalSignForm = this.fb.group({
      recorded_at: [null, Validators.required],
      systolic_bp: [null],
      diastolic_bp: [null],
      heart_rate: [null],
      spo2: [null],
      temperature: [null],
      notes: [''],
    });
  }

  ngOnInit() {
    const role = this.authService.getUserRole();
    this.canWrite = role === 'ADMIN' || role === 'DOCTOR';
    this.canWriteVitals = role === 'ADMIN' || role === 'DOCTOR';

    const sessionId = this.route.snapshot.paramMap.get('id');
    if (sessionId) {
      this.loadSession(sessionId);
      this.loadVitalSigns(sessionId);
    }
  }

  loadSession(sessionId: string) {
    this.loading = true;
    this.sessionService.getById(sessionId).subscribe({
      next: (session: DialysisSession) => {
        this.session = session;
        this.loading = false;
        if (this.authService.getUserRole() === 'NURSE') {
          this.canWriteVitals = session.assigned_nurse === this.authService.getCurrentUser()?.id;
        }
      },
      error: () => {
        this.loading = false;
        this.session = null;
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy phiên lọc.' });
      },
    });
  }

  loadVitalSigns(sessionId: string) {
    this.vitalSignsLoading = true;
    this.vitalSignService.getBySession(sessionId).subscribe({
      next: (vitals: VitalSign[]) => {
        this.vitalSigns = vitals;
        this.vitalSignsLoading = false;
      },
      error: () => {
        this.vitalSigns = [];
        this.vitalSignsLoading = false;
      },
    });
  }

  openAddVitalSign() {
    this.editingVitalSign = null;
    this.vitalSignForm.reset({ recorded_at: new Date() });
    this.vitalSignDialog = true;
  }

  openEditVitalSign(vital: VitalSign) {
    this.editingVitalSign = vital;
    this.vitalSignForm.patchValue({
      recorded_at: vital.recorded_at ? new Date(vital.recorded_at) : null,
      systolic_bp: vital.systolic_bp,
      diastolic_bp: vital.diastolic_bp,
      heart_rate: vital.heart_rate,
      spo2: vital.spo2,
      temperature: vital.temperature,
      notes: vital.notes,
    });
    this.vitalSignDialog = true;
  }

  saveVitalSign() {
    if (this.vitalSignForm.invalid || !this.session) return;

    this.vitalSignSaving = true;
    const raw = this.vitalSignForm.value;
    const payload = {
      recorded_at: raw.recorded_at ? raw.recorded_at.toISOString() : '',
      systolic_bp: raw.systolic_bp || null,
      diastolic_bp: raw.diastolic_bp || null,
      heart_rate: raw.heart_rate || null,
      spo2: raw.spo2 || null,
      temperature: raw.temperature || null,
      notes: raw.notes || undefined,
    };

    if (this.editingVitalSign?.id) {
      this.vitalSignService.update(this.editingVitalSign.id, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Cập nhật sinh hiệu thành công' });
          this.vitalSignDialog = false;
          this.vitalSignSaving = false;
          this.loadVitalSigns(this.session!.session_id);
        },
        error: (err) => {
          this.vitalSignSaving = false;
          const detail = err?.error?.detail || 'Không thể cập nhật sinh hiệu.';
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail });
        },
      });
    } else {
      this.vitalSignService.createForSession(this.session.session_id, payload).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Thêm sinh hiệu thành công' });
          this.vitalSignDialog = false;
          this.vitalSignSaving = false;
          this.loadVitalSigns(this.session!.session_id);
        },
        error: (err) => {
          this.vitalSignSaving = false;
          const detail = err?.error?.detail || 'Không thể thêm sinh hiệu.';
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail });
        },
      });
    }
  }

  confirmDeleteVitalSign(vital: VitalSign) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc muốn xóa bản ghi sinh hiệu này?',
      accept: () => {
        if (vital.id) {
          this.vitalSignService.delete(vital.id).subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa sinh hiệu.' });
              this.loadVitalSigns(this.session!.session_id);
            },
            error: (err) => {
              const detail = err?.error?.detail || 'Không thể xóa sinh hiệu.';
              this.messageService.add({ severity: 'error', summary: 'Lỗi', detail });
            },
          });
        }
      },
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      SCHEDULED: 'Đã lên lịch',
      IN_PROGRESS: 'Đang thực hiện',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    const severities: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      SCHEDULED: 'info',
      IN_PROGRESS: 'success',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return severities[status] || 'info';
  }
}
