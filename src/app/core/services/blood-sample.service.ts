import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BloodSample } from '../models';

@Injectable({
  providedIn: 'root',
})
export class BloodSampleService {
  private apiBase = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/blood-samples/`, { params });
  }

  getById(sampleId: string): Observable<BloodSample> {
    return this.http.get<BloodSample>(`${this.apiBase}/blood-samples/${sampleId}/`);
  }

  create(data: BloodSample): Observable<BloodSample> {
    return this.http.post<BloodSample>(`${this.apiBase}/blood-samples/`, data);
  }

  update(sampleId: string, data: BloodSample): Observable<BloodSample> {
    return this.http.put<BloodSample>(`${this.apiBase}/blood-samples/${sampleId}/`, data);
  }

  patch(sampleId: string, data: Partial<BloodSample>): Observable<BloodSample> {
    return this.http.patch<BloodSample>(`${this.apiBase}/blood-samples/${sampleId}/`, data);
  }

  delete(sampleId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/blood-samples/${sampleId}/`);
  }
}
