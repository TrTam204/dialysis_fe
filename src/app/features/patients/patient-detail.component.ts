import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { PatientService } from '../../core/services/patient.service';
import { AuthService } from '../../core/services/auth.service';
import { Patient } from '../../core/models';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    PanelModule,
    DividerModule,
  ],
  template: `
    <div class="page-shell">
      <div *ngIf="loading" class="loading-box">
        <i class="pi pi-spin pi-spinner"></i> Đang tải dữ liệu...
      </div>

      <div *ngIf="!loading && patient">
        <p-card [header]="'Bệnh nhân: ' + patient.full_name">
          <div class="action-bar">
            <a
              pButton
              *ngIf="canWrite"
              type="button"
              icon="pi pi-pencil"
              label="Sửa"
              [routerLink]="['/patients', patient.patient_id, 'edit']"
            ></a>
          </div>

          <p-divider align="left">
            <span class="divider-label">Thông tin cá nhân</span>
          </p-divider>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Mã bệnh nhân:</span>
              <span class="info-value">{{ patient.patient_id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Họ và tên:</span>
              <span class="info-value">{{ patient.full_name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Ngày sinh:</span>
              <span class="info-value">{{ patient.date_of_birth | date: 'dd/MM/yyyy' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Giới tính:</span>
              <span class="info-value">{{ getGenderLabel(patient.gender) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Số điện thoại:</span>
              <span class="info-value">{{ patient.phone_number || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cân nặng khô:</span>
              <span class="info-value">{{ patient.dry_weight ? (patient.dry_weight + ' kg') : '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Trạng thái:</span>
              <p-tag [value]="getStatusLabel(patient.status)" [severity]="getStatusSeverity(patient.status)"></p-tag>
            </div>
            <div class="info-item">
              <span class="info-label">Ngày tạo:</span>
              <span class="info-value">{{ patient.created_at | date: 'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>

          <p-divider align="left">
            <span class="divider-label">Thông tin y tế</span>
          </p-divider>

          <div class="info-grid">
            <div class="info-item full-width">
              <span class="info-label">Tiền sử bệnh lý:</span>
              <span class="info-value multiline">{{ patient.medical_history || 'Không có' }}</span>
            </div>
          </div>

          <p-divider align="left">
            <span class="divider-label">Dịch vụ</span>
          </p-divider>

          <div class="placeholder-box">
            <p>Mẫu xét nghiệm và Phiên lọc máu sẽ được hiển thị tại đây trong các phase tiếp theo.</p>
          </div>
        </p-card>
      </div>

      <div *ngIf="!loading && !patient" class="error-box">
        <p-card>
          <p>Không tìm thấy bệnh nhân.</p>
          <a pButton type="button" label="Quay lại danh sách" routerLink="/patients"></a>
        </p-card>
      </div>
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
    '.placeholder-box { padding: 24px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 8px; }',
    '.loading-box { padding: 48px; text-align: center; color: #64748b; }',
    '.loading-box i { margin-right: 8px; }',
    '.error-box { text-align: center; }',
  ],
})
export class PatientDetailComponent implements OnInit {
  patient: Patient | null = null;
  loading = false;
  canWrite = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    const role = this.authService.getUserRole();
    this.canWrite = role === 'ADMIN' || role === 'DOCTOR';
  }

  ngOnInit() {
    const patientId = this.route.snapshot.paramMap.get('id');
    if (patientId) {
      this.loadPatient(patientId);
    }
  }

  loadPatient(patientId: string) {
    this.loading = true;
    this.patientService.getById(patientId).subscribe({
      next: (patient: Patient) => {
        this.patient = patient;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.patient = null;
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy bệnh nhân.' });
      },
    });
  }

  getGenderLabel(gender?: string): string {
    const labels: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
    return labels[gender || 'OTHER'] || 'Khác';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Hoạt động',
      IN_TREATMENT: 'Điều trị',
      STABLE: 'Ổn định',
      DISCHARGED: 'Xuất viện',
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    const severities: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      ACTIVE: 'success',
      IN_TREATMENT: 'info',
      STABLE: 'warning',
      DISCHARGED: 'danger',
    };
    return severities[status] || 'info';
  }
}
