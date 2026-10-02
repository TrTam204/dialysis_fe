import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReportService } from './report.service';

describe('ReportService', () => {
  let service: ReportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReportService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch operational summary with query params', () => {
    const mockReport = {
      date_from: '2026-09-01',
      date_to: '2026-09-30',
      total_sessions: 10,
      completed_sessions: 8,
      cancelled_sessions: 1,
      scheduled_sessions: 1,
      in_progress_sessions: 0,
      completion_rate: 80.0,
      total_uf_target: 25.0,
      total_uf_actual: 24.5,
      daily_trends: [],
    };

    service.getOperationalSummary('2026-09-01', '2026-09-30').subscribe((data) => {
      expect(data.total_sessions).toBe(10);
      expect(data.completion_rate).toBe(80.0);
    });

    const req = httpMock.expectOne('http://localhost:8000/api/reports/operational-summary/?date_from=2026-09-01&date_to=2026-09-30');
    expect(req.request.method).toBe('GET');
    req.flush(mockReport);
  });

  it('should fetch machine utilization with query params', () => {
    const mockReport = {
      date_from: '2026-09-01',
      date_to: '2026-09-30',
      limitation_note: 'Note',
      total_machines: 2,
      total_completed_sessions: 8,
      total_runtime_hours: 32.0,
      machines: [],
    };

    service.getMachineUtilization('2026-09-01', '2026-09-30').subscribe((data) => {
      expect(data.total_machines).toBe(2);
      expect(data.total_runtime_hours).toBe(32.0);
    });

    const req = httpMock.expectOne('http://localhost:8000/api/reports/machine-utilization/?date_from=2026-09-01&date_to=2026-09-30');
    expect(req.request.method).toBe('GET');
    req.flush(mockReport);
  });
});
