import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { catchError, of } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { BloodSampleService } from '../../core/services/blood-sample.service';
import { PatientService } from '../../core/services/patient.service';
import { AuthService } from '../../core/services/auth.service';
import { BloodSample, DialysisSession, Patient } from '../../core/models';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    TableModule,
  ],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.scss'],
})
export class PatientDetailComponent implements OnInit {
  patient: Patient | null = null;
  patientLoading = false;
  sessions: DialysisSession[] = [];
  samples: BloodSample[] = [];
  sessionsLoading = false;
  samplesLoading = false;
  sessionsError = '';
  samplesError = '';
  sessionsCount = 0;
  samplesCount = 0;
  sessionsPage = 1;
  samplesPage = 1;
  sessionsRows = 10;
  samplesRows = 10;
  latestSessionInfo: DialysisSession | null = null;
  activeTab: 'overview' | 'history' | 'labs' = 'overview';
  canEdit = false;
  canDelete = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private sessionService: SessionService,
    private bloodSampleService: BloodSampleService,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.canEdit = this.authService.hasRole(['ADMIN', 'DOCTOR']);
    this.canDelete = this.authService.hasRole('ADMIN');
  }

  ngOnInit() {
    const patientId = this.route.snapshot.paramMap.get('id');
    if (patientId) {
      this.loadPatient(patientId);
    }
  }

  loadPatient(patientId: string) {
    this.patientLoading = true;
    this.patientService.getById(patientId).subscribe({
      next: (patient: Patient) => {
        this.patient = patient;
        this.patientLoading = false;
        this.loadRelatedData(patientId);
      },
      error: () => {
        this.patientLoading = false;
        this.patient = null;
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không tìm thấy bệnh nhân.' });
      },
    });
  }

  loadRelatedData(patientId: string, sessionPage = 1, samplePage = 1) {
    this.sessionsLoading = true;
    this.samplesLoading = true;

    this.sessionService
      .getAll({ patient: patientId, ordering: '-scheduled_start', page: sessionPage })
      .pipe(
        catchError(() => {
          this.sessionsError = 'Không thể tải lịch sử điều trị.';
          return of({ results: [], count: 0 });
        })
      )
      .subscribe((response: any) => {
        const nextSessions = response?.results ?? response ?? [];
        this.sessions = nextSessions;
        this.sessionsCount = response?.count ?? nextSessions.length;
        this.sessionsPage = sessionPage;
        if (sessionPage === 1) {
          this.latestSessionInfo = nextSessions[0] ?? null;
        }
        this.sessionsLoading = false;
      });

    this.bloodSampleService
      .getAll({ patient: patientId, ordering: '-collection_date', page: samplePage })
      .pipe(
        catchError(() => {
          this.samplesError = 'Không thể tải mẫu xét nghiệm.';
          return of({ results: [], count: 0 });
        })
      )
      .subscribe((response: any) => {
        const nextSamples = response?.results ?? response ?? [];
        this.samples = nextSamples;
        this.samplesCount = response?.count ?? nextSamples.length;
        this.samplesPage = samplePage;
        this.samplesLoading = false;
      });
  }

  onSessionPageChange(event: any) {
    if (!this.patient) {
      return;
    }

    const nextPage = (event.first ?? 0) / (event.rows ?? this.sessionsRows) + 1;
    this.loadRelatedData(this.patient.patient_id, nextPage, this.samplesPage);
  }

  onSamplePageChange(event: any) {
    if (!this.patient) {
      return;
    }

    const nextPage = (event.first ?? 0) / (event.rows ?? this.samplesRows) + 1;
    this.loadRelatedData(this.patient.patient_id, this.sessionsPage, nextPage);
  }

  getPatientAge(dateOfBirth?: string | null): number | null {
    if (!dateOfBirth) {
      return null;
    }

    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }

    return age >= 0 ? age : null;
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

  getSessionStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      SCHEDULED: 'Đã lên lịch',
      IN_PROGRESS: 'Đang thực hiện',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Hủy',
    };
    return labels[status] || status;
  }

  getSessionStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    const severities: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      SCHEDULED: 'info',
      IN_PROGRESS: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return severities[status] || 'info';
  }

  latestSession(): DialysisSession | null {
    return this.latestSessionInfo ?? (this.sessions.length > 0 ? this.sessions[0] : null);
  }
}
