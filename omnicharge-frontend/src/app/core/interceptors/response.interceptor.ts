import {
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * HTTP Response Interceptor — handles:
 * 1. Unwrapping backend ApiResponse<T> envelope { success, message, data }
 * 2. Unwrapping Spring Page<T> { content: [] } responses
 * 3. Exception handling for HTTP errors — routing to proper error pages:
 *    - 401 Unauthorized  → clear tokens → /auth/login
 *    - 403 Forbidden     → /error/403
 *    - 404 Not Found     → /error/404
 *    - 500+ Server Error → /error/500
 */
export const responseInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    map((event: HttpEvent<any>) => {
      // Check if we received an HttpResponse
      if (event instanceof HttpResponse && event.body) {
        // If the backend wraps the data in { success, message, data }
        if (event.body.success !== undefined && event.body.data !== undefined) {
          let unwrappedData = event.body.data;

          // If the inner data is a Spring Page<T> or PagedResponse, extract the .content array
          if (
            unwrappedData &&
            typeof unwrappedData === 'object' &&
            'content' in unwrappedData &&
            Array.isArray(unwrappedData.content)
          ) {
            unwrappedData = unwrappedData.content;
          }

          // Return the clone with the cleanly unwrapped body so our services can use it directly!
          return event.clone({ body: unwrappedData });
        }
      }
      return event;
    }),
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          // Skip token/session handling for public auth endpoints (OTP, etc.)
          if (
            !req.url.includes('/api/auth/send-otp') &&
            !req.url.includes('/api/auth/verify-phone-otp') &&
            !req.url.includes('/api/auth/verify-otp')
          ) {
            // Token is invalid/expired. Clear it immediately to avoid circular dependencies with AuthService
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            // Redirect to login if we are not already on the auth pages
            if (!router.url.includes('/auth/') && !router.url.includes('/error/')) {
              router.navigate(['/auth/login']);
            }
          }
          break;

        case 403:
          // Access Forbidden — redirect to 403 error page
          if (!router.url.includes('/error/')) {
            router.navigate(['/error/403']);
          }
          break;

        case 404:
          // Resource Not Found — redirect to 404 error page
          // Only redirect for page/navigation requests, not background API calls
          if (!router.url.includes('/error/')) {
            router.navigate(['/error/404']);
          }
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server Error — redirect to 500 error page
          if (!router.url.includes('/error/')) {
            router.navigate(['/error/500']);
          }
          break;

        default:
          // Other errors — let them propagate to individual component error handlers
          break;
      }

      return throwError(() => error);
    }),
  );
};
