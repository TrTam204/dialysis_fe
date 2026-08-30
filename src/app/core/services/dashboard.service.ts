import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardSummary, DialysisSessionStats, MachineStats } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiBase = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  /**
   * Note: Dashboard endpoints may not exist yet in Phase 1.
   * For now, we'll construct summary from individual entity calls.
   */
  getSummary(): Observable<DashboardSummary> {
    // Placeholder - backend should implement /api/dashboard/summary/
    return this.http.get<DashboardSummary>(`${this.apiBase}/dashboard/summary/`);
  }

  getDialysisStats(): Observable<DialysisSessionStats[]> {
    // Placeholder - backend should implement /api/dashboard/dialysis-stats/
    return this.http.get<DialysisSessionStats[]>(`${this.apiBase}/dashboard/dialysis-stats/`);
  }

  getMachineStats(): Observable<MachineStats[]> {
    // Placeholder - backend should implement /api/dashboard/machine-stats/
    return this.http.get<MachineStats[]>(`${this.apiBase}/dashboard/machine-stats/`);
  }
}
