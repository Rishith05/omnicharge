import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { responseInterceptor } from './response.interceptor';

describe('responseInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], { url: '/dashboard' });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([responseInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should unwrap ApiResponse envelope', () => {
    httpClient.get('/api/test').subscribe((data: any) => {
      expect(data).toEqual({ name: 'Test' });
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ success: true, message: 'OK', data: { name: 'Test' } });
  });

  it('should unwrap Spring Page content', () => {
    httpClient.get('/api/test').subscribe((data: any) => {
      expect(Array.isArray(data)).toBeTrue();
      expect(data.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({
      success: true,
      message: 'OK',
      data: { content: [{ id: 1 }], totalElements: 1, totalPages: 1 },
    });
  });

  it('should pass through non-ApiResponse bodies', () => {
    httpClient.get('/api/test').subscribe((data: any) => {
      expect(data.name).toBe('Raw');
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ name: 'Raw' });
  });

  it('should handle 403 errors', () => {
    httpClient.get('/api/test').subscribe({
      error: (err) => {
        expect(err.status).toBe(403);
      },
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({}, { status: 403, statusText: 'Forbidden' });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/error/403']);
  });

  it('should handle 404 errors', () => {
    httpClient.get('/api/test').subscribe({
      error: (err) => {
        expect(err.status).toBe(404);
      },
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({}, { status: 404, statusText: 'Not Found' });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/error/404']);
  });

  it('should handle 500 errors', () => {
    httpClient.get('/api/test').subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
      },
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({}, { status: 500, statusText: 'Internal Server Error' });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/error/500']);
  });

  it('should handle 401 errors and clear storage', () => {
    localStorage.setItem('accessToken', 'test');
    localStorage.setItem('refreshToken', 'test');
    localStorage.setItem('user', 'test');

    httpClient.get('/api/protected').subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
        expect(localStorage.getItem('accessToken')).toBeNull();
      },
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
  });

  it('should not redirect 401 for public auth endpoints', () => {
    httpClient.post('/api/auth/send-otp', {}).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/api/auth/send-otp');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    // Should NOT navigate to login for auth endpoints
    expect(routerSpy.navigate).not.toHaveBeenCalledWith(['/auth/login']);
  });
});
