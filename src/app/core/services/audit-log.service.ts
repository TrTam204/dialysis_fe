import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditLog, AuditLogFilterParams, PaginatedAuditLogs } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private apiBase = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAuditLogs(filterParams?: AuditLogFilterParams): Observable<PaginatedAuditLogs> {
    let params = new HttpParams();
    if (filterParams) {
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return this.http.get<PaginatedAuditLogs>(`${this.apiBase}/audit-logs/`, { params });
  }

  getAuditLogById(id: number): Observable<AuditLog> {
    return this.http.get<AuditLog>(`${this.apiBase}/audit-logs/${id}/`);
  }
}
