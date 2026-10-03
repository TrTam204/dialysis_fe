import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { SchedulePlanService } from '../../core/services/schedule-plan.service';
import { AuthService } from '../../core/services/auth.service';
import { ScheduleAssignment, SchedulePlan, SchedulePlanStatus, ShiftType } from '../../core/models';

@Component({
  selector: 'app-schedule-plan-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonModule,
    TagModule,
    TableModule,
    ToastModule,
    DialogModule,
    InputTextareaModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  templateUrl: './schedule-plan-detail.component.html',
  styleUrls: ['./schedule-plan-detail.component.scss'],
})
export class SchedulePlanDetailComponent implements OnInit {
  plan: SchedulePlan | null = null;
  assignments: ScheduleAssignment[] = [];
  loading = false;
  assignmentsLoading = false;
  actionLoading = false;

  canApproveOrReject = false;

  rejectDialogVisible = false;
  rejectionReason = '';
  rejectionError = '';

  approvalWarnings: string[] = [];
  approvalErrors: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private schedulePlanService: SchedulePlanService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.canApproveOrReject = this.authService.hasRole(['ADMIN', 'DOCTOR']);

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const planId = parseInt(idParam, 10);
      if (!isNaN(planId)) {
        this.loadPlan(planId);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Mã kế hoạch không hợp lệ.',
        });
      }
    }
  }

  loadPlan(planId: number): void {
    this.loading = true;
    this.schedulePlanService.getById(planId).subscribe({
      next: (plan: SchedulePlan) => {
        this.plan = plan;
        this.loading = false;
        this.loadAssignments(planId);
      },
      error: () => {
        this.loading = false;
        this.plan = null;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không tìm thấy kế hoạch tuần được yêu cầu.',
        });
      },
    });
  }

  loadAssignments(planId: number): void {
    this.assignmentsLoading = true;
    this.schedulePlanService.getAssignments({ schedule_plan: planId, page_size: 200 }).subscribe({
      next: (res: any) => {
        this.assignments = res?.results ?? res ?? [];
        this.assignmentsLoading = false;
      },
      error: () => {
        this.assignments = [];
        this.assignmentsLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể tải danh sách phân ca.',
        });
      },
    });
  }

  approvePlan(): void {
    if (!this.plan || !this.plan.id) return;

    this.confirmationService.confirm({
      header: 'Xác nhận phê duyệt kế hoạch',
      message: `Bạn có chắc chắn muốn phê duyệt kế hoạch "${this.plan.name}"? Hệ thống sẽ tự động tạo các phiên lọc máu (DialysisSession) tương ứng cho toàn bộ phân ca hợp lệ.`,
      icon: 'pi pi-check-circle',
      acceptLabel: 'Phê duyệt',
      rejectLabel: 'Hủy bỏ',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => {
        this.executeApprove();
      },
    });
  }

  private executeApprove(): void {
    if (!this.plan || !this.plan.id) return;
    this.actionLoading = true;
    this.approvalWarnings = [];
    this.approvalErrors = [];

    this.schedulePlanService.approve(this.plan.id).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        if (res?.plan) {
          this.plan = res.plan;
        } else {
          this.plan = { ...this.plan!, status: 'APPROVED' };
        }
        this.approvalWarnings = res?.warnings || [];

        const createdCount = res?.created_sessions_count ?? 0;
        this.messageService.add({
          severity: 'success',
          summary: 'Phê duyệt thành công',
          detail: res?.detail || `Đã phê duyệt kế hoạch và khởi tạo ${createdCount} phiên lọc máu.`,
        });

        if (this.plan?.id) {
          this.loadAssignments(this.plan.id);
        }
      },
      error: (err: any) => {
        this.actionLoading = false;
        const extractedErrors = this.extractErrors(err);
        this.approvalErrors = extractedErrors;

        this.messageService.add({
          severity: 'error',
          summary: 'Phê duyệt thất bại',
          detail:
            extractedErrors.length > 0
              ? 'Kế hoạch không đáp ứng đủ các ràng buộc phê duyệt. Vui lòng kiểm tra chi tiết lỗi bên dưới.'
              : 'Đã xảy ra lỗi khi phê duyệt kế hoạch.',
        });
      },
    });
  }

  openRejectDialog(): void {
    this.rejectionReason = '';
    this.rejectionError = '';
    this.rejectDialogVisible = true;
  }

  confirmReject(): void {
    const trimmed = this.rejectionReason.trim();
    if (!trimmed) {
      this.rejectionError = 'Lý do từ chối không được để trống.';
      return;
    }

    if (!this.plan || !this.plan.id) return;
    this.actionLoading = true;
    this.rejectionError = '';

    this.schedulePlanService.reject(this.plan.id, trimmed).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        this.rejectDialogVisible = false;
        if (res?.plan) {
          this.plan = res.plan;
        } else {
          this.plan = {
            ...this.plan!,
            status: 'REJECTED',
            rejection_reason: trimmed,
          };
        }

        this.messageService.add({
          severity: 'info',
          summary: 'Đã từ chối',
          detail: res?.detail || 'Kế hoạch tuần đã bị từ chối.',
        });
      },
      error: (err: any) => {
        this.actionLoading = false;
        const extractedErrors = this.extractErrors(err);
        this.rejectionError =
          extractedErrors.length > 0
            ? extractedErrors.join('; ')
            : 'Đã xảy ra lỗi khi từ chối kế hoạch.';
      },
    });
  }

  private extractErrors(err: any): string[] {
    const errBody = err?.error;
    if (!errBody) return ['Lỗi kết nối máy chủ hoặc máy chủ không phản hồi.'];

    if (Array.isArray(errBody.errors)) {
      return errBody.errors.map((e: any) => (typeof e === 'string' ? e : JSON.stringify(e)));
    }
    if (typeof errBody.detail === 'string') {
      return [errBody.detail];
    }
    if (typeof errBody.error === 'string') {
      return [errBody.error];
    }
    if (Array.isArray(errBody.error)) {
      return errBody.error;
    }
    if (typeof errBody === 'string') {
      return [errBody];
    }
    if (typeof errBody === 'object') {
      const results: string[] = [];
      for (const key of Object.keys(errBody)) {
        const val = errBody[key];
        if (Array.isArray(val)) {
          results.push(`${key}: ${val.join(', ')}`);
        } else if (typeof val === 'string') {
          results.push(`${key}: ${val}`);
        } else {
          results.push(`${key}: ${JSON.stringify(val)}`);
        }
      }
      if (results.length > 0) return results;
    }
    return ['Đã xảy ra lỗi không xác định từ hệ thống.'];
  }

  getStatusSeverity(status: SchedulePlanStatus): 'warning' | 'success' | 'danger' | 'info' {
    switch (status) {
      case 'PROPOSED':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      default:
        return 'info';
    }
  }

  getStatusLabel(status: SchedulePlanStatus): string {
    switch (status) {
      case 'PROPOSED':
        return 'Chờ duyệt';
      case 'APPROVED':
        return 'Đã duyệt';
      case 'REJECTED':
        return 'Từ chối';
      default:
        return status;
    }
  }

  getShiftLabel(shift: ShiftType | string): string {
    switch (shift) {
      case 'SHIFT_1':
        return 'Ca 1';
      case 'SHIFT_2':
        return 'Ca 2';
      case 'SHIFT_3':
        return 'Ca 3';
      default:
        return shift;
    }
  }

  getSourceSeverity(source: string): 'info' | 'warning' | 'success' {
    return source === 'GA' ? 'info' : 'warning';
  }

  getSourceLabel(source: string): string {
    return source === 'GA' ? 'GA' : 'Thủ công';
  }
}
