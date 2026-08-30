import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomUser } from '../models';

@Injectable({
  providedIn: 'root',
})
export class StaffService {
  private apiBase = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/users/`, { params });
  }

  getById(id: number): Observable<CustomUser> {
    return this.http.get<CustomUser>(`${this.apiBase}/users/${id}/`);
  }

  create(data: CustomUser & { password?: string }): Observable<CustomUser> {
    return this.http.post<CustomUser>(`${this.apiBase}/users/`, data);
  }

  update(id: number, data: CustomUser): Observable<CustomUser> {
    return this.http.put<CustomUser>(`${this.apiBase}/users/${id}/`, data);
  }

  patch(id: number, data: Partial<CustomUser>): Observable<CustomUser> {
    return this.http.patch<CustomUser>(`${this.apiBase}/users/${id}/`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/users/${id}/`);
  }
}
