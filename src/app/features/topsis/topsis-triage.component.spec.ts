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
    mockTopsisService.rank.and.callFake((payload?: any) => {
      let criteria = mockCriteriaResponse.criteria;
      if (payload?.custom_weights) {
        criteria = criteria.map((c, i) => {
          const short = `C${i + 1}`;
          const w = payload.custom_weights[c.code] ?? payload.custom_weights[short] ?? c.weight;
          return { ...c, weight: w };
        });
      }
      return of({
        ...mockRankResponse,
        criteria,
      });
    });
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

  it('1. should have valid default weights that sum to 1.0 without NaN', () => {
    expect(component.getWeight('C1')).toBe(0.3);
    expect(component.getWeight('C2')).toBe(0.2);
    expect(component.getWeight('C3')).toBe(0.25);
    expect(component.getWeight('C4')).toBe(0.15);
    expect(component.getWeight('C5')).toBe(0.1);

    expect(component.getWeightPercent('C1')).toBe('30');
    expect(component.getWeightPercent('C2')).toBe('20');
    expect(component.getWeightPercent('C3')).toBe('25');
    expect(component.getWeightPercent('C4')).toBe('15');
    expect(component.getWeightPercent('C5')).toBe('10');

    const sum =
      component.getWeight('C1') +
      component.getWeight('C2') +
      component.getWeight('C3') +
      component.getWeight('C4') +
      component.getWeight('C5');
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it('2. should apply valid custom weights when sum is 1.0', () => {
    component.openWeightModal();
    expect(component.showWeightModal).toBeTrue();
    expect(component.editableWeights.length).toBe(5);

    component.editableWeights[0].weight = 0.35;
    component.editableWeights[1].weight = 0.15;
    component.editableWeights[2].weight = 0.25;
    component.editableWeights[3].weight = 0.15;
    component.editableWeights[4].weight = 0.10;

    component.applyWeights();
    expect(component.showWeightModal).toBeFalse();
    expect(component.customWeights['C1']).toBeCloseTo(0.35, 4);
    expect(component.getWeightPercent('C1')).toBe('35');
  });

  it('3. should normalize weights when sum is not equal to 1.0', () => {
    component.openWeightModal();
    // Sum = 0.5 + 0.2 + 0.25 + 0.15 + 0.10 = 1.20
    component.editableWeights[0].weight = 0.5;
    component.applyWeights();

    expect(component.customWeights['C1']).toBeCloseTo(0.5 / 1.2, 4);
    expect(component.getWeightPercent('C1')).not.toBe('NaN');
    expect(component.showWeightModal).toBeFalse();

    const sum =
      component.getWeight('C1') +
      component.getWeight('C2') +
      component.getWeight('C3') +
      component.getWeight('C4') +
      component.getWeight('C5');
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it('4. should handle empty or null input safely without producing NaN', () => {
    expect(component.formatWeightPct('')).toBe('0');
    expect(component.formatWeightPct(null)).toBe('0');
    expect(component.formatWeightPct(undefined)).toBe('0');
    expect(component.formatWeightPct(NaN)).toBe('0');
    expect(component.formatWeightPct('0.25')).toBe('25');
  });

  it('5. should reject when all weights are zero or sum is <= 0', () => {
    component.openWeightModal();
    component.editableWeights.forEach((w) => (w.weight = 0));
    expect(component.totalEditableWeight).toBe(0);

    const rankCallsBefore = mockTopsisService.rank.calls.count();
    component.applyWeights();
    expect(mockTopsisService.rank.calls.count()).toBe(rankCallsBefore);
    expect(component.showWeightModal).toBeTrue();
  });

  it('6. should reject invalid negative input', () => {
    component.openWeightModal();
    component.editableWeights[0].weight = -0.1;

    const rankCallsBefore = mockTopsisService.rank.calls.count();
    component.applyWeights();
    expect(mockTopsisService.rank.calls.count()).toBe(rankCallsBefore);
    expect(component.showWeightModal).toBeTrue();
  });

  it('7. should sync displayed weights with API rank response criteria', () => {
    const updatedCriteria = [
      { code: 'C1', name: 'Kali', unit: '', type: 'benefit' as const, weight: 0.4, description: '' },
      { code: 'C2', name: 'Hb', unit: '', type: 'cost' as const, weight: 0.1, description: '' },
      { code: 'C3', name: 'Ngày', unit: '', type: 'benefit' as const, weight: 0.2, description: '' },
      { code: 'C4', name: 'IDWG', unit: '', type: 'benefit' as const, weight: 0.2, description: '' },
      { code: 'C5', name: 'Dist', unit: '', type: 'cost' as const, weight: 0.1, description: '' },
    ];
    component.syncWeightsFromResponse(updatedCriteria);

    expect(component.getWeight('C1')).toBe(0.4);
    expect(component.getWeightPercent('C1')).toBe('40');
    expect(component.getWeight('C2')).toBe(0.1);
  });

  it('8. should never display NaN% in weight badges or modal after calculation', () => {
    component.openWeightModal();
    component.editableWeights[0].weight = 0.01;
    component.editableWeights[1].weight = 0.21;
    component.editableWeights[2].weight = 0.25;
    component.editableWeights[3].weight = 0.46;
    component.editableWeights[4].weight = 0.10;
    component.applyWeights();

    for (let i = 1; i <= 5; i++) {
      const pct = component.getWeightPercent(`C${i}`);
      expect(pct).not.toContain('NaN');
      expect(pct).not.toContain('undefined');
      expect(pct).not.toContain('Infinity');
    }
  });

  it('9. should use exact engine criteria weights in explanation modal and weighted value calculation', () => {
    const firstAlt = component.rankings[0];
    component.openExplainModal(firstAlt);
    expect(component.showExplainModal).toBeTrue();
    expect(component.selectedAlternative).toBe(firstAlt);

    const normVal = component.getNormalizedValue(0, firstAlt.raw_values[0]);
    expect(normVal).toBeGreaterThan(0);
    const weightedVal = component.getWeightedValue(0, firstAlt.raw_values[0], 'C1');
    expect(weightedVal).toBeCloseTo(normVal * component.rankResponse!.criteria[0].weight, 4);
  });

  it('10. should format department label cleanly for KPI card #3 without truncation', () => {
    component.selectedDepartmentId = null;
    component.rankResponse = {
      ...mockRankResponse,
      department_name: 'Tất cả khoa (Trung tâm)',
    };
    expect(component.getDepartmentDisplayLabel()).toBe('Toàn trung tâm');
    expect(component.getDepartmentFullTitle()).toBe('Tất cả khoa (Trung tâm)');

    component.selectedDepartmentId = 1;
    component.rankResponse = {
      ...mockRankResponse,
      department_name: 'Khoa Thận Nhân Tạo A',
    };
    expect(component.getDepartmentDisplayLabel()).toBe('Khoa Thận Nhân Tạo A');
  });

  it('should calculate ranking successfully and populate vectors', () => {
    component.calculateRanking();
    expect(mockTopsisService.rank).toHaveBeenCalled();
    expect(component.idealPositive.length).toBe(5);
    expect(component.idealNegative.length).toBe(5);
    expect(component.vectorNorms.length).toBe(5);
  });

  it('should return correct severity and labels for scores', () => {
    expect(component.getScoreSeverity(0.7)).toBe('warning');
    expect(component.getScoreSeverity(0.5)).toBe('info');
    expect(component.getScoreSeverity(0.3)).toBe('success');

    expect(component.getScoreLabel(0.7)).toBe('Ưu tiên cao');
    expect(component.getScoreLabel(0.5)).toBe('Ưu tiên vừa');
    expect(component.getScoreLabel(0.3)).toBe('Ưu tiên thấp');

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
