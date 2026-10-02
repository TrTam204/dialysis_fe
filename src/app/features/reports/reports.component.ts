import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MachineUtilizationReport, OperationalSummaryReport } from '../../core/models';
import { ReportService } from '../../core/services/report.service';

type PresetType = '7d' | '30d' | 'this_month' | 'custom';
type TabType = 'operational' | 'machine';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    ChartModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit {
  dateFrom = '';
  dateTo = '';
  activePreset: PresetType = '30d';
  activeTab: TabType = 'operational';

  loading = false;
  error = false;
  errorMessage = '';

  summaryReport: OperationalSummaryReport | null = null;
  machineReport: MachineUtilizationReport | null = null;

  trendChartData: any = null;
  trendChartOptions: any = null;

  statusDoughnutData: any = null;
  statusDoughnutOptions: any = null;

  machineBarData: any = null;
  machineBarOptions: any = null;

  constructor(
    private reportService: ReportService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.initChartOptions();
    this.setPreset('30d');
  }

  private initChartOptions(): void {
    this.trendChartOptions = {
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

    this.statusDoughnutOptions = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.15,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: { boxWidth: 10, padding: 8, font: { size: 11 }, usePointStyle: true },
        },
      },
      cutout: '65%',
    };

    this.machineBarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: { boxWidth: 12, usePointStyle: true },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
      },
    };
  }

  setPreset(preset: PresetType): void {
    this.activePreset = preset;
    const today = this.getTodayIsoDate();

    if (preset === '7d') {
      this.dateTo = today;
      this.dateFrom = this.offsetIsoDate(today, -6);
    } else if (preset === '30d') {
      this.dateTo = today;
      this.dateFrom = this.offsetIsoDate(today, -29);
    } else if (preset === 'this_month') {
      this.dateTo = today;
      this.dateFrom = today.slice(0, 8) + '01';
    }

    this.loadReports();
  }

  onCustomDateChange(): void {
    this.activePreset = 'custom';
  }

  applyFilter(): void {
    if (!this.dateFrom || !this.dateTo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Khoảng ngày',
        detail: 'Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.',
      });
      return;
    }

    if (this.dateFrom > this.dateTo) {
      this.messageService.add({
        severity: 'error',
        summary: 'Ngày không hợp lệ',
        detail: 'Ngày bắt đầu không được lớn hơn ngày kết thúc.',
      });
      return;
    }

    this.loadReports();
  }

  switchTab(tab: TabType): void {
    this.activeTab = tab;
  }

  loadReports(): void {
    this.loading = true;
    this.error = false;
    this.errorMessage = '';

    let summaryLoaded = false;
    let machineLoaded = false;

    const checkComplete = () => {
      if (summaryLoaded && machineLoaded) {
        this.loading = false;
      }
    };

    // 1. Operational Summary
    this.reportService.getOperationalSummary(this.dateFrom, this.dateTo).subscribe({
      next: (data) => {
        this.summaryReport = data;
        this.buildTrendChart(data);
        this.buildStatusDoughnut(data);
        summaryLoaded = true;
        checkComplete();
      },
      error: (err) => {
        summaryLoaded = true;
        this.error = true;
        this.errorMessage = err?.error?.detail || 'Không thể tải báo cáo vận hành.';
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi Báo cáo Vận hành',
          detail: this.errorMessage,
        });
        checkComplete();
      },
    });

    // 2. Machine Utilization
    this.reportService.getMachineUtilization(this.dateFrom, this.dateTo).subscribe({
      next: (data) => {
        this.machineReport = data;
        this.buildMachineChart(data);
        machineLoaded = true;
        checkComplete();
      },
      error: (err) => {
        machineLoaded = true;
        this.error = true;
        this.errorMessage = err?.error?.detail || 'Không thể tải báo cáo máy lọc.';
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi Báo cáo Máy lọc',
          detail: this.errorMessage,
        });
        checkComplete();
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

  private buildStatusDoughnut(report: OperationalSummaryReport): void {
    const total = report.total_sessions;
    if (total === 0) {
      this.statusDoughnutData = null;
      return;
    }

    this.statusDoughnutData = {
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

  private buildMachineChart(report: MachineUtilizationReport): void {
    if (!report.machines || report.machines.length === 0) {
      this.machineBarData = null;
      return;
    }

    const labels = report.machines.map((m) => m.name || m.machine_id);
    this.machineBarData = {
      labels,
      datasets: [
        {
          label: 'Tổng ca',
          data: report.machines.map((m) => m.session_count),
          backgroundColor: '#60a5fa',
        },
        {
          label: 'Hoàn thành',
          data: report.machines.map((m) => m.completed_count),
          backgroundColor: '#22c55e',
        },
      ],
    };
  }

  getMachineStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'AVAILABLE':
        return 'success';
      case 'IN_USE':
        return 'info';
      case 'MAINTENANCE':
        return 'warning';
      case 'BROKEN':
        return 'danger';
      default:
        return 'info';
    }
  }

  getMachineStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      AVAILABLE: 'Sẵn sàng',
      IN_USE: 'Đang sử dụng',
      MAINTENANCE: 'Bảo trì',
      BROKEN: 'Hỏng',
    };
    return labels[status] || status;
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

  printReport(): void {
    window.print();
  }

  get currentDateStr(): string {
    return new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  exportCsv(): void {
    if (!this.summaryReport && !this.machineReport) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Chưa có dữ liệu',
        detail: 'Không có dữ liệu báo cáo để xuất.',
      });
      return;
    }

    const rows: string[] = [];
    rows.push('\uFEFF'); // UTF-8 BOM for Excel support
    rows.push('BÁO CÁO VẬN HÀNH & NĂNG LỰC LỌC MÁU');
    rows.push(`Khoảng thời gian:,Từ ${this.dateFrom} đến ${this.dateTo}`);
    rows.push(`Ngày xuất:,${new Date().toLocaleString('vi-VN')}`);
    rows.push('');

    if (this.summaryReport) {
      rows.push('--- THỐNG KÊ TỔNG QUAN ---');
      rows.push('Chỉ số,Giá trị');
      rows.push(`Tổng phiên lọc,${this.summaryReport.total_sessions}`);
      rows.push(`Phiên hoàn thành,${this.summaryReport.completed_sessions}`);
      rows.push(`Đang thực hiện,${this.summaryReport.in_progress_sessions}`);
      rows.push(`Chờ thực hiện,${this.summaryReport.scheduled_sessions}`);
      rows.push(`Đã hủy,${this.summaryReport.cancelled_sessions}`);
      rows.push(`Tỷ lệ hoàn thành (%),${this.summaryReport.completion_rate}%`);
      rows.push(`Tổng UF mục tiêu (L),${this.summaryReport.total_uf_target}`);
      rows.push(`Tổng UF thực tế (L),${this.summaryReport.total_uf_actual}`);
      const avgUf = this.summaryReport.completed_sessions > 0 ? (this.summaryReport.total_uf_actual / this.summaryReport.completed_sessions).toFixed(2) : '0.0';
      rows.push(`UF trung bình (L),${avgUf}`);
      rows.push('');

      if (this.summaryReport.daily_trends?.length) {
        rows.push('--- CHI TIẾT THEO NGÀY ---');
        rows.push('Ngày,Tổng ca,Hoàn thành,Đang lọc,Chờ thực hiện,Đã hủy');
        this.summaryReport.daily_trends.forEach((d) => {
          rows.push(`${d.date},${d.total},${d.completed},${d.in_progress},${d.scheduled},${d.cancelled}`);
        });
        rows.push('');
      }
    }

    if (this.machineReport?.machines?.length) {
      rows.push('--- SUẤT SỬ DỤNG MÁY LỌC ---');
      rows.push('Mã máy,Tên máy,Khoa/Phòng,Trạng thái,Tổng ca,Hoàn thành,Đã hủy,Thời gian chạy (giờ),Thời gian chạy (phút)');
      this.machineReport.machines.forEach((m) => {
        rows.push(`"${m.machine_id}","${m.name}","${m.department_name || ''}","${m.status}",${m.session_count},${m.completed_count},${m.cancelled_count},${m.actual_runtime_hours},${m.actual_runtime_minutes}`);
      });
      rows.push('');
    }

    const csvContent = rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BaoCaoLocMau_${this.dateFrom}_${this.dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.messageService.add({
      severity: 'success',
      summary: 'Xuất thành công',
      detail: `Đã tải về file BaoCaoLocMau_${this.dateFrom}_${this.dateTo}.csv`,
    });
  }
}
