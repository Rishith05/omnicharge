import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    const routerMock = { navigate: jasmine.createSpy('navigate') };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerMock }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send OTP via API', (done) => {
    const originalUseMock = environment.useMockApi;
    (environment as any).useMockApi = false;
    
    const request = { mobileNumber: '9876543210' };
    const mockResponse = { message: 'OTP sent' };

    service.sendOtp(request).subscribe(res => {
      expect(res.message).toBe('OTP sent');
      (environment as any).useMockApi = originalUseMock;
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/send-otp`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should verify OTP and handle auth properly', (done) => {
    const originalUseMock = environment.useMockApi;
    (environment as any).useMockApi = false;
    
    const request = { mobileNumber: '9876543210', otp: '123456' };
    const mockAuthRes = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1, fullName: 'Test User', role: 'USER' }
    };

    service.verifyPhoneOtp(request).subscribe(res => {
      expect(localStorage.getItem('accessToken')).toBe('access-token');
      expect(localStorage.getItem('user')).toBeTruthy();
      expect(service.getCurrentUser()?.fullName).toBe('Test User');
      (environment as any).useMockApi = originalUseMock;
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/verify-phone-otp`);
    req.flush({ data: mockAuthRes });
  });

  it('should logout and clear local storage', () => {
    localStorage.setItem('accessToken', 'some-token');
    service.logout();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(service.getCurrentUser()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
