import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScheduleAssignment, SchedulePlan } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SchedulePlanService {
  private apiBase = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/schedule-plans/`, { params });
  }

  getById(id: number): Observable<SchedulePlan> {
    return this.http.get<SchedulePlan>(`${this.apiBase}/schedule-plans/${id}/`);
  }

  create(data: Partial<SchedulePlan>): Observable<SchedulePlan> {
    return this.http.post<SchedulePlan>(`${this.apiBase}/schedule-plans/`, data);
  }

  update(id: number, data: Partial<SchedulePlan>): Observable<SchedulePlan> {
    return this.http.put<SchedulePlan>(`${this.apiBase}/schedule-plans/${id}/`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/schedule-plans/${id}/`);
  }

  getAssignments(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/schedule-assignments/`, { params });
  }

  approve(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/schedule-plans/${id}/approve/`, {});
  }

  reject(id: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/schedule-plans/${id}/reject/`, { reason });
  }
}
