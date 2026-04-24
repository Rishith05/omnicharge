import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

/**
 * Auth interceptor that:
 * 1. Skips attaching tokens for public auth endpoints (OTP, login, register)
 * 2. Attaches Bearer token for all other authenticated requests
 * 3. Auto-refreshes expired access tokens using the refresh token
 */

/** Endpoints that should be sent WITHOUT any auth token */
const PUBLIC_AUTH_ENDPOINTS = [
  '/api/auth/send-otp',
  '/api/auth/verify-phone-otp',
  '/api/auth/verify-otp',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/dev-otp',
  '/api/operators/detect',
  '/api/operators/active',
  '/api/operators/',
  '/api/plans/',
];

/** Endpoints that optionally include a token if available but don't require it */
const OPTIONAL_AUTH_ENDPOINTS = [
  '/api/auth/refresh-token',
  '/api/auth/google',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Public endpoints: NEVER send auth token to avoid gateway 401
  const isPublic = PUBLIC_AUTH_ENDPOINTS.some(ep => req.url.includes(ep));
  if (isPublic) {
    return next(req);
  }

  // Optional auth endpoints: send token if available, but don't retry on 401
  const isOptional = OPTIONAL_AUTH_ENDPOINTS.some(ep => req.url.includes(ep));
  if (isOptional) {
    if (token) {
      const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      return next(cloned);
    }
    return next(req);
  }

  // Authenticated endpoints: attach token and handle 401 with refresh
  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Access token expired — try to refresh using refresh token from localStorage
          return authService.refreshToken().pipe(
            switchMap(() => {
              const newToken = authService.getToken();
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` }
              });
              return next(retryReq);
            }),
            catchError((refreshError) => {
              // Refresh also failed — force logout
              authService.logout();
              return throwError(() => refreshError);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }

  return next(req);
};
