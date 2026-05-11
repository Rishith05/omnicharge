import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, { provide: Router, useValue: router }],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Initialization', () => {
    it('should restore user from localStorage', () => {
      const user = { id: 1, fullName: 'Test', mobileNumber: '123' };
      localStorage.setItem('user', JSON.stringify(user));
      const newService = new AuthService(TestBed.inject(Router) as any, router);
      expect(newService.getCurrentUser()).toEqual(user as any);
    });
  });

  describe('Real API', () => {
    beforeEach(() => (environment.useMockApi = false));

    it('should send OTP', () => {
      service.sendOtp({ mobileNumber: '123' }).subscribe((res) => expect(res).toBeDefined());
      httpMock.expectOne((req) => req.url.includes('/send-otp')).flush({});
    });

    it('should verify OTP and store tokens', () => {
      service.verifyPhoneOtp({ mobileNumber: '123', otp: '111' }).subscribe();
      const req = httpMock.expectOne((req) => req.url.includes('/verify-phone-otp'));
      req.flush({
        accessToken: 'at',
        refreshToken: 'rt',
        user: { id: 1, fullName: 'J', mobileNumber: '123' },
      });
      expect(localStorage.getItem('accessToken')).toBe('at');
      expect(service.isLoggedIn()).toBeTrue();
    });

    it('should refresh token', () => {
      localStorage.setItem('refreshToken', 'rt');
      service.refreshToken().subscribe((res) => expect(res).toBeDefined());
      httpMock.expectOne((req) => req.url.includes('/refresh-token')).flush({ accessToken: 'new' });
      expect(localStorage.getItem('accessToken')).toBe('new');
    });
    it('should fetch dev otp', () => {
      service.fetchDevOtp('123').subscribe();
      httpMock.expectOne((req) => req.url.includes('/dev-otp/123')).flush('111');
    });

    it('should catch error on fetch dev otp', () => {
      service.fetchDevOtp('123').subscribe((res) => expect(res).toBeNull());
      httpMock
        .expectOne((req) => req.url.includes('/dev-otp/123'))
        .flush('', { status: 404, statusText: 'Not Found' });
    });

    it('should google login', () => {
      service.googleLogin({ idToken: 'token' }).subscribe();
      httpMock.expectOne((req) => req.url.includes('/google')).flush({ user: { id: 1 } });
    });

    it('should forgot password', () => {
      service.forgotPassword({ email: 'e' }).subscribe();
      httpMock.expectOne((req) => req.url.includes('/forgot-password')).flush({});
    });

    it('should verify otp', () => {
      service.verifyOtp({ email: 'e', otp: '1' }).subscribe();
      httpMock.expectOne((req) => req.url.includes('/verify-otp')).flush({});
    });

    it('should reset password', () => {
      service.resetPassword({ email: 'e', newPassword: '1', otp: '111' }).subscribe();
      httpMock.expectOne((req) => req.url.includes('/reset-password')).flush({});
    });

    it('should handle refresh token error', () => {
      localStorage.setItem('refreshToken', 'rt');
      service.refreshToken().subscribe();
      httpMock
        .expectOne((req) => req.url.includes('/refresh-token'))
        .flush({}, { status: 401, statusText: 'Unauthorized' });
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('Mock API', () => {
    beforeEach(() => (environment.useMockApi = true));

    it('should send otp via mock', fakeAsync(() => {
      let res: any;
      service.sendOtp({ mobileNumber: '123' }).subscribe((r) => (res = r));
      tick(500);
      expect(res.message).toContain('sent');
    }));

    it('should fetch dev otp via mock', fakeAsync(() => {
      let res: any;
      service.fetchDevOtp('123').subscribe((r) => (res = r));
      tick(200);
      expect(res).toBe('123456');
    }));

    it('should verify phone otp via mock', fakeAsync(() => {
      let res: any;
      service.verifyPhoneOtp({ mobileNumber: '123', otp: '111' }).subscribe((r) => (res = r));
      tick(500);
      expect(res.user.mobileNumber).toBe('123');
      expect(service.isLoggedIn()).toBeTrue();
    }));

    it('should verify phone otp via mock for admin', fakeAsync(() => {
      let res: any;
      service
        .verifyPhoneOtp({ mobileNumber: '8688179553', otp: '111' })
        .subscribe((r) => (res = r));
      tick(500);
      expect(res.user.role).toBe('ROLE_ADMIN');
      expect(service.isAdmin()).toBeTrue();
    }));

    it('should google login via mock', fakeAsync(() => {
      let res: any;
      service.googleLogin({ idToken: 'token' }).subscribe((r) => (res = r));
      tick(500);
      expect(res.user).toBeDefined();
    }));

    it('should forgot password via mock', fakeAsync(() => {
      let res: any;
      service.forgotPassword({ email: 'e' }).subscribe((r) => (res = r));
      tick(500);
      expect(res).toBeDefined();
    }));

    it('should verify otp via mock', fakeAsync(() => {
      let res: any;
      service.verifyOtp({ email: 'e', otp: '1' }).subscribe((r) => (res = r));
      tick(500);
      expect(res).toBeDefined();
    }));

    it('should reset password via mock', fakeAsync(() => {
      let res: any;
      service
        .resetPassword({ email: 'e', newPassword: '1', otp: '111' })
        .subscribe((r) => (res = r));
      tick(500);
      expect(res).toBeDefined();
    }));

    it('should refresh token via mock', fakeAsync(() => {
      let res: any;
      service.refreshToken().subscribe((r) => (res = r));
      tick(500);
      expect(res).toBeDefined();
    }));
  });

  describe('Other Methods', () => {
    it('should update local user', () => {
      service.updateLocalUser({ id: 2, fullName: 'New' } as any);
      expect(service.getCurrentUser()?.id).toBe(2);
    });

    it('should schedule token refresh on init if token exists', fakeAsync(() => {
      const token = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 }));
      localStorage.setItem('accessToken', `header.${token}.sig`);
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      localStorage.setItem('refreshToken', 'rt');
      environment.useMockApi = true;
      const newService = new AuthService(TestBed.inject(Router) as any, router);
      tick(60000);
      expect(newService.isLoggedIn()).toBeTrue();
    }));
  });
});
