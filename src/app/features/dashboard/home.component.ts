import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import {
  DashboardSummary,
  MachineStats,
  OperationalSummaryReport,
} from '../../core/models';
import { DashboardService } from '../../core/services/dashboard.service';
import { ReportService } from '../../core/services/report.service';
import { SessionService } from '../../core/services/session.service';

type TodaySummary = {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    ChartModule,
    ToastModule,
    TooltipModule,
    RouterLink,
  ],
  providers: [MessageService],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  summary: DashboardSummary | null = null;
  todaySummary: TodaySummary = {
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };
  todaySessions: any[] = [];
  machineStats: MachineStats[] = [];

  // Dashboard 2.0 Timeframe & Aggregation
  timeframe: '7d' | '30d' = '7d';
  operationalSummary: OperationalSummaryReport | null = null;

  // Chart data
  trendChartData: any = null;
  sessionStatusDoughnutData: any = null;
  machineDoughnutData: any = null;

  loading = false;
  loadingTrends = false;
  error = false;

  readonly trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, usePointStyle: true },
      },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
  };

  readonly statusDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    cutout: '68%',
  };

  readonly machineDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    cutout: '68%',
  };

  getMachineStatusColor(status: string): string {
    const colors: Record<string, string> = {
      AVAILABLE: '#22c55e',
      IN_USE: '#3b82f6',
      MAINTENANCE: '#f59e0b',
      BROKEN: '#ef4444',
    };
    return colors[status] || '#94a3b8';
  }

  getMachineLabel(status: string): string {
    const labels: Record<string, string> = {
      AVAILABLE: 'Sẵn sàng',
      IN_USE: 'Đang sử dụng',
      MAINTENANCE: 'Bảo trì',
      BROKEN: 'Hỏng',
    };
    return labels[status] || status;
  }

  constructor(
    private dashboardService: DashboardService,
    private reportService: ReportService,
    private sessionService: SessionService,
    private messageService: MessageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  setTimeframe(tf: '7d' | '30d'): void {
    if (this.timeframe === tf) {
      return;
    }
    this.timeframe = tf;
    this.loadOperationalTrends();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = false;

    // 1. Top KPI Summary
    this.dashboardService.getSummary().subscribe({
      next: (data: DashboardSummary) => {
        this.summary = data;
      },
      error: () => {
        this.error = true;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi Dashboard',
          detail: 'Không thể tải dữ liệu tổng quan.',
        });
      },
    });

    // 2. Machine Stats (Current distribution)
    this.dashboardService.getMachineStats().subscribe({
      next: (data: MachineStats[]) => {
        this.machineStats = data;
        const statusLabels: Record<string, string> = {
          AVAILABLE: 'Sẵn sàng',
          IN_USE: 'Đang sử dụng',
          MAINTENANCE: 'Bảo trì',
          BROKEN: 'Hỏng',
        };
        const statusColors: Record<string, string> = {
          AVAILABLE: '#22c55e',
          IN_USE: '#3b82f6',
          MAINTENANCE: '#f59e0b',
          BROKEN: '#ef4444',
        };

        this.machineDoughnutData = {
          labels: data.map((item) => statusLabels[item.status] || item.status),
          datasets: [
            {
              data: data.map((item) => item.count),
              backgroundColor: data.map((item) => statusColors[item.status] || '#94a3b8'),
            },
          ],
        };
      },
      error: () => {
        this.machineStats = [];
        this.machineDoughnutData = null;
      },
    });

    // 3. Operational Trends via Backend M7.1 Aggregation
    this.loadOperationalTrends();

    // 4. Today Sessions List
    const today = this.getTodayIsoDate();
    this.sessionService.getAll({ date: today }).subscribe({
      next: (response: any) => {
        const sessions = Array.isArray(response) ? response : response?.results ?? [];
        this.todaySessions = [...sessions].sort(
          (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
        );
        this.todaySummary = {
          total: this.todaySessions.length,
          scheduled: this.todaySessions.filter((s) => s.status === 'SCHEDULED').length,
          inProgress: this.todaySessions.filter((s) => s.status === 'IN_PROGRESS').length,
          completed: this.todaySessions.filter((s) => s.status === 'COMPLETED').length,
          cancelled: this.todaySessions.filter((s) => s.status === 'CANCELLED').length,
        };
        this.loading = false;
      },
      error: () => {
        this.todaySessions = [];
        this.todaySummary = { total: 0, scheduled: 0, inProgress: 0, completed: 0, cancelled: 0 };
        this.loading = false;
      },
    });
  }

  loadOperationalTrends(): void {
    this.loadingTrends = true;
    const today = this.getTodayIsoDate();
    const daysOffset = this.timeframe === '7d' ? -6 : -29;
    const dateFrom = this.offsetIsoDate(today, daysOffset);

    this.reportService.getOperationalSummary(dateFrom, today).subscribe({
      next: (report: OperationalSummaryReport) => {
        this.operationalSummary = report;
        this.buildTrendChart(report);
        this.buildSessionStatusDoughnut(report);
        this.loadingTrends = false;
      },
      error: () => {
        this.operationalSummary = null;
        this.trendChartData = null;
        this.sessionStatusDoughnutData = null;
        this.loadingTrends = false;
      },
    });
  }

  private buildTrendChart(report: OperationalSummaryReport): void {
    if (!report.daily_trends || report.daily_trends.length === 0) {
      this.trendChartData = null;
      return;
    }

    const labels = report.daily_trends.map((item) => this.formatDateLabel(item.date));
    this.trendChartData = {
      labels,
      datasets: [
        {
          label: 'Hoàn thành',
          data: report.daily_trends.map((i) => i.completed),
          backgroundColor: '#22c55e',
        },
        {
          label: 'Đang lọc',
          data: report.daily_trends.map((i) => i.in_progress),
          backgroundColor: '#3b82f6',
        },
        {
          label: 'Chờ thực hiện',
          data: report.daily_trends.map((i) => i.scheduled),
          backgroundColor: '#f59e0b',
        },
        {
          label: 'Đã hủy',
          data: report.daily_trends.map((i) => i.cancelled),
          backgroundColor: '#ef4444',
        },
      ],
    };
  }

  private buildSessionStatusDoughnut(report: OperationalSummaryReport): void {
    const total = report.total_sessions;
    if (total === 0) {
      this.sessionStatusDoughnutData = null;
      return;
    }

    this.sessionStatusDoughnutData = {
      labels: ['Hoàn thành', 'Đang thực hiện', 'Chờ thực hiện', 'Đã hủy'],
      datasets: [
        {
          data: [
            report.completed_sessions,
            report.in_progress_sessions,
            report.scheduled_sessions,
            report.cancelled_sessions,
          ],
          backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
          hoverOffset: 4,
        },
      ],
    };
  }

  openSessionDetail(sessionId?: string): void {
    if (!sessionId) {
      return;
    }
    this.router.navigate(['/sessions', sessionId]);
  }

  getSessionStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      SCHEDULED: 'Chờ thực hiện',
      IN_PROGRESS: 'Đang thực hiện',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
    };
    return labels[status] || status;
  }

  getSessionStatusClass(status: string): string {
    const classes: Record<string, string> = {
      SCHEDULED: 'status-scheduled',
      IN_PROGRESS: 'status-in-progress',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
    };
    return classes[status] || 'status-default';
  }

  private getTodayIsoDate(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  private offsetIsoDate(baseDateIso: string, offsetDays: number): string {
    const d = new Date(baseDateIso);
    d.setDate(d.getDate() + offsetDays);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  private formatDateLabel(isoDate: string): string {
    if (!isoDate || isoDate.length < 10) {
      return isoDate;
    }
    const parts = isoDate.split('-');
    return `${parts[2]}/${parts[1]}`;
  }
}
