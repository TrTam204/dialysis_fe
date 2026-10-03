import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AuditLogService } from './audit-log.service';
import { PaginatedAuditLogs, AuditLog } from '../models';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuditLogService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch audit logs with query params', () => {
    const mockResponse: PaginatedAuditLogs = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          actor: 2,
          actor_name: 'Admin User',
          actor_role: 'ADMIN',
          action: 'CREATE',
          entity_type: 'Patient',
          entity_id: 'PT-01',
          changes: { full_name: 'Nguyen Van A' },
          timestamp: '2026-10-04T00:00:00Z',
        },
      ],
    };

    service.getAuditLogs({ page: 1, page_size: 10, action: 'CREATE' }).subscribe((data) => {
      expect(data.count).toBe(1);
      expect(data.results[0].entity_type).toBe('Patient');
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/audit-logs/?page=1&page_size=10&action=CREATE`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch audit log by ID', () => {
    const mockLog: AuditLog = {
      id: 5,
      actor: 1,
      actor_name: 'Doctor B',
      actor_role: 'DOCTOR',
      action: 'UPDATE',
      entity_type: 'DialysisSession',
      entity_id: 'SS-01',
      changes: { status: { before: 'SCHEDULED', after: 'IN_PROGRESS' } },
      timestamp: '2026-10-04T01:00:00Z',
    };

    service.getAuditLogById(5).subscribe((data) => {
      expect(data.id).toBe(5);
      expect(data.action).toBe('UPDATE');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/audit-logs/5/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockLog);
  });
});
