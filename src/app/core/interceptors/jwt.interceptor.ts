import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

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

  return next(req);
};
