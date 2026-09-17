import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { SessionService } from '../../core/services/session.service';
import { MachineService } from '../../core/services/machine.service';
import { StaffService } from '../../core/services/staff.service';
import { CustomUser, DialysisMachine, DialysisSession } from '../../core/models';
import { ScheduleDayComponent } from './components/schedule-day/schedule-day.component';
import { ScheduleWeekComponent } from './components/schedule-week/schedule-week.component';

type ScheduleViewMode = 'day' | 'week';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DropdownModule,
    ScheduleDayComponent,
    ScheduleWeekComponent,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent implements OnInit, OnDestroy {
  viewMode: ScheduleViewMode = 'day';
  selectedDate = new Date();
  scheduleSessions: DialysisSession[] = [];
  machines: DialysisMachine[] = [];
  nurses: CustomUser[] = [];
  loading = false;
  error: string | null = null;

  statusFilter: string | null = null;
  machineFilter: string | null = null;
  nurseFilter: string | null = null;

  statusOptions = [
    { label: 'Tất cả trạng thái', value: null },
    { label: 'Đã lên lịch', value: 'SCHEDULED' },
    { label: 'Đang thực hiện', value: 'IN_PROGRESS' },
    { label: 'Hoàn thành', value: 'COMPLETED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];

  machineOptions: Array<{ label: string; value: string | null }> = [{ label: 'Tất cả máy', value: null }];
  nurseOptions: Array<{ label: string; value: number | null }> = [{ label: 'Tất cả điều dưỡng', value: null }];

  private destroy$ = new Subject<void>();
  private refreshTrigger$ = new Subject<void>();
  private requestToken = 0;

  constructor(
    private sessionService: SessionService,
    private machineService: MachineService,
    private staffService: StaffService,
  ) {}

  ngOnInit(): void {
    this.loadReferenceData();

    this.refreshTrigger$
      .pipe(
        switchMap(() => this.loadScheduleData()),
        takeUntil(this.destroy$),
      )
      .subscribe();

    this.refreshTrigger$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentRangeLabel(): string {
    if (this.viewMode === 'day') {
      return this.formatDayLabel(this.selectedDate);
    }

    const weekRange = this.getWeekRange(this.selectedDate);
    const startLabel = this.formatDayLabel(weekRange.start);
    const endLabel = this.formatDayLabel(weekRange.end);
    return `${startLabel} - ${endLabel}`;
  }

  previousPeriod(): void {
    const delta = this.viewMode === 'day' ? -1 : -7;
    this.selectedDate = this.addDays(this.selectedDate, delta);
    this.refreshTrigger$.next();
  }

  nextPeriod(): void {
    const delta = this.viewMode === 'day' ? 1 : 7;
    this.selectedDate = this.addDays(this.selectedDate, delta);
    this.refreshTrigger$.next();
  }

  goToToday(): void {
    this.selectedDate = new Date();
    this.refreshTrigger$.next();
  }

  setViewMode(mode: ScheduleViewMode): void {
    this.viewMode = mode;
    this.refreshTrigger$.next();
  }

  resetFilters(): void {
    this.statusFilter = null;
    this.machineFilter = null;
    this.nurseFilter = null;
    this.refreshTrigger$.next();
  }

  onFilterChange(): void {
    this.refreshTrigger$.next();
  }

  private fetchAllPages<T>(requestFactory: (params: Record<string, string | number | null>) => Observable<any>, baseParams: Record<string, string | number | null> = {}): Observable<T[]> {
    return new Observable<T[]>((observer) => {
      const collected: T[] = [];
      let currentPage = 1;
      let cancelled = false;

      const loadNextPage = () => {
        if (cancelled) {
          return;
        }

        const params = { ...baseParams, page: currentPage };
        requestFactory(params).subscribe({
          next: (response) => {
            const pageItems = response?.results ?? response ?? [];
            collected.push(...pageItems);

            if (response && response.next) {
              currentPage += 1;
              loadNextPage();
              return;
            }

            observer.next(collected);
            observer.complete();
          },
          error: (error) => {
            if (!cancelled) {
              observer.error(error);
            }
          },
        });
      };

      loadNextPage();

      return () => {
        cancelled = true;
      };
    });
  }

  private loadReferenceData(): void {
    this.fetchAllPages<DialysisMachine>((params) => this.machineService.getAll(params), {})
      .pipe(
        map((items) => (items ?? []).sort((a, b) => a.name.localeCompare(b.name, 'vi'))),
        catchError(() => {
          this.machineOptions = [{ label: 'Tất cả máy', value: null }];
          return of([] as DialysisMachine[]);
        }),
      )
      .subscribe((items) => {
        this.machines = items;
        this.machineOptions = [{ label: 'Tất cả máy', value: null }, ...items.map((machine) => ({ label: machine.name, value: machine.machine_id }))];
      });

    this.fetchAllPages<CustomUser>((params) => this.staffService.getAll({ ...params, role: 'NURSE' }), {})
      .pipe(
        map((items) => (items ?? []).sort((a, b) => `${a.last_name ?? ''} ${a.first_name ?? ''}`.localeCompare(`${b.last_name ?? ''} ${b.first_name ?? ''}`, 'vi'))),
        catchError(() => {
          this.nurseOptions = [{ label: 'Tất cả điều dưỡng', value: null }];
          return of([] as CustomUser[]);
        }),
      )
      .subscribe((items) => {
        this.nurses = items;
        this.nurseOptions = [{ label: 'Tất cả điều dưỡng', value: null }, ...items.map((nurse) => ({ label: this.getUserDisplayName(nurse), value: nurse.id ?? null }))];
      });
  }

  private loadScheduleData(): Observable<void> {
    const requestId = ++this.requestToken;
    this.loading = true;
    this.error = null;

    const params = this.buildSessionQueryParams();

    return this.fetchAllPages<DialysisSession>((pageParams) => this.sessionService.getAll(pageParams), params).pipe(
      map((items) => {
        if (requestId !== this.requestToken) {
          return;
        }

        this.scheduleSessions = (items ?? []).sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
        this.loading = false;
      }),
      catchError(() => {
        if (requestId === this.requestToken) {
          this.scheduleSessions = [];
          this.error = 'Không thể tải lịch lọc máu.';
          this.loading = false;
        }
        return of(undefined);
      }),
      map(() => undefined),
    );
  }

  private buildSessionQueryParams(): Record<string, string | number | null> {
    const params: Record<string, string | number | null> = {
      ordering: 'scheduled_start',
    };

    if (this.viewMode === 'day') {
      params['date'] = this.formatLocalDate(this.selectedDate);
    } else {
      const range = this.getWeekRange(this.selectedDate);
      params['date_from'] = this.formatLocalDateTime(range.start);
      params['date_to'] = this.formatLocalDateTime(range.end);
    }

    if (this.statusFilter) {
      params['status'] = this.statusFilter;
    }
    if (this.machineFilter) {
      params['machine'] = this.machineFilter;
    }
    if (this.nurseFilter) {
      params['assigned_nurse'] = this.nurseFilter;
    }

    return params;
  }

  private getUserDisplayName(user: CustomUser): string {
    const fullName = `${user.last_name ?? ''} ${user.first_name ?? ''}`.trim();
    return fullName || user.username;
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatLocalDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private formatDayLabel(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private getWeekRange(date: Date): { start: Date; end: Date } {
    const current = new Date(date);
    const day = current.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(current);
    start.setHours(0, 0, 0, 0);
    start.setDate(current.getDate() + diffToMonday);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }
}
