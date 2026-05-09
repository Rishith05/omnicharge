import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../core/models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['sendOtp', 'verifyPhoneOtp', 'isAdmin']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    authSpy.isAdmin.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.step).toBe('phone');
  });

  it('should not send OTP if form is invalid', () => {
    component.onSendOtp();
    expect(authSpy.sendOtp).not.toHaveBeenCalled();
  });

  it('should send OTP on valid phone', () => {
    authSpy.sendOtp.and.returnValue(of({ message: 'OK' }));
    component.phoneForm.setValue({ mobileNumber: '9876543210' });
    component.onSendOtp();
    expect(authSpy.sendOtp).toHaveBeenCalled();
    expect(component.step).toBe('otp');
  });

  it('should handle send OTP error', () => {
    authSpy.sendOtp.and.returnValue(throwError(() => ({ error: { message: 'fail' } })));
    component.phoneForm.setValue({ mobileNumber: '9876543210' });
    component.onSendOtp();
    expect(component.loading).toBeFalse();
  });

  it('should verify OTP successfully and navigate to dashboard', () => {
    const mockAuth: AuthResponse = { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 3600, user: { id: 1, fullName: 'Test', email: 't@t.com', mobileNumber: '9876543210', role: 'ROLE_USER', authProvider: 'PHONE', isActive: true, createdAt: '', updatedAt: '' } };
    authSpy.verifyPhoneOtp.and.returnValue(of(mockAuth));
    authSpy.isAdmin.and.returnValue(false);
    component.phoneForm.setValue({ mobileNumber: '9876543210' });
    component.otpForm.setValue({ otp: '123456' });
    component.onVerifyOtp();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should navigate to admin dashboard if admin', () => {
    const mockAuth2: AuthResponse = { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 3600, user: { id: 1, fullName: 'Test', email: 't@t.com', mobileNumber: '9876543210', role: 'ROLE_ADMIN', authProvider: 'PHONE', isActive: true, createdAt: '', updatedAt: '' } };
    authSpy.verifyPhoneOtp.and.returnValue(of(mockAuth2));
    authSpy.isAdmin.and.returnValue(true);
    component.phoneForm.setValue({ mobileNumber: '9876543210' });
    component.otpForm.setValue({ otp: '123456' });
    component.onVerifyOtp();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('should handle verify OTP error', () => {
    authSpy.verifyPhoneOtp.and.returnValue(throwError(() => ({ error: {} })));
    component.phoneForm.setValue({ mobileNumber: '9876543210' });
    component.otpForm.setValue({ otp: '123456' });
    component.onVerifyOtp();
    expect(component.loading).toBeFalse();
  });

  it('should resend OTP', () => {
    authSpy.sendOtp.and.returnValue(of({ message: 'OK' }));
    component.phoneForm.setValue({ mobileNumber: '9876543210' });
    component.onResendOtp();
    expect(authSpy.sendOtp).toHaveBeenCalled();
  });
});
