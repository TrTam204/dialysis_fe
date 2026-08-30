import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VitalSign } from '../models';

@Injectable({
  providedIn: 'root',
})
export class VitalSignService {
  private apiBase = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // Get vitals for a specific session (nested endpoint)
  getBySession(sessionId: string): Observable<VitalSign[]> {
    return this.http.get<VitalSign[]>(`${this.apiBase}/sessions/${sessionId}/vitals/`);
  }

  // Create vital sign for a session (nested endpoint)
  createForSession(sessionId: string, data: Omit<VitalSign, 'id' | 'session' | 'recorded_by'>): Observable<VitalSign> {
    return this.http.post<VitalSign>(`${this.apiBase}/sessions/${sessionId}/vitals/`, data);
  }

  // Get specific vital sign by ID
  getById(vitalSignId: number): Observable<VitalSign> {
    return this.http.get<VitalSign>(`${this.apiBase}/vital-signs/${vitalSignId}/`);
  }

  // Update vital sign by ID
  update(vitalSignId: number, data: Partial<VitalSign>): Observable<VitalSign> {
    return this.http.put<VitalSign>(`${this.apiBase}/vital-signs/${vitalSignId}/`, data);
  }

  // Patch vital sign by ID
  patch(vitalSignId: number, data: Partial<VitalSign>): Observable<VitalSign> {
    return this.http.patch<VitalSign>(`${this.apiBase}/vital-signs/${vitalSignId}/`, data);
  }

  // Delete vital sign by ID
  delete(vitalSignId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/vital-signs/${vitalSignId}/`);
  }
}
