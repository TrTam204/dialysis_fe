import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DialysisMachine } from '../models';

@Injectable({
  providedIn: 'root',
})
export class MachineService {
  private apiBase = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/machines/`, { params });
  }

  getById(machineId: string): Observable<DialysisMachine> {
    return this.http.get<DialysisMachine>(`${this.apiBase}/machines/${machineId}/`);
  }

  create(data: DialysisMachine): Observable<DialysisMachine> {
    return this.http.post<DialysisMachine>(`${this.apiBase}/machines/`, data);
  }

  update(machineId: string, data: DialysisMachine): Observable<DialysisMachine> {
    return this.http.put<DialysisMachine>(`${this.apiBase}/machines/${machineId}/`, data);
  }

  patch(machineId: string, data: Partial<DialysisMachine>): Observable<DialysisMachine> {
    return this.http.patch<DialysisMachine>(`${this.apiBase}/machines/${machineId}/`, data);
  }

  delete(machineId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/machines/${machineId}/`);
  }
}
