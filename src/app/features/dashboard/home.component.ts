import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ToastModule } from 'primeng/toast';
import { DashboardSummary, DialysisSessionStats, MachineStats } from '../../core/models';
import { DashboardService } from '../../core/services/dashboard.service';
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
  imports: [CommonModule, ButtonModule, CardModule, ChartModule, ToastModule, RouterLink],
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
  barData: any = null;
  doughnutData: any = null;
  loading = false;
  error = false;

  readonly barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
  };

  readonly doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const } },
  };

  constructor(
    private dashboardService: DashboardService,
    private sessionService: SessionService,
    private messageService: MessageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = false;

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

    this.dashboardService.getDialysisStats().subscribe({
      next: (data: DialysisSessionStats[]) => {
        this.barData = {
          labels: data.map((item) => item.date),
          datasets: [
            {
              label: 'Ca lọc',
              data: data.map((item) => item.count),
              backgroundColor: '#60a5fa',
            },
          ],
        };
      },
      error: () => {
        this.barData = null;
      },
    });

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

        this.doughnutData = {
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
        this.doughnutData = null;
      },
    });

    const today = this.getTodayIsoDate();
    this.sessionService.getAll({ date: today }).subscribe({
      next: (response: any) => {
        const sessions = Array.isArray(response) ? response : response?.results ?? [];
        this.todaySessions = [...sessions].sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
        this.todaySummary = {
          total: this.todaySessions.length,
          scheduled: this.todaySessions.filter((session) => session.status === 'SCHEDULED').length,
          inProgress: this.todaySessions.filter((session) => session.status === 'IN_PROGRESS').length,
          completed: this.todaySessions.filter((session) => session.status === 'COMPLETED').length,
          cancelled: this.todaySessions.filter((session) => session.status === 'CANCELLED').length,
        };
        this.loading = false;
      },
      error: () => {
        this.todaySessions = [];
        this.todaySummary = { total: 0, scheduled: 0, inProgress: 0, completed: 0, cancelled: 0 };
        this.loading = false;
        this.error = true;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi phiên hôm nay',
          detail: 'Không thể tải danh sách phiên lọc hôm nay.',
        });
      },
    });
  }

  openSessionDetail(sessionId?: string): void {
    if (!sessionId) {
      return;
    }
    this.router.navigate(['/sessions', sessionId]);
  }

  getMachineCount(status: string): number {
    return this.machineStats.find((item) => item.status === status)?.count ?? 0;
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
}

