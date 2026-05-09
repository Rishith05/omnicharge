import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { provideHttpClient as provideHttp, withInterceptors } from '@angular/common/http';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken', 'refreshToken', 'logout', 'isLoggedIn'], {
      currentUser$: { subscribe: () => {} }
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttp(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should not add Authorization header for public endpoints', () => {
    authServiceSpy.getToken.and.returnValue('test-token');

    httpClient.post('/api/auth/send-otp', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/send-otp');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should add Authorization header for authenticated endpoints', () => {
    authServiceSpy.getToken.and.returnValue('test-token');

    httpClient.get('/api/users/profile').subscribe();

    const req = httpMock.expectOne('/api/users/profile');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  it('should not add header when no token is available', () => {
    authServiceSpy.getToken.and.returnValue(null);

    httpClient.get('/api/users/profile').subscribe();

    const req = httpMock.expectOne('/api/users/profile');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should add token to optional auth endpoints if available', () => {
    authServiceSpy.getToken.and.returnValue('test-token');

    httpClient.post('/api/auth/refresh-token', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/refresh-token');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  it('should not add token to optional auth endpoints if not available', () => {
    authServiceSpy.getToken.and.returnValue(null);

    httpClient.post('/api/auth/refresh-token', {}).subscribe();

    const req = httpMock.expectOne('/api/auth/refresh-token');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
});
