import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

const PUBLIC_AUTH_ENDPOINTS = [
  '/api/auth/login/',
  '/api/auth/refresh/',
  '/api/auth/forgot-password/',
  '/api/auth/reset-password/',
  '/auth/login/',
  '/auth/refresh/',
  '/auth/forgot-password/',
  '/auth/reset-password/',
];

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isPublicEndpoint = PUBLIC_AUTH_ENDPOINTS.some((endpoint) => req.url.includes(endpoint));

  if (!isPublicEndpoint) {
    const token = authService.getAccessToken();
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublicEndpoint && authService.getAccessToken()) {
        return authService.refreshToken().pipe(
          switchMap((res) => {
            const newReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${res.access}`,
              },
            });
            return next(newReq);
          }),
          catchError((refreshErr) => {
            authService.logout();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
