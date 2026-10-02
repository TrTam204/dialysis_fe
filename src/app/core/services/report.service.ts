import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MachineUtilizationReport, OperationalSummaryReport } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private apiBase = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getOperationalSummary(dateFrom?: string, dateTo?: string): Observable<OperationalSummaryReport> {
    let params = new HttpParams();
    if (dateFrom) {
      params = params.set('date_from', dateFrom);
    }
    if (dateTo) {
      params = params.set('date_to', dateTo);
    }
    return this.http.get<OperationalSummaryReport>(`${this.apiBase}/reports/operational-summary/`, { params });
  }

  getMachineUtilization(dateFrom?: string, dateTo?: string): Observable<MachineUtilizationReport> {
    let params = new HttpParams();
    if (dateFrom) {
      params = params.set('date_from', dateFrom);
    }
    if (dateTo) {
      params = params.set('date_to', dateTo);
    }
    return this.http.get<MachineUtilizationReport>(`${this.apiBase}/reports/machine-utilization/`, { params });
  }
}
