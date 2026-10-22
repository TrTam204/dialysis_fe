import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { ActivatedRoute, Router, provideRouter, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { PatientDetailComponent } from './patient-detail.component';
import { PatientService } from '../../core/services/patient.service';
import { SessionService } from '../../core/services/session.service';
import { BloodSampleService } from '../../core/services/blood-sample.service';
import { AuthService } from '../../core/services/auth.service';
import { Patient } from '../../core/models';

describe('PatientDetailComponent Return Navigation', () => {
  let component: PatientDetailComponent;
  let fixture: ComponentFixture<PatientDetailComponent>;
  let mockPatientService: jasmine.SpyObj<PatientService>;
  let mockSessionService: jasmine.SpyObj<SessionService>;
  let mockBloodSampleService: jasmine.SpyObj<BloodSampleService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let router: Router;
  let queryParamsSubject: BehaviorSubject<Record<string, any>>;

  const dummyPatient: Patient = {
    patient_id: 'P_T2_4',
    full_name: 'Pham Thi T2',
    date_of_birth: '1985-05-15',
    gender: 'FEMALE',
    phone_number: '0901234567',
    dry_weight: 52.5,
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    queryParamsSubject = new BehaviorSubject<Record<string, any>>({});
    mockPatientService = jasmine.createSpyObj('PatientService', ['getById']);
    mockPatientService.getById.and.returnValue(of(dummyPatient));

    mockSessionService = jasmine.createSpyObj('SessionService', ['getAll']);
    mockSessionService.getAll.and.returnValue(of({ results: [], count: 0 }));

    mockBloodSampleService = jasmine.createSpyObj('BloodSampleService', ['getAll']);
    mockBloodSampleService.getAll.and.returnValue(of({ results: [], count: 0 }));

    mockAuthService = jasmine.createSpyObj('AuthService', ['hasRole']);
    mockAuthService.hasRole.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [PatientDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PatientService, useValue: mockPatientService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: BloodSampleService, useValue: mockBloodSampleService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'P_T2_4' }),
            },
            queryParams: queryParamsSubject.asObservable(),
          },
        },
        MessageService,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function createComponent(queryParams: Record<string, any> = {}) {
    queryParamsSubject.next(queryParams);
    fixture = TestBed.createComponent(PatientDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('nên trích xuất và lưu returnQueryParams từ ngữ cảnh danh sách', () => {
    createComponent({
      from: 'patients',
      search: 'P_T2_4',
      status: 'ACTIVE',
      page: '1',
    });

    expect(component.returnQueryParams).toEqual({
      search: 'P_T2_4',
      status: 'ACTIVE',
      page: '1',
    });
  });

  it('nên điều hướng về /patients kèm queryParams đã lưu khi gọi navigateBack()', () => {
    createComponent({
      from: 'patients',
      search: 'P_T2_4',
      page: '2',
      status: 'IN_TREATMENT',
    });

    component.navigateBack();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/patients'],
      {
        queryParams: {
          search: 'P_T2_4',
          page: '2',
          status: 'IN_TREATMENT',
        },
      }
    );
  });

  it('nên điều hướng về /patients an toàn khi truy cập trực tiếp bằng URL (fallback)', () => {
    createComponent({}); // Không có query params

    expect(component.returnQueryParams).toEqual({});

    component.navigateBack();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/patients'],
      { queryParams: undefined }
    );
  });
});
