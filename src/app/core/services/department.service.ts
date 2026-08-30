import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Department } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  private apiBase = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/departments/`, { params });
  }

  getById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.apiBase}/departments/${id}/`);
  }

  create(data: Department): Observable<Department> {
    return this.http.post<Department>(`${this.apiBase}/departments/`, data);
  }

  update(id: number, data: Department): Observable<Department> {
    return this.http.put<Department>(`${this.apiBase}/departments/${id}/`, data);
  }

  patch(id: number, data: Partial<Department>): Observable<Department> {
    return this.http.patch<Department>(`${this.apiBase}/departments/${id}/`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/departments/${id}/`);
  }
}
