import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PatientListComponent } from './patient-list.component';
import { PatientService } from '../../core/services/patient.service';
import { AuthService } from '../../core/services/auth.service';
import { Patient } from '../../core/models';

describe('PatientListComponent State Preservation', () => {
  let component: PatientListComponent;
  let fixture: ComponentFixture<PatientListComponent>;
  let mockPatientService: jasmine.SpyObj<PatientService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let router: Router;
  let queryParamsSubject: BehaviorSubject<Record<string, any>>;

  const dummyPatients: Patient[] = [
    {
      patient_id: 'P_T2_4',
      full_name: 'Pham Thi T2',
      date_of_birth: '1985-05-15',
      gender: 'FEMALE',
      phone_number: '0901234567',
      dry_weight: 52.5,
      status: 'ACTIVE',
      preferred_shift: 'SHIFT_1',
      treatment_pattern: 'T2_T4_T6',
    },
  ];

  beforeEach(async () => {
    queryParamsSubject = new BehaviorSubject<Record<string, any>>({});
    mockPatientService = jasmine.createSpyObj('PatientService', ['getAll', 'delete']);
    mockPatientService.getAll.and.returnValue(of({ results: dummyPatients, count: dummyPatients.length }));

    mockAuthService = jasmine.createSpyObj('AuthService', ['hasRole']);
    mockAuthService.hasRole.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [PatientListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PatientService, useValue: mockPatientService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: {} },
            queryParams: queryParamsSubject.asObservable(),
          },
        },
        MessageService,
        ConfirmationService,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function createComponent(initialQueryParams: Record<string, any> = {}) {
    const route = TestBed.inject(ActivatedRoute);
    route.snapshot.queryParams = initialQueryParams;
    queryParamsSubject.next(initialQueryParams);

    fixture = TestBed.createComponent(PatientListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('nên khôi phục từ khóa tìm kiếm P_T2_4 từ queryParams khi khởi tạo', () => {
    createComponent({ search: 'P_T2_4' });

    expect(component.searchText).toBe('P_T2_4');
    expect(mockPatientService.getAll).toHaveBeenCalledWith(
      jasmine.objectContaining({
        search: 'P_T2_4',
        page: 1,
      })
    );
  });

  it('nên khôi phục bộ lọc trạng thái, giới tính và phân trang từ queryParams', () => {
    createComponent({
      status: 'ACTIVE',
      gender: 'FEMALE',
      page: '2',
      rows: '10',
    });

    expect(component.statusFilter).toBe('ACTIVE');
    expect(component.genderFilter).toBe('FEMALE');
    expect(component.rows).toBe(10);
    expect(component.first).toBe(10); // Trang 2, (2-1)*10 = 10
    expect(mockPatientService.getAll).toHaveBeenCalledWith(
      jasmine.objectContaining({
        status: 'ACTIVE',
        gender: 'FEMALE',
        page: 2,
      })
    );
  });

  it('nên sinh đúng queryParams điều hướng qua getPatientNavigationParams()', () => {
    createComponent();
    component.searchText = 'Pham Thi T2';
    component.statusFilter = 'IN_TREATMENT';
    component.genderFilter = 'FEMALE';
    component.first = 10;
    component.rows = 10;

    const navParams = component.getPatientNavigationParams();
    expect(navParams).toEqual({
      from: 'patients',
      page: '2',
      search: 'Pham Thi T2',
      status: 'IN_TREATMENT',
      gender: 'FEMALE',
    });
  });

  it('nên truyền queryParams đúng khi gọi navigateToPatient()', () => {
    createComponent({ search: 'P_T2_4' });

    const patient = dummyPatients[0];
    component.navigateToPatient(patient);

    expect(router.navigate).toHaveBeenCalledWith(
      ['/patients', 'P_T2_4'],
      {
        queryParams: jasmine.objectContaining({
          from: 'patients',
          search: 'P_T2_4',
        }),
      }
    );
  });

  it('nên xóa sạch bộ lọc và cập nhật URL khi gọi clearFilters()', () => {
    createComponent({ search: 'P_T2_4', status: 'ACTIVE' });

    component.clearFilters();

    expect(component.searchText).toBe('');
    expect(component.statusFilter).toBeNull();
    expect(component.genderFilter).toBeNull();
    expect(component.first).toBe(0);

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: {},
        replaceUrl: true,
      })
    );
  });

  it('nên phản hồi khi browser Back/Forward phát sinh queryParams mới mà không lặp vô hạn', fakeAsync(() => {
    createComponent({ search: 'P_T2_4' });
    mockPatientService.getAll.calls.reset();

    // Giả lập người dùng nhấn Back trên trình duyệt về query rỗng
    queryParamsSubject.next({});
    tick();

    expect(component.searchText).toBe('');
    expect(mockPatientService.getAll).toHaveBeenCalledTimes(1);
  }));
});
