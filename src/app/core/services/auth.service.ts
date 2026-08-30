import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthResponse, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest, CustomUser } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiBase = 'http://localhost:8000/api/auth';
  private currentUserSubject = new BehaviorSubject<CustomUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkStoredAuth();
  }

  private checkStoredAuth() {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('current_user');
    if (storedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser) as CustomUser);
      } catch {
        localStorage.removeItem('current_user');
      }
    }
    if (token) {
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiBase}/login/`, credentials).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
        const user: CustomUser = {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email,
          first_name: response.user.first_name,
          last_name: response.user.last_name,
          role: response.user.role,
          is_active: true,
          department: response.user.department ?? 0,
        };
        localStorage.setItem('current_user', JSON.stringify(user));
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      }),
      catchError((error) => {
        throw error;
      })
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  refreshToken(): Observable<{ access: string }> {
    const refresh = localStorage.getItem('refresh_token');
    return this.http.post<{ access: string }>(`${this.apiBase}/refresh/`, { refresh }).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access);
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/forgot-password/`, { email });
  }

  resetPassword(email: string, otp: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/reset-password/`, { email, otp, password });
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getCurrentUser(): CustomUser | null {
    return this.currentUserSubject.value;
  }

  getUserRole(): string | null {
    const user = this.currentUserSubject.value;
    return user?.role || null;
  }

  hasRole(role: string | string[]): boolean {
    const userRole = this.getUserRole();
    if (!userRole) return false;
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    return userRole === role;
  }
}
