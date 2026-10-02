import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardSummary, DialysisSessionStats, MachineStats } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiBase = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiBase}/dashboard/summary/`);
  }

  getDialysisStats(days?: number, dateFrom?: string, dateTo?: string): Observable<DialysisSessionStats[]> {
    let params = new HttpParams();
    if (dateFrom && dateTo) {
      params = params.set('date_from', dateFrom).set('date_to', dateTo);
    } else if (days) {
      params = params.set('days', days.toString());
    }
    return this.http.get<DialysisSessionStats[]>(`${this.apiBase}/dashboard/dialysis-stats/`, { params });
  }

  getMachineStats(): Observable<MachineStats[]> {
    return this.http.get<MachineStats[]>(`${this.apiBase}/dashboard/machine-stats/`);
  }
}
