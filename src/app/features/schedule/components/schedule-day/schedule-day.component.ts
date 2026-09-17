import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DialysisSession } from '../../../../core/models';

@Component({
  selector: 'app-schedule-day',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './schedule-day.component.html',
  styleUrl: './schedule-day.component.scss',
})
export class ScheduleDayComponent {
  @Input() sessions: DialysisSession[] = [];
  @Input() selectedDate = new Date();

  readonly dayStartHour = 6;
  readonly dayEndHour = 22;

  get mobileSessions(): DialysisSession[] {
    return [...this.sessions].sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
  }

  get uniqueMachines(): string[] {
    return [...new Set(this.sessions.map((session) => session.machine_name || session.machine))];
  }

  getMachineSessions(machineKey: string): DialysisSession[] {
    return this.sessions
      .filter((session) => (session.machine_name || session.machine) === machineKey)
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
  }

  getSessionStyle(session: DialysisSession): Record<string, string> {
    const dayStart = this.getDateAtHour(this.dayStartHour);
    const start = new Date(session.scheduled_start);
    const end = new Date(session.scheduled_end);
    const startMinutes = Math.max(0, (start.getTime() - dayStart.getTime()) / 60000);
    const endMinutes = Math.min((this.dayEndHour - this.dayStartHour) * 60, (end.getTime() - dayStart.getTime()) / 60000);
    const top = (startMinutes / ((this.dayEndHour - this.dayStartHour) * 60)) * 100;
    const height = Math.max(((endMinutes - startMinutes) / ((this.dayEndHour - this.dayStartHour) * 60)) * 100, 7);

    return {
      top: `${top}%`,
      height: `${Math.max(height, 7)}%`,
    };
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

  getTimeRangeLabel(session: DialysisSession): string {
    return `${this.formatHour(session.scheduled_start)} - ${this.formatHour(session.scheduled_end)}`;
  }

  formatDateHeader(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  }

  private getDateAtHour(hour: number): Date {
    const value = new Date(this.selectedDate);
    value.setHours(hour, 0, 0, 0);
    return value;
  }

  private formatHour(dateValue: string): string {
    const date = new Date(dateValue);
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
