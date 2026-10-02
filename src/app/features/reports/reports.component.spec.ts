import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ReportsComponent } from './reports.component';
import { ReportService } from '../../core/services/report.service';
import { OperationalSummaryReport, MachineUtilizationReport } from '../../core/models';

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;
  let mockReportService: jasmine.SpyObj<ReportService>;

  const mockOperationalSummary: OperationalSummaryReport = {
    date_from: '2026-09-01',
    date_to: '2026-09-30',
    total_sessions: 12,
    completed_sessions: 10,
    cancelled_sessions: 1,
    scheduled_sessions: 1,
    in_progress_sessions: 0,
    completion_rate: 83.33,
    total_uf_target: 30.0,
    total_uf_actual: 28.5,
    daily_trends: [
      {
        date: '2026-09-01',
        total: 2,
        completed: 2,
        cancelled: 0,
        scheduled: 0,
        in_progress: 0,
      },
    ],
  };

  const mockMachineUtilization: MachineUtilizationReport = {
    date_from: '2026-09-01',
    date_to: '2026-09-30',
    limitation_note: 'No history',
    total_machines: 1,
    total_completed_sessions: 10,
    total_runtime_hours: 40.0,
    machines: [
      {
        machine_id: 'M-001',
        name: 'Machine 01',
        status: 'AVAILABLE',
        department_id: 1,
        department_name: 'Dialysis Dept',
        last_maintenance_date: '2026-08-01',
        session_count: 12,
        completed_count: 10,
        cancelled_count: 1,
        actual_runtime_hours: 40.0,
        actual_runtime_minutes: 2400.0,
      },
    ],
  };

  beforeEach(async () => {
    mockReportService = jasmine.createSpyObj('ReportService', [
      'getOperationalSummary',
      'getMachineUtilization',
    ]);
    mockReportService.getOperationalSummary.and.returnValue(of(mockOperationalSummary));
    mockReportService.getMachineUtilization.and.returnValue(of(mockMachineUtilization));

    await TestBed.configureTestingModule({
      imports: [ReportsComponent],
      providers: [
        { provide: ReportService, useValue: mockReportService },
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load initial 30d reports', () => {
    expect(component).toBeTruthy();
    expect(component.summaryReport).toEqual(mockOperationalSummary);
    expect(component.machineReport).toEqual(mockMachineUtilization);
    expect(component.trendChartData).toBeTruthy();
    expect(component.statusDoughnutData).toBeTruthy();
    expect(component.machineBarData).toBeTruthy();
  });

  it('should switch preset to 7d and reload', () => {
    component.setPreset('7d');
    expect(component.activePreset).toBe('7d');
    expect(mockReportService.getOperationalSummary).toHaveBeenCalled();
  });

  it('should switch tab between operational and machine', () => {
    expect(component.activeTab).toBe('operational');
    component.switchTab('machine');
    expect(component.activeTab).toBe('machine');
  });

  it('should handle API errors gracefully without crashing', () => {
    mockReportService.getOperationalSummary.and.returnValue(
      throwError(() => ({ error: { detail: 'Server Error' } }))
    );
    component.loadReports();
    expect(component.error).toBeTrue();
    expect(component.loading).toBeFalse();
  });

  it('should handle empty dataset gracefully', () => {
    const emptySummary: OperationalSummaryReport = {
      date_from: '2026-09-01',
      date_to: '2026-09-30',
      total_sessions: 0,
      completed_sessions: 0,
      cancelled_sessions: 0,
      scheduled_sessions: 0,
      in_progress_sessions: 0,
      completion_rate: 0.0,
      total_uf_target: 0.0,
      total_uf_actual: 0.0,
      daily_trends: [],
    };
    mockReportService.getOperationalSummary.and.returnValue(of(emptySummary));
    component.loadReports();
    expect(component.summaryReport?.total_sessions).toBe(0);
    expect(component.statusDoughnutData).toBeNull();
  });

  it('should trigger window.print on printReport', () => {
    spyOn(window, 'print');
    component.printReport();
    expect(window.print).toHaveBeenCalled();
  });
});
