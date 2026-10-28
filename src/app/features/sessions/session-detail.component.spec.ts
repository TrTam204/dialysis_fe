import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SessionDetailComponent } from './session-detail.component';
import { SessionService } from '../../core/services/session.service';
import { VitalSignService } from '../../core/services/vital-sign.service';
import { AuthService } from '../../core/services/auth.service';
import { DialysisSession, IdhPredictionResponse, LstmModelInfoResponse } from '../../core/models';

describe('SessionDetailComponent - LSTM IDH Early Warning & Evaluation', () => {
  let component: SessionDetailComponent;
  let fixture: ComponentFixture<SessionDetailComponent>;
  let mockSessionService: jasmine.SpyObj<SessionService>;
  let mockVitalSignService: jasmine.SpyObj<VitalSignService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let queryParamsSubject: BehaviorSubject<Record<string, any>>;

  const dummySession: DialysisSession = {
    session_id: 'SES-001',
    patient: 'PAT-001',
    patient_name: 'Nguyen Van A',
    machine: 'MAC-01',
    machine_name: 'Fresenius 4008S #1',
    scheduled_start: '2026-10-22T08:00:00Z',
    scheduled_end: '2026-10-22T12:00:00Z',
    status: 'IN_PROGRESS',
    patient_dry_weight: 55.0,
    pre_weight: 57.5,
    uf_target: 2.5,
  };

  const dummyIdhPrediction: IdhPredictionResponse = {
    has_prediction: true,
    status: 'READY',
    prediction_id: 'pred-777',
    patient_id: 'PAT-001',
    session_id: 'SES-001',
    risk_probability: 0.814,
    risk_level: 'HIGH',
    is_idh_predicted: true,
    threshold_used: 0.5,
    contributing_factors: [
      'Huyết áp tâm thu giảm dốc > 20 mmHg giữa 2 lần đo liên tiếp',
      'Tốc độ rút dịch UF hiện tại vượt ngưỡng bù trừ mao mạch',
    ],
    clinical_recommendations: [
      'Tạm thời giảm tốc độ siêu lọc (UF rate) xuống 50%',
      'Đo lại huyết áp sau 15 phút, theo dõi sát triệu chứng hoa mắt, vã mồ hôi',
    ],
    inference_source: 'FASTAPI_MICROSERVICE',
    is_padded: false,
    recorded_vitals_count: 4,
  };

  const dummyModelInfo: LstmModelInfoResponse = {
    model_name: 'IDHLSTMNet',
    framework: 'PyTorch',
    architecture: '2-layer Bidirectional LSTM + Linear + Sigmoid',
    input_features: ['systolic_bp', 'diastolic_bp', 'map', 'heart_rate', 'uf_rate', 'cumulative_uf'],
    sequence_length: 3,
    metrics: {
      test: {
        loss: 0.0482,
        accuracy: 0.985,
        precision: 0.963,
        recall: 0.975,
        f1_score: 0.969,
        roc_auc: 0.993,
        confusion_matrix: [
          [298, 4],
          [2, 78],
        ],
        sample_count: 382,
      },
    },
    training_history: [
      { epoch: 1, train_loss: 0.45, val_loss: 0.42, train_accuracy: 0.83, val_accuracy: 0.81, train_f1: 0.76, val_f1: 0.75 },
      { epoch: 2, train_loss: 0.35, val_loss: 0.32, train_accuracy: 0.88, val_accuracy: 0.86, train_f1: 0.82, val_f1: 0.81 },
    ],
  };

  beforeEach(async () => {
    queryParamsSubject = new BehaviorSubject<Record<string, any>>({});
    mockSessionService = jasmine.createSpyObj('SessionService', ['getById', 'patch', 'getIdhPrediction', 'getLstmModelInfo']);
    mockSessionService.getById.and.returnValue(of(dummySession));
    mockSessionService.getIdhPrediction.and.returnValue(of(dummyIdhPrediction));
    mockSessionService.getLstmModelInfo.and.returnValue(of(dummyModelInfo));

    mockVitalSignService = jasmine.createSpyObj('VitalSignService', ['getBySession', 'createForSession', 'patch', 'delete']);
    mockVitalSignService.getBySession.and.returnValue(of([]));

    mockAuthService = jasmine.createSpyObj('AuthService', ['getUserRole', 'getCurrentUser', 'hasRole']);
    mockAuthService.getUserRole.and.returnValue('DOCTOR');
    mockAuthService.hasRole.and.callFake((roles: any) => {
      const r = mockAuthService.getUserRole();
      return Array.isArray(roles) ? roles.includes(r) : roles === r;
    });
    mockAuthService.getCurrentUser.and.returnValue({ id: 1, username: 'doctor1', email: 'doc@dialysis.vn', role: 'DOCTOR', department: 1, is_active: true });

    await TestBed.configureTestingModule({
      imports: [SessionDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: mockSessionService },
        { provide: VitalSignService, useValue: mockVitalSignService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'SES-001' }),
              queryParams: {},
            },
            queryParams: queryParamsSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and load IDH prediction automatically', () => {
    expect(component).toBeTruthy();
    expect(mockSessionService.getIdhPrediction).toHaveBeenCalledWith('SES-001');
    expect(component.idhPrediction).toEqual(dummyIdhPrediction);
    expect(component.idhPrediction?.risk_level).toBe('HIGH');
  });

  it('should map risk level to correct PrimeNG tag severity and label', () => {
    expect(component.getIdhRiskSeverity('LOW')).toBe('success');
    expect(component.getIdhRiskSeverity('MEDIUM')).toBe('warning');
    expect(component.getIdhRiskSeverity('HIGH')).toBe('danger');
    expect(component.getIdhRiskSeverity(undefined)).toBe('info');

    expect(component.getIdhRiskLabel('LOW')).toBe('Nguy cơ Thấp');
    expect(component.getIdhRiskLabel('MEDIUM')).toBe('Nguy cơ Trung bình');
    expect(component.getIdhRiskLabel('HIGH')).toBe('Nguy cơ Cao (Cảnh báo)');
    expect(component.getIdhRiskLabel(undefined)).toBe('Chưa xác định');
  });

  it('should load model info and build training curves chart when opening modal', () => {
    component.openModelInfoModal();
    expect(component.showModelInfoModal).toBeTrue();
    expect(mockSessionService.getLstmModelInfo).toHaveBeenCalled();
    expect(component.modelInfo).toEqual(dummyModelInfo);

    expect(component.testMetrics).toBeDefined();
    expect(component.testMetrics?.accuracy).toBe(0.985);
    expect(component.cmTN).toBe(298);
    expect(component.cmFP).toBe(4);
    expect(component.cmFN).toBe(2);
    expect(component.cmTP).toBe(78);

    expect(component.trainingCurvesChartData).toBeDefined();
    expect(component.trainingCurvesChartData.labels.length).toBe(2);
    expect(component.trainingCurvesChartData.datasets.length).toBe(4);
  });
});
