import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Patient } from '../models';

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private apiBase = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/patients/`, { params });
  }

  getById(patientId: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiBase}/patients/${patientId}/`);
  }

  create(data: Patient): Observable<Patient> {
    return this.http.post<Patient>(`${this.apiBase}/patients/`, data);
  }

  update(patientId: string, data: Patient): Observable<Patient> {
    return this.http.put<Patient>(`${this.apiBase}/patients/${patientId}/`, data);
  }

  patch(patientId: string, data: Partial<Patient>): Observable<Patient> {
    return this.http.patch<Patient>(`${this.apiBase}/patients/${patientId}/`, data);
  }

  delete(patientId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/patients/${patientId}/`);
  }
}
