import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TopsisTriageComponent } from './topsis-triage.component';
import { TopsisService } from '../../core/services/topsis.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import {
  CustomUser,
  Department,
  TopsisCriteriaResponse,
  TopsisRankResponse,
} from '../../core/models';

describe('TopsisTriageComponent', () => {
  let component: TopsisTriageComponent;
  let fixture: ComponentFixture<TopsisTriageComponent>;
  let mockTopsisService: jasmine.SpyObj<TopsisService>;
  let mockDepartmentService: jasmine.SpyObj<DepartmentService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockCriteriaResponse: TopsisCriteriaResponse = {
    criteria: [
      { code: 'C1', name: 'Kali máu', unit: 'mEq/L', type: 'benefit', weight: 0.3, description: '' },
      { code: 'C2', name: 'Hemoglobin', unit: 'g/dL', type: 'cost', weight: 0.2, description: '' },
      { code: 'C3', name: 'Số ngày chưa lọc', unit: 'ngày', type: 'benefit', weight: 0.25, description: '' },
      { code: 'C4', name: 'Tăng cân gian lọc', unit: 'kg', type: 'benefit', weight: 0.15, description: '' },
      { code: 'C5', name: 'Khoảng cách', unit: 'km', type: 'cost', weight: 0.1, description: '' },
    ],
    is_clinical_approved: false,
    version: '1.0.0',
    disclaimer: 'Chưa phê duyệt lâm sàng',
  };

  const mockRankResponse: TopsisRankResponse = {
    department_id: 1,
    department_name: 'Khoa Thận Nhân Tạo A',
    calculated_at: '2026-10-16T12:00:00Z',
    total_patients: 2,
    criteria: mockCriteriaResponse.criteria,
    ideal_positive: [0.15, 0.05, 0.12, 0.08, 0.02],
    ideal_negative: [0.05, 0.15, 0.02, 0.01, 0.09],
    rankings: [
      {
        rank: 1,
        alternative_id: 'BN001',
        original_index: 0,
        closeness_score: 0.7138,
        distance_positive: 0.035,
        distance_negative: 0.087,
        raw_values: [5.8, 8.5, 3, 3.2, 5.0],
        patient: {
          patient_id: 'BN001',
          full_name: 'Nguyễn Văn A',
          status: 'ACTIVE',
          department_id: 1,
          department_name: 'Khoa Thận Nhân Tạo A',
          potassium_level: 5.8,
          hemoglobin_level: 8.5,
          days_since_dialysis: 3,
          fluid_overload_kg: 3.2,
          distance_km: 5.0,
          has_location: true,
        },
      },
      {
        rank: 2,
        alternative_id: 'BN002',
        original_index: 1,
        closeness_score: 0.4215,
        distance_positive: 0.065,
        distance_negative: 0.047,
        raw_values: [4.5, 11.0, 1, 1.0, 12.0],
        patient: {
          patient_id: 'BN002',
          full_name: 'Trần Thị B',
          status: 'ACTIVE',
          department_id: 1,
          department_name: 'Khoa Thận Nhân Tạo A',
          potassium_level: 4.5,
          hemoglobin_level: 11.0,
          days_since_dialysis: 1,
          fluid_overload_kg: 1.0,
          distance_km: 12.0,
          has_location: false,
        },
      },
    ],
    is_clinical_approved: false,
    disclaimer: 'Chưa phê duyệt lâm sàng',
  };

  const mockDepartments: Department[] = [
    { id: 1, name: 'Khoa Thận Nhân Tạo A', code: 'KTA', is_active: true },
    { id: 2, name: 'Khoa Thận Nhân Tạo B', code: 'KTB', is_active: true },
  ];

  const mockDoctorUser: CustomUser = {
    id: 10,
    username: 'doctor_a',
    email: 'doctor_a@hospital.vn',
    role: 'DOCTOR',
    department: 1,
    is_active: true,
  };

  beforeEach(async () => {
    mockTopsisService = jasmine.createSpyObj('TopsisService', ['getCriteria', 'rank']);
    mockDepartmentService = jasmine.createSpyObj('DepartmentService', ['getAll']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'getUserRole', 'hasRole']);

    mockTopsisService.getCriteria.and.returnValue(of(mockCriteriaResponse));
    mockTopsisService.rank.and.returnValue(of(mockRankResponse));
    mockDepartmentService.getAll.and.returnValue(of({ results: mockDepartments }));
    mockAuthService.getCurrentUser.and.returnValue(mockDoctorUser);
    mockAuthService.getUserRole.and.returnValue('DOCTOR');
    mockAuthService.hasRole.and.callFake((role: string | string[]) => {
      if (Array.isArray(role)) return role.includes('DOCTOR');
      return role === 'DOCTOR';
    });

    await TestBed.configureTestingModule({
      imports: [TopsisTriageComponent, NoopAnimationsModule],
      providers: [
        { provide: TopsisService, useValue: mockTopsisService },
        { provide: DepartmentService, useValue: mockDepartmentService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopsisTriageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize for DOCTOR with locked department', () => {
    expect(component).toBeTruthy();
    expect(component.isDepartmentLocked).toBeTrue();
    expect(component.selectedDepartmentId).toBe(1);
    expect(mockTopsisService.getCriteria).toHaveBeenCalled();
    expect(mockTopsisService.rank).toHaveBeenCalled();
    expect(component.rankings.length).toBe(2);
    expect(component.rankings[0].patient.patient_id).toBe('BN001');
  });

  it('should calculate ranking successfully and populate vectors', () => {
    component.calculateRanking();
    expect(mockTopsisService.rank).toHaveBeenCalled();
    expect(component.idealPositive.length).toBe(5);
    expect(component.idealNegative.length).toBe(5);
    expect(component.vectorNorms.length).toBe(5);
  });

  it('should open explanation modal and calculate step values', () => {
    const firstAlt = component.rankings[0];
    component.openExplainModal(firstAlt);
    expect(component.showExplainModal).toBeTrue();
    expect(component.selectedAlternative).toBe(firstAlt);

    const normVal = component.getNormalizedValue(0, firstAlt.raw_values[0]);
    expect(normVal).toBeGreaterThan(0);
    const weightedVal = component.getWeightedValue(0, firstAlt.raw_values[0], 'C1');
    expect(weightedVal).toBeGreaterThan(0);
  });

  it('should open weight modal and validate weights update', () => {
    component.openWeightModal();
    expect(component.showWeightModal).toBeTrue();
    expect(component.editableWeights.length).toBe(5);
    expect(component.totalEditableWeight).toBeCloseTo(1.0, 2);

    // Apply custom weights
    component.editableWeights[0].weight = 0.5;
    component.applyWeights();
    expect(component.customWeights['C1']).toBe(0.5);
    expect(component.showWeightModal).toBeFalse();
  });

  it('should return correct severity and labels for scores', () => {
    expect(component.getScoreSeverity(0.7)).toBe('warning');
    expect(component.getScoreSeverity(0.5)).toBe('info');
    expect(component.getScoreSeverity(0.3)).toBe('success');

    expect(component.getScoreLabel(0.7)).toBe('Thứ hạng ưu tiên cao trong mô hình');
    expect(component.getScoreLabel(0.5)).toBe('Thứ hạng trung bình trong mô hình');
    expect(component.getScoreLabel(0.3)).toBe('Thứ hạng thấp hơn trong mô hình');

    expect(component.getRankBadgeClass(1)).toBe('rank-badge rank-first');
    expect(component.getRankBadgeClass(2)).toBe('rank-badge rank-second');
    expect(component.getRankBadgeClass(3)).toBe('rank-badge rank-third');
    expect(component.getRankBadgeClass(4)).toBe('rank-badge rank-normal');
  });

  it('should handle rank API error gracefully', () => {
    mockTopsisService.rank.and.returnValue(
      throwError(() => ({ error: { detail: 'Database error' } }))
    );
    component.calculateRanking();
    expect(component.loadingRanking).toBeFalse();
    expect(component.errorMessage).toBe('Database error');
    expect(component.rankings.length).toBe(0);
  });
});
