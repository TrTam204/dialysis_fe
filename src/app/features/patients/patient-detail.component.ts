import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Subject, catchError, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionService } from '../../core/services/session.service';
import { BloodSampleService } from '../../core/services/blood-sample.service';
import { PatientService } from '../../core/services/patient.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { BloodSample, Department, DialysisSession, Patient } from '../../core/models';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    TableModule,
    DialogModule,
    DropdownModule,
    InputTextareaModule,
    TooltipModule,
  ],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.scss'],
})
export class PatientDetailComponent implements OnInit, OnDestroy {
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

  // Department Transfer
  showTransferDialog = false;
  targetDepartmentId: number | null = null;
  transferReason = '';
  transferSaving = false;
  departments: Department[] = [];

  // Dialysis Center coordinates (Benh vien Cho Ray TP.HCM)
  readonly CENTER_LAT = 10.7556;
  readonly CENTER_LNG = 106.6602;
  readonly CENTER_NAME = 'Bệnh viện Chợ Rẫy TP.HCM';
  readonly CENTER_ADDRESS = '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM';

  // Cached Google Maps URLs to prevent iframe reloading on change detection
  googleMapEmbedUrl: SafeResourceUrl | null = null;
  googleMapExternalUrl: string = '';
  googleMapDirectionsUrl: string = '';
  private lastCachedCoordKey: string = '';

  returnQueryParams: Record<string, string> = {};
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private sessionService: SessionService,
    private bloodSampleService: BloodSampleService,
    private departmentService: DepartmentService,
    private authService: AuthService,
    private messageService: MessageService,
    private sanitizer: DomSanitizer
  ) {
    this.canEdit = this.authService.hasRole(['ADMIN', 'DOCTOR']);
    this.canDelete = this.authService.hasRole('ADMIN');
  }

  ngOnInit() {
    const patientId = this.route.snapshot.paramMap.get('id');
    if (patientId) {
      this.loadPatient(patientId);
    }

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const cleanParams: Record<string, string> = {};
      if (params['search']) cleanParams['search'] = params['search'];
      if (params['status']) cleanParams['status'] = params['status'];
      if (params['gender']) cleanParams['gender'] = params['gender'];
      if (params['page']) cleanParams['page'] = params['page'];
      if (params['rows']) cleanParams['rows'] = params['rows'];
      if (params['sort']) cleanParams['sort'] = params['sort'];
      if (params['order']) cleanParams['order'] = params['order'];
      if (params['ordering']) cleanParams['ordering'] = params['ordering'];
      this.returnQueryParams = cleanParams;
    });
  }

  navigateBack(): void {
    this.router.navigate(['/patients'], {
      queryParams: Object.keys(this.returnQueryParams).length > 0 ? this.returnQueryParams : undefined,
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPatient(patientId: string) {
    this.patientLoading = true;
    this.patientService.getById(patientId).subscribe({
      next: (patient: Patient) => {
        this.patient = patient;
        this.patientLoading = false;
        this.updateCachedMapUrls();
        this.loadRelatedData(patientId);
      },
      error: () => {
        this.patientLoading = false;
        this.patient = null;
        this.updateCachedMapUrls();
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
    if (!this.patient) return;
    const nextPage = (event.first ?? 0) / (event.rows ?? this.sessionsRows) + 1;
    this.loadRelatedData(this.patient.patient_id, nextPage, this.samplesPage);
  }

  onSamplePageChange(event: any) {
    if (!this.patient) return;
    const nextPage = (event.first ?? 0) / (event.rows ?? this.samplesRows) + 1;
    this.loadRelatedData(this.patient.patient_id, this.sessionsPage, nextPage);
  }

  getPatientAge(dateOfBirth?: string | null): number | null {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  getGenderLabel(gender?: string | null): string {
    if (!gender) return '-';
    const map: Record<string, string> = {
      MALE: 'Nam',
      FEMALE: 'Nữ',
      OTHER: 'Khác',
    };
    return map[gender] || gender;
  }

  getSessionStatusSeverity(status?: string | null): 'success' | 'info' | 'warning' | 'danger' {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      SCHEDULED: 'info',
      IN_PROGRESS: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return (status && map[status]) || 'info';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'Hoạt động',
      IN_TREATMENT: 'Đang điều trị',
      STABLE: 'Ổn định',
      DISCHARGED: 'Đã xuất viện',
    };
    return map[status] || status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      ACTIVE: 'success',
      IN_TREATMENT: 'warning',
      STABLE: 'info',
      DISCHARGED: 'danger',
    };
    return map[status] || 'info';
  }

  getShiftLabel(shift?: string | null): string {
    const map: Record<string, string> = {
      SHIFT_1: 'Ca 1 (Sáng)',
      SHIFT_2: 'Ca 2 (Trưa)',
      SHIFT_3: 'Ca 3 (Chiều)',
    };
    return shift ? map[shift] || shift : 'Chưa thiết lập';
  }

  getPatternLabel(pattern?: string | null): string {
    const map: Record<string, string> = {
      T2_T4_T6: 'Thứ 2 - Thứ 4 - Thứ 6',
      T3_T5_T7: 'Thứ 3 - Thứ 5 - Thứ 7',
    };
    return pattern ? map[pattern] || pattern : 'Chưa thiết lập';
  }

  latestSession(): DialysisSession | null {
    return this.latestSessionInfo;
  }

  getSessionStatusLabel(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'Chờ lọc',
      IN_PROGRESS: 'Đang lọc',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
    };
    return map[status] || status;
  }

  // Transfer Dialog
  openTransferDialog(): void {
    if (!this.patient) return;
    this.targetDepartmentId = null;
    this.transferReason = '';
    this.showTransferDialog = true;
    if (this.departments.length === 0) {
      this.departmentService.getAll().subscribe({
        next: (res: any) => {
          this.departments = (res.results || res || []).filter((d: Department) => d.is_active);
        },
      });
    }
  }

  submitTransfer(): void {
    if (!this.patient || !this.targetDepartmentId) return;
    this.transferSaving = true;
    this.patientService.transferDepartment(this.patient.patient_id, this.targetDepartmentId, this.transferReason).subscribe({
      next: (res) => {
        this.transferSaving = false;
        this.showTransferDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: res.detail || 'Chuyển khoa thành công!',
        });
        if (this.patient) {
          this.loadPatient(this.patient.patient_id);
        }
      },
      error: (err) => {
        this.transferSaving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: err?.error?.detail || 'Không thể chuyển khoa.',
        });
      },
    });
  }

  // PostGIS & Google Maps
  get calculatedDistance(): number | null {
    if (this.patient?.distance_km !== undefined && this.patient?.distance_km !== null) {
      return this.patient.distance_km;
    }
    if (!this.patient?.latitude || !this.patient?.longitude) return null;
    return this.calculateHaversine(this.CENTER_LAT, this.CENTER_LNG, this.patient.latitude, this.patient.longitude);
  }

  updateCachedMapUrls(): void {
    if (!this.patient || this.patient.latitude == null || this.patient.longitude == null) {
      this.googleMapEmbedUrl = null;
      this.googleMapExternalUrl = '';
      this.googleMapDirectionsUrl = '';
      this.lastCachedCoordKey = '';
      return;
    }
    const lat = Number(this.patient.latitude).toFixed(6);
    const lon = Number(this.patient.longitude).toFixed(6);
    const centerLat = Number(this.patient.center_lat ?? this.CENTER_LAT).toFixed(6);
    const centerLon = Number(this.patient.center_lon ?? this.CENTER_LNG).toFixed(6);
    const coordKey = `${lat},${lon}->${centerLat},${centerLon}`;

    // Chỉ khởi tạo lại SafeResourceUrl nếu tọa độ thực sự thay đổi
    if (this.lastCachedCoordKey === coordKey && this.googleMapEmbedUrl) {
      return;
    }
    this.lastCachedCoordKey = coordKey;

    const embedRawUrl = `https://maps.google.com/maps?q=${lat},${lon}&hl=vi&z=15&output=embed`;
    this.googleMapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedRawUrl);
    this.googleMapExternalUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    this.googleMapDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${centerLat},${centerLon}&travelmode=driving`;
  }

  getDistanceBadgeClass(dist: number | null): string {
    if (dist === null) return 'badge-dist-unknown';
    if (dist <= 5) return 'badge-dist-near';
    if (dist <= 15) return 'badge-dist-medium';
    return 'badge-dist-far';
  }

  getDistanceBadgeLabel(dist: number | null): string {
    if (dist === null) return 'Chưa xác định';
    if (dist <= 5) return 'Gần (< 5 km)';
    if (dist <= 15) return 'Trung bình (5 - 15 km)';
    return 'Xa (> 15 km)';
  }

  private calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }
}
