import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { AuditLogService } from '../../core/services/audit-log.service';
import { AuditLog, AuditAction, AuditLogFilterParams } from '../../core/models';

@Component({
  selector: 'app-audit-log-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './audit-log-list.component.html',
  styleUrls: ['./audit-log-list.component.scss'],
})
export class AuditLogListComponent implements OnInit, OnDestroy {
  logs: AuditLog[] = [];
  totalRecords = 0;
  rows = 10;
  first = 0;
  loading = false;

  searchKeyword = '';
  selectedAction: string | null = null;
  selectedEntityType: string | null = null;

  actionOptions = [
    { label: 'Tất cả hành động', value: null },
    { label: 'Tạo mới (CREATE)', value: 'CREATE' },
    { label: 'Cập nhật (UPDATE)', value: 'UPDATE' },
    { label: 'Xóa (DELETE)', value: 'DELETE' },
  ];

  entityTypeOptions = [
    { label: 'Tất cả đối tượng', value: null },
    { label: 'Bệnh nhân (Patient)', value: 'Patient' },
    { label: 'Máy lọc (DialysisMachine)', value: 'DialysisMachine' },
    { label: 'Phiên lọc (DialysisSession)', value: 'DialysisSession' },
    { label: 'Chỉ số sinh tồn (VitalSign)', value: 'VitalSign' },
    { label: 'Mẫu xét nghiệm máu (BloodSample)', value: 'BloodSample' },
    { label: 'Nhân viên (CustomUser)', value: 'CustomUser' },
    { label: 'Khoa/Phòng (Department)', value: 'Department' },
  ];

  displayDetailModal = false;
  selectedLog: AuditLog | null = null;
  viewRawJson = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private auditLogService: AuditLogService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.first = 0;
        this.fetchLogs();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchKeyword);
  }

  onFilterChange(): void {
    this.first = 0;
    this.fetchLogs();
  }

  onRefresh(): void {
    this.fetchLogs();
  }

  loadLogs(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
    this.fetchLogs();
  }

  fetchLogs(): void {
    this.loading = true;
    const page = Math.floor(this.first / this.rows) + 1;
    const params: AuditLogFilterParams = {
      page,
      page_size: this.rows,
    };

    if (this.selectedAction) {
      params.action = this.selectedAction;
    }
    if (this.selectedEntityType) {
      params.entity_type = this.selectedEntityType;
    }
    if (this.searchKeyword && this.searchKeyword.trim()) {
      params.search = this.searchKeyword.trim();
    }

    this.auditLogService
      .getAuditLogs(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.logs = res.results || [];
          this.totalRecords = res.count || 0;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi nạp dữ liệu',
            detail: err?.error?.detail || 'Không thể tải danh sách nhật ký kiểm toán.',
          });
        },
      });
  }

  viewDetails(log: AuditLog): void {
    this.selectedLog = log;
    this.viewRawJson = false;
    this.displayDetailModal = true;
  }

  getActionSeverity(action: AuditAction): 'success' | 'warning' | 'danger' | 'info' {
    switch (action) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'warning';
      case 'DELETE':
        return 'danger';
      default:
        return 'info';
    }
  }

  getRoleSeverity(role: string | null): 'info' | 'warning' | 'secondary' | 'contrast' {
    switch (role) {
      case 'ADMIN':
        return 'contrast';
      case 'DOCTOR':
        return 'info';
      case 'NURSE':
        return 'warning';
      default:
        return 'secondary';
    }
  }

  isUpdateDiff(changes: any): boolean {
    if (!changes || typeof changes !== 'object') {
      return false;
    }
    const keys = Object.keys(changes);
    if (keys.length === 0) {
      return false;
    }
    const firstVal = changes[keys[0]];
    return firstVal && typeof firstVal === 'object' && ('before' in firstVal || 'after' in firstVal);
  }

  getChangeKeys(changes: any): string[] {
    if (!changes || typeof changes !== 'object') {
      return [];
    }
    return Object.keys(changes);
  }

  formatValue(val: any): string {
    if (val === null || val === undefined) {
      return '—';
    }
    if (typeof val === 'boolean') {
      return val ? 'Có (true)' : 'Không (false)';
    }
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  }
}
