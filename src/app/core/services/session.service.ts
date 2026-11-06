import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DialysisSession, IdhPredictionResponse, LstmModelInfoResponse } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private apiBase = environment.apiUrl;

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

  update(sessionId: string, data: DialysisSession | Partial<DialysisSession>): Observable<DialysisSession> {
    return this.http.put<DialysisSession>(`${this.apiBase}/sessions/${sessionId}/`, data);
  }

  patch(sessionId: string, data: Partial<DialysisSession>): Observable<DialysisSession> {
    return this.http.patch<DialysisSession>(`${this.apiBase}/sessions/${sessionId}/`, data);
  }

  delete(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/sessions/${sessionId}/`);
  }

  getIdhPrediction(sessionId: string): Observable<IdhPredictionResponse> {
    return this.http.get<IdhPredictionResponse>(`${this.apiBase}/sessions/${sessionId}/idh-prediction/`);
  }

  getLstmModelInfo(): Observable<LstmModelInfoResponse> {
    return this.http.get<LstmModelInfoResponse>(`${this.apiBase}/ai/lstm-model-info/`);
  }

  triggerSos(sessionId: string, reason: string, notes?: string): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/sessions/${sessionId}/sos/`, { reason, notes });
  }

  clearSos(sessionId: string): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/sessions/${sessionId}/clear-sos/`, {});
  }
}
