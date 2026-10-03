import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { SchedulePlanService } from './schedule-plan.service';
import { SchedulePlan, ScheduleAssignment } from '../models';

describe('SchedulePlanService', () => {
  let service: SchedulePlanService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SchedulePlanService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SchedulePlanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get schedule plans with query params', () => {
    const mockPlans: SchedulePlan[] = [
      {
        id: 1,
        name: 'Kế hoạch tuần 41',
        department: 1,
        week_start: '2026-10-05',
        week_end: '2026-10-11',
        status: 'PROPOSED',
      },
    ];

    service.getAll({ status: 'PROPOSED' }).subscribe((data) => {
      expect(data).toEqual(mockPlans);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/schedule-plans/?status=PROPOSED`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPlans);
  });

  it('should get schedule plan by id', () => {
    const mockPlan: SchedulePlan = {
      id: 5,
      name: 'Kế hoạch tuần 42',
      department: 2,
      week_start: '2026-10-12',
      week_end: '2026-10-18',
      status: 'PROPOSED',
    };

    service.getById(5).subscribe((data) => {
      expect(data.id).toBe(5);
      expect(data.name).toBe('Kế hoạch tuần 42');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/schedule-plans/5/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPlan);
  });

  it('should approve schedule plan', () => {
    const mockResponse = {
      plan: { id: 5, status: 'APPROVED' },
      created_sessions_count: 3,
      warnings: [],
      detail: 'Kế hoạch đã được phê duyệt thành công.',
    };

    service.approve(5).subscribe((data) => {
      expect(data.plan.status).toBe('APPROVED');
      expect(data.created_sessions_count).toBe(3);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/schedule-plans/5/approve/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockResponse);
  });

  it('should reject schedule plan with reason', () => {
    const mockResponse = {
      plan: { id: 5, status: 'REJECTED', rejection_reason: 'Thiếu máy lọc' },
      detail: 'Kế hoạch đã bị từ chối.',
    };

    service.reject(5, 'Thiếu máy lọc').subscribe((data) => {
      expect(data.plan.status).toBe('REJECTED');
      expect(data.plan.rejection_reason).toBe('Thiếu máy lọc');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/schedule-plans/5/reject/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Thiếu máy lọc' });
    req.flush(mockResponse);
  });

  it('should get assignments for plan', () => {
    const mockAssignments: ScheduleAssignment[] = [
      {
        id: 10,
        schedule_plan: 5,
        patient: 'PT-01',
        machine: 'M-01',
        scheduled_date: '2026-10-12',
        shift: 'SHIFT_1',
        start_datetime: '2026-10-12T07:00:00Z',
        end_datetime: '2026-10-12T11:00:00Z',
        source: 'GA',
      },
    ];

    service.getAssignments({ schedule_plan: 5 }).subscribe((data) => {
      expect(data).toEqual(mockAssignments);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/schedule-assignments/?schedule_plan=5`);
    expect(req.request.method).toBe('GET');
    req.flush(mockAssignments);
  });
});
