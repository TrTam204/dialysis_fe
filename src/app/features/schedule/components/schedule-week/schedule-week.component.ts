import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DialysisSession } from '../../../../core/models';

@Component({
  selector: 'app-schedule-week',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './schedule-week.component.html',
  styleUrl: './schedule-week.component.scss',
})
export class ScheduleWeekComponent {
  @Input() sessions: DialysisSession[] = [];
  @Input() selectedDate = new Date();

  get weekDays(): Date[] {
    return Array.from({ length: 7 }, (_, index) => this.getDateForDay(index));
  }

  get displayedMachines(): string[] {
    return [...new Set(this.sessions.map((session) => session.machine_name || session.machine))];
  }

  getSessionForDayAndMachine(day: Date, machineName: string): DialysisSession[] {
    return this.sessions
      .filter((session) => (session.machine_name || session.machine) === machineName)
      .filter((session) => this.matchesDay(session, day))
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
  }

  getSessionsForDay(day: Date): DialysisSession[] {
    return [...this.sessions]
      .filter((session) => this.matchesDay(session, day))
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
  }

  hasSessionsForDay(day: Date): boolean {
    return this.getSessionsForDay(day).length > 0;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'status-scheduled',
      IN_PROGRESS: 'status-in-progress',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
    };
    return map[status] ?? 'status-default';
  }

  formatDayLabel(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: '2-digit',
    }).format(date);
  }

  formatShortDate(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  }

  private matchesDay(session: DialysisSession, day: Date): boolean {
    const start = new Date(session.scheduled_start);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return start >= dayStart && start <= dayEnd;
  }

  private getDateForDay(offset: number): Date {
    const monday = this.getWeekStart(this.selectedDate);
    const date = new Date(monday);
    date.setDate(monday.getDate() + offset);
    return date;
  }

  private getWeekStart(date: Date): Date {
    const copy = new Date(date);
    const day = copy.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diffToMonday);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
}
