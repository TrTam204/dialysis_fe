import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import {
  CustomUser,
  Department,
  TopsisAlternativeRanking,
  TopsisCriterion,
  TopsisRankResponse,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentService } from '../../core/services/department.service';
import { TopsisService } from '../../core/services/topsis.service';

interface WeightItem {
  code: string;
  name: string;
  weight: number;
  type: 'benefit' | 'cost';
  unit: string;
}

@Component({
  selector: 'app-topsis-triage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    ProgressBarModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './topsis-triage.component.html',
  styleUrls: ['./topsis-triage.component.scss'],
})
export class TopsisTriageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  loadingCriteria = false;
  loadingRanking = false;
  hasCalculated = false;
  errorMessage = '';

  // Auth & Department Scope
  currentUser: CustomUser | null = null;
  userRole: string | null = null;
  departments: Department[] = [];
  departmentOptions: { label: string; value: number | null }[] = [];
  selectedDepartmentId: number | null = null;
  isDepartmentLocked = false;

  // Criteria & Weights
  criteria: TopsisCriterion[] = [];
  defaultWeights: Record<string, number> = {
    C1: 0.30,
    C2: 0.20,
    C3: 0.25,
    C4: 0.15,
    C5: 0.10,
  };
  customWeights: Record<string, number> = { ...this.defaultWeights };
  editableWeights: WeightItem[] = [];
  showWeightModal = false;

  // Ranking Results
  rankResponse: TopsisRankResponse | null = null;
  rankings: TopsisAlternativeRanking[] = [];
  idealPositive: number[] = [];
  idealNegative: number[] = [];

  // Explain Modal
  showExplainModal = false;
  selectedAlternative: TopsisAlternativeRanking | null = null;
  vectorNorms: number[] = [];

  constructor(
    private topsisService: TopsisService,
    private departmentService: DepartmentService,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.userRole = this.currentUser?.role || null;

    // RBAC department initialization
    if (this.userRole === 'DOCTOR' || this.userRole === 'NURSE') {
      this.selectedDepartmentId = this.currentUser?.department || null;
      this.isDepartmentLocked = true;
    } else {
      this.selectedDepartmentId = null; // Admin can view all or filter
      this.isDepartmentLocked = false;
    }

    this.loadDepartments();
    this.loadCriteria();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDepartments(): void {
    this.departmentService
      .getAll({ is_active: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const items: Department[] = res?.results ?? res ?? [];
          this.departments = items;
          this.departmentOptions = [
            { label: 'Toàn trung tâm (Tất cả khoa)', value: null },
            ...items.map((d) => ({ label: d.name, value: d.id ?? null })),
          ];
        },
        error: () => {
          // Fallback if department endpoint fails
        },
      });
  }

  loadCriteria(): void {
    this.loadingCriteria = true;
    this.topsisService
      .getCriteria()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loadingCriteria = false;
          this.criteria = res.criteria;
          this.initEditableWeights();
          // Auto calculate initial ranking once criteria are loaded
          this.calculateRanking();
        },
        error: (err) => {
          this.loadingCriteria = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi tải tiêu chí',
            detail: err?.error?.detail || 'Không thể tải cấu hình tiêu chí TOPSIS.',
          });
        },
      });
  }

  private initEditableWeights(): void {
    this.editableWeights = this.criteria.map((c) => ({
      code: c.code,
      name: c.name,
      weight: this.customWeights[c.code] ?? c.weight,
      type: c.type,
      unit: c.unit,
    }));
  }

  calculateRanking(): void {
    this.loadingRanking = true;
    this.errorMessage = '';

    const payload = {
      department: this.selectedDepartmentId,
      custom_weights: this.customWeights,
    };

    this.topsisService
      .rank(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loadingRanking = false;
          this.hasCalculated = true;
          this.rankResponse = res;
          this.rankings = res.rankings;
          this.idealPositive = res.ideal_positive;
          this.idealNegative = res.ideal_negative;
          this.calculateVectorNorms();

          this.messageService.add({
            severity: 'success',
            summary: 'Xếp hạng thành công',
            detail: `Đã phân loại ${res.total_patients} bệnh nhân theo độ ưu tiên TOPSIS.`,
          });
        },
        error: (err) => {
          this.loadingRanking = false;
          this.hasCalculated = true;
          this.errorMessage =
            err?.error?.detail ||
            err?.error?.message ||
            'Không thể tính toán xếp hạng TOPSIS cho dữ liệu hiện tại.';
          this.rankings = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi tính toán',
            detail: this.errorMessage,
          });
        },
      });
  }

  private calculateVectorNorms(): void {
    // Calculate Euclidean column norms: norm_j = sqrt(sum(x_kj^2))
    if (!this.rankings || this.rankings.length === 0) {
      this.vectorNorms = [];
      return;
    }
    const numCriteria = this.criteria.length;
    const norms = new Array(numCriteria).fill(0);
    for (const alt of this.rankings) {
      for (let j = 0; j < numCriteria; j++) {
        const val = alt.raw_values[j] ?? 0;
        norms[j] += val * val;
      }
    }
    this.vectorNorms = norms.map((s) => Math.sqrt(s));
  }

  openWeightModal(): void {
    this.initEditableWeights();
    this.showWeightModal = true;
  }

  get totalEditableWeight(): number {
    return this.editableWeights.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
  }

  applyWeights(): void {
    const total = this.totalEditableWeight;
    if (total <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Trọng số không hợp lệ',
        detail: 'Tổng trọng số phải lớn hơn 0.',
      });
      return;
    }

    const newWeights: Record<string, number> = {};
    for (const item of this.editableWeights) {
      newWeights[item.code] = Number(item.weight);
    }
    this.customWeights = newWeights;
    this.showWeightModal = false;
    this.calculateRanking();
  }

  resetWeights(): void {
    this.customWeights = { ...this.defaultWeights };
    this.initEditableWeights();
  }

  openExplainModal(alt: TopsisAlternativeRanking): void {
    this.selectedAlternative = alt;
    this.showExplainModal = true;
  }

  getScoreSeverity(score: number): 'danger' | 'warning' | 'info' | 'success' {
    if (score >= 0.6) return 'warning';
    if (score >= 0.4) return 'info';
    return 'success';
  }

  getScoreLabel(score: number): string {
    if (score >= 0.6) return 'Thứ hạng ưu tiên cao trong mô hình';
    if (score >= 0.4) return 'Thứ hạng trung bình trong mô hình';
    return 'Thứ hạng thấp hơn trong mô hình';
  }

  getRankBadgeClass(rank: number): string {
    if (rank === 1) return 'rank-badge rank-first';
    if (rank === 2) return 'rank-badge rank-second';
    if (rank === 3) return 'rank-badge rank-third';
    return 'rank-badge rank-normal';
  }

  getNormalizedValue(colIdx: number, rawVal: number): number {
    const norm = this.vectorNorms[colIdx] || 0;
    if (norm === 0) return 0;
    return rawVal / norm;
  }

  getWeightedValue(colIdx: number, rawVal: number, criterionCode: string): number {
    const r = this.getNormalizedValue(colIdx, rawVal);
    const w = this.customWeights[criterionCode] ?? 0.2;
    return r * w;
  }
}
