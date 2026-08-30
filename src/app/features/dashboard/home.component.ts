import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardSummary, DialysisSessionStats, MachineStats } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, ToastModule],
  providers: [MessageService],
  template: `
    <div class="dashboard-container">
      <p-toast></p-toast>

      <div *ngIf="loading" class="loading-box">
        <i class="pi pi-spin pi-spinner"></i> Đang tải dữ liệu Dashboard...
      </div>

      <div *ngIf="error && !loading" class="error-box">
        <p-card>
          <p class="error-message">Không thể tải dữ liệu Dashboard.</p>
          <button pButton type="button" label="Thử lại" icon="pi pi-refresh" (ngOnInit)="loadDashboardData()"></button>
        </p-card>
      </div>

      <div *ngIf="!loading && !error && summary" class="dashboard-grid">
        <p-card header="Tổng số bệnh nhân" class="stat-card">
          <h2>{{ summary.total_patients }}</h2>
        </p-card>
        <p-card header="Tổng số nhân sự" class="stat-card">
          <h2>{{ summary.total_staff }}</h2>
        </p-card>
        <p-card header="Tổng phiên lọc" class="stat-card">
          <h2>{{ summary.total_sessions }}</h2>
        </p-card>
        <p-card header="Máy hoạt động" class="stat-card">
          <h2>{{ summary.active_machines }}</h2>
        </p-card>

        <p-card header="Số ca lọc theo ngày (7 ngày)" class="wide-card">
          <p-chart *ngIf="barData" type="bar" [data]="barData" [options]="barOptions"></p-chart>
          <p *ngIf="!barData" class="no-data">Không có dữ liệu</p>
        </p-card>

        <p-card header="Trạng thái máy" class="wide-card">
          <p-chart *ngIf="doughnutData" type="doughnut" [data]="doughnutData" [options]="doughnutOptions"></p-chart>
          <p *ngIf="!doughnutData" class="no-data">Không có dữ liệu</p>
        </p-card>
      </div>
    </div>
  `,
  styles: [
    '.dashboard-container { padding: 24px; }',
    '.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }',
    '.stat-card h2 { margin: 12px 0 0; font-size: 2rem; }',
    '.wide-card { grid-column: span 2; }',
    '.loading-box { padding: 48px; text-align: center; color: #64748b; }',
    '.loading-box i { margin-right: 8px; }',
    '.error-box { text-align: center; padding: 48px; }',
    '.error-message { color: #f87171; margin-bottom: 16px; }',
    '.no-data { text-align: center; color: #94a3b8; padding: 24px; }',
  ],
})
export class HomeComponent implements OnInit {
  summary: DashboardSummary | null = null;
  barData: any = null;
  doughnutData: any = null;
  loading = false;
  error = false;

  barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  doughnutOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' as const } },
  };

  constructor(
    private dashboardService: DashboardService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    this.error = false;

    this.dashboardService.getSummary().subscribe({
      next: (data: DashboardSummary) => {
        this.summary = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải tổng quan Dashboard.' });
      },
    });

    this.dashboardService.getDialysisStats().subscribe({
      next: (data: DialysisSessionStats[]) => {
        this.barData = {
          labels: data.map((d) => d.date),
          datasets: [{ label: 'Ca lọc', data: data.map((d) => d.count), backgroundColor: '#60a5fa' }],
        };
      },
      error: () => {
        this.barData = null;
      },
    });

    this.dashboardService.getMachineStats().subscribe({
      next: (data: MachineStats[]) => {
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
          labels: data.map((d) => statusLabels[d.status] || d.status),
          datasets: [{
            data: data.map((d) => d.count),
            backgroundColor: data.map((d) => statusColors[d.status] || '#94a3b8'),
          }],
        };
      },
      error: () => {
        this.doughnutData = null;
      },
    });
  }
}
