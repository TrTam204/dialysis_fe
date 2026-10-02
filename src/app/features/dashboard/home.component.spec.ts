import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { HomeComponent } from './home.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { ReportService } from '../../core/services/report.service';
import { SessionService } from '../../core/services/session.service';
import {
  DashboardSummary,
  MachineStats,
  OperationalSummaryReport,
} from '../../core/models';

describe('HomeComponent (Dashboard 2.0)', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockDashboardService: jasmine.SpyObj<DashboardService>;
  let mockReportService: jasmine.SpyObj<ReportService>;
  let mockSessionService: jasmine.SpyObj<SessionService>;

  const mockSummary: DashboardSummary = {
    total_patients: 15,
    total_staff: 8,
    total_sessions: 42,
    total_sessions_today: 3,
    active_machines: 5,
  };

  const mockMachineStats: MachineStats[] = [
    { status: 'AVAILABLE', count: 4 },
    { status: 'IN_USE', count: 1 },
    { status: 'MAINTENANCE', count: 1 },
    { status: 'BROKEN', count: 0 },
  ];

  const mockOperationalSummary: OperationalSummaryReport = {
    date_from: '2026-09-26',
    date_to: '2026-10-02',
    total_sessions: 10,
    completed_sessions: 8,
    cancelled_sessions: 1,
    scheduled_sessions: 1,
    in_progress_sessions: 0,
    completion_rate: 80.0,
    total_uf_target: 20.0,
    total_uf_actual: 19.5,
    daily_trends: [
      {
        date: '2026-09-26',
        total: 2,
        completed: 2,
        cancelled: 0,
        scheduled: 0,
        in_progress: 0,
      },
    ],
  };

  beforeEach(async () => {
    mockDashboardService = jasmine.createSpyObj('DashboardService', [
      'getSummary',
      'getMachineStats',
      'getDialysisStats',
    ]);
    mockReportService = jasmine.createSpyObj('ReportService', [
      'getOperationalSummary',
    ]);
    mockSessionService = jasmine.createSpyObj('SessionService', ['getAll']);

    mockDashboardService.getSummary.and.returnValue(of(mockSummary));
    mockDashboardService.getMachineStats.and.returnValue(of(mockMachineStats));
    mockReportService.getOperationalSummary.and.returnValue(
      of(mockOperationalSummary)
    );
    mockSessionService.getAll.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: ReportService, useValue: mockReportService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load Dashboard 2.0 with default 7d timeframe', () => {
    expect(component).toBeTruthy();
    expect(component.summary).toEqual(mockSummary);
    expect(component.timeframe).toBe('7d');
    expect(component.operationalSummary).toEqual(mockOperationalSummary);
    expect(component.trendChartData).toBeTruthy();
    expect(component.sessionStatusDoughnutData).toBeTruthy();
    expect(component.machineDoughnutData).toBeTruthy();
  });

  it('should switch timeframe to 30d and fetch backend aggregate', () => {
    component.setTimeframe('30d');
    expect(component.timeframe).toBe('30d');
    expect(mockReportService.getOperationalSummary).toHaveBeenCalledTimes(2);
  });

  it('should handle operational summary error gracefully', () => {
    mockReportService.getOperationalSummary.and.returnValue(
      throwError(() => new Error('Network error'))
    );
    component.loadOperationalTrends();
    expect(component.operationalSummary).toBeNull();
    expect(component.trendChartData).toBeNull();
    expect(component.sessionStatusDoughnutData).toBeNull();
    expect(component.loadingTrends).toBeFalse();
  });
});
