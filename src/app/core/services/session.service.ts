import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DialysisSession } from '../models';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private apiBase = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/sessions/`, { params });
  }

  getById(sessionId: string): Observable<DialysisSession> {
    return this.http.get<DialysisSession>(`${this.apiBase}/sessions/${sessionId}/`);
  }

  create(data: DialysisSession): Observable<DialysisSession> {
    return this.http.post<DialysisSession>(`${this.apiBase}/sessions/`, data);
  }

  update(sessionId: string, data: DialysisSession): Observable<DialysisSession> {
    return this.http.put<DialysisSession>(`${this.apiBase}/sessions/${sessionId}/`, data);
  }

  patch(sessionId: string, data: Partial<DialysisSession>): Observable<DialysisSession> {
    return this.http.patch<DialysisSession>(`${this.apiBase}/sessions/${sessionId}/`, data);
  }

  delete(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/sessions/${sessionId}/`);
  }
}
