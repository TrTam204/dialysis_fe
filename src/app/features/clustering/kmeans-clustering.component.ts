import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { AuthService } from '../../core/services/auth.service';
import { DepartmentService } from '../../core/services/department.service';
import { KMeansService } from '../../core/services/kmeans.service';
import {
  ClusteredPatient,
  ClusterSummary,
  CustomUser,
  Department,
  KMeansResponse,
  PatientClusterFeatures,
} from '../../core/models';

interface SelectOption<T = any> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-kmeans-clustering',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    ChartModule,
    DropdownModule,
    InputNumberModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './kmeans-clustering.component.html',
  styleUrl: './kmeans-clustering.component.scss',
})
export class KMeansClusteringComponent implements OnInit {
  loading = false;
  kValue = 3;
  seed = 42;
  selectedDepartment: number | null = null;
  includeDischarged = false;
  currentUser: CustomUser | null = null;
  isDepartmentLocked = false;

  kOptions: SelectOption<number>[] = [
    { label: '2 cụm (K = 2)', value: 2 },
    { label: '3 cụm (K = 3 - Mặc định)', value: 3 },
    { label: '4 cụm (K = 4)', value: 4 },
    { label: '5 cụm (K = 5)', value: 5 },
  ];

  departmentOptions: SelectOption<number | null>[] = [
    { label: 'Tất cả khoa phòng', value: null },
  ];

  featureOptions: SelectOption<keyof PatientClusterFeatures>[] = [
    { label: 'Kali máu (mEq/L)', value: 'avg_potassium' },
    { label: 'Siêu lọc UF (Lít)', value: 'avg_uf' },
    { label: 'Hemoglobin (g/dL)', value: 'avg_hemoglobin' },
    { label: 'Tuổi (năm)', value: 'age' },
  ];

  xAxisFeature: keyof PatientClusterFeatures = 'avg_potassium';
  yAxisFeature: keyof PatientClusterFeatures = 'avg_uf';

  result: KMeansResponse | null = null;
  selectedClusterFilter: number | null = null;

  scatterChartData: any = null;
  scatterChartOptions: any = null;

  barChartData: any = null;
  barChartOptions: any = null;

  readonly clusterColors = [
    { bg: 'rgba(59, 130, 246, 0.7)', border: '#2563eb' }, // Blue
    { bg: 'rgba(16, 185, 129, 0.7)', border: '#059669' }, // Green
    { bg: 'rgba(245, 158, 11, 0.7)', border: '#d97706' }, // Amber
    { bg: 'rgba(139, 92, 246, 0.7)', border: '#7c3aed' }, // Purple
    { bg: 'rgba(236, 72, 153, 0.7)', border: '#db2777' }, // Pink
  ];

  constructor(
    private kmeansService: KMeansService,
    private departmentService: DepartmentService,
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    const userRole = this.currentUser?.role;

    if (userRole === 'DOCTOR' || userRole === 'NURSE') {
      this.selectedDepartment = this.currentUser?.department || null;
      this.isDepartmentLocked = true;
    } else {
      this.isDepartmentLocked = false;
    }

    this.initChartOptions();
    this.loadDepartments();
    this.runClustering();
  }

  loadDepartments(): void {
    this.departmentService.getAll().subscribe({
      next: (res: any) => {
        const depts: Department[] = Array.isArray(res) ? res : res?.results || [];
        const list = depts.map((d) => ({
          label: `${d.name} (${d.code})`,
          value: d.id ?? null,
        }));
        if (this.isDepartmentLocked && this.selectedDepartment) {
          const userDept = depts.find((d) => d.id === this.selectedDepartment);
          this.departmentOptions = userDept
            ? [{ label: `${userDept.name} (${userDept.code})`, value: userDept.id ?? null }]
            : list;
        } else {
          this.departmentOptions = [
            { label: 'Tất cả khoa phòng', value: null },
            ...list,
          ];
        }
      },
      error: () => {
        // Non-blocking department loading
      },
    });
  }

  runClustering(): void {
    this.loading = true;
    this.kmeansService
      .getClusters(
        this.kValue,
        this.selectedDepartment,
        this.seed,
        this.includeDischarged
      )
      .subscribe({
        next: (res) => {
          this.result = res;
          this.loading = false;
          this.buildScatterChart();
          this.buildBarChart();
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: `Phân cụm hoàn tất: K = ${res.k_value}, ${res.patients?.length ?? 0} bệnh nhân, ${res.iterations} vòng lặp.`,
          });
        },
        error: (err) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err?.error?.detail || 'Không thể thực thi phân cụm K-Means.',
          });
        },
      });
  }

  onAxisChange(): void {
    if (this.result) {
      this.buildScatterChart();
    }
  }

  getFilteredPatients(): ClusteredPatient[] {
    if (!this.result?.patients) {
      return [];
    }
    if (this.selectedClusterFilter === null) {
      return this.result.patients;
    }
    return this.result.patients.filter(
      (p) => p.cluster_id === this.selectedClusterFilter
    );
  }

  private initChartOptions(): void {
    this.scatterChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { size: 12 },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const raw = ctx.raw;
              if (raw?.patient) {
                return `${raw.patient.full_name} (${raw.patient.patient_id}): X=${raw.x}, Y=${raw.y}`;
              }
              return `Tâm cụm: X=${raw.x}, Y=${raw.y}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: this.getFeatureLabel(this.xAxisFeature),
            font: { weight: 'bold' },
          },
          grid: { color: '#f1f5f9' },
        },
        y: {
          title: {
            display: true,
            text: this.getFeatureLabel(this.yAxisFeature),
            font: { weight: 'bold' },
          },
          grid: { color: '#f1f5f9' },
        },
      },
    };

    this.barChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { size: 12 },
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Giá trị trung bình lâm sàng',
          },
          grid: { color: '#f1f5f9' },
        },
      },
    };
  }

  private buildScatterChart(): void {
    if (!this.result?.patients || !this.result?.denormalized_centroids) {
      this.scatterChartData = null;
      return;
    }

    const xKey = this.xAxisFeature;
    const yKey = this.yAxisFeature;

    const datasets: any[] = [];
    const k = this.result.k_value;

    // 1. One scatter dataset for each cluster
    for (let c = 0; c < k; c++) {
      const clusterPts = this.result.patients.filter((p) => p.cluster_id === c);
      const color = this.clusterColors[c % this.clusterColors.length];

      datasets.push({
        type: 'scatter',
        label: `Cụm ${c + 1} (${clusterPts.length} BN)`,
        data: clusterPts.map((p) => ({
          x: p.features[xKey],
          y: p.features[yKey],
          patient: p,
        })),
        backgroundColor: color.bg,
        borderColor: color.border,
        pointRadius: 6,
        pointHoverRadius: 9,
      });
    }

    // 2. Centroids dataset (Red triangles)
    const centroidPoints = this.result.denormalized_centroids.map((c) => ({
      x: c[xKey],
      y: c[yKey],
    }));

    datasets.push({
      type: 'scatter',
      label: 'Tâm cụm (Centroids)',
      data: centroidPoints,
      backgroundColor: '#ef4444',
      borderColor: '#991b1b',
      borderWidth: 2,
      pointRadius: 11,
      pointStyle: 'triangle',
      pointHoverRadius: 14,
    });

    this.scatterChartData = { datasets };

    // Update axes titles dynamically
    if (this.scatterChartOptions?.scales) {
      this.scatterChartOptions.scales.x.title.text = this.getFeatureLabel(xKey);
      this.scatterChartOptions.scales.y.title.text = this.getFeatureLabel(yKey);
    }
  }

  private buildBarChart(): void {
    if (!this.result?.denormalized_centroids) {
      this.barChartData = null;
      return;
    }

    const labels = [
      'Tuổi (năm)',
      'Hemoglobin (g/dL)',
      'Kali máu (mEq/L)',
      'Siêu lọc UF (L)',
    ];

    const datasets = this.result.denormalized_centroids.map((centroid, idx) => {
      const color = this.clusterColors[idx % this.clusterColors.length];
      return {
        label: `Cụm ${idx + 1}`,
        data: [
          centroid.age,
          centroid.avg_hemoglobin,
          centroid.avg_potassium,
          centroid.avg_uf,
        ],
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 1,
      };
    });

    this.barChartData = {
      labels,
      datasets,
    };
  }

  getFeatureLabel(key: keyof PatientClusterFeatures): string {
    const opt = this.featureOptions.find((f) => f.value === key);
    return opt ? opt.label : key;
  }

  getRiskSeverity(level: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (level) {
      case 'LOW':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'HIGH':
        return 'danger';
      default:
        return 'info';
    }
  }

  getSilhouetteQuality(score: number): {
    text: string;
    severity: 'success' | 'warning' | 'danger';
  } {
    if (score >= 0.5) {
      return { text: 'Cấu trúc cụm tốt (Chặt chẽ & Phân tách rõ)', severity: 'success' };
    }
    if (score >= 0.2) {
      return { text: 'Cấu trúc cụm trung bình (Chấp nhận được)', severity: 'warning' };
    }
    return { text: 'Cấu trúc cụm yếu (Các cụm có độ chồng lấn)', severity: 'danger' };
  }

  viewPatient(patientId: string): void {
    this.router.navigate(['/patients', patientId]);
  }
}
