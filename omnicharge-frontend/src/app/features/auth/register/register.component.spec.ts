import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../core/models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['sendOtp', 'verifyPhoneOtp']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });

  it('should not send OTP if form invalid', () => {
    component.onSendOtp();
    expect(authSpy.sendOtp).not.toHaveBeenCalled();
  });

  it('should handle send OTP error', () => {
    authSpy.sendOtp.and.returnValue(throwError(() => ({ error: {} })));
    component.registerForm.setValue({ fullName: 'Test', mobileNumber: '9876543210', email: '' });
    component.onSendOtp();
    expect(component.loading).toBeFalse();
  });

  it('should verify OTP and navigate to dashboard', () => {
    const mockAuth: AuthResponse = { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 3600, user: { id: 1, fullName: 'Test', email: '', mobileNumber: '9876543210', role: 'ROLE_USER', authProvider: 'PHONE', isActive: true, createdAt: '', updatedAt: '' } };
    authSpy.verifyPhoneOtp.and.returnValue(of(mockAuth));
    component.registerForm.setValue({ fullName: 'Test', mobileNumber: '9876543210', email: '' });
    component.otpForm.setValue({ otp: '123456' });
    component.onVerifyOtp();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should handle verify OTP error', () => {
    authSpy.verifyPhoneOtp.and.returnValue(throwError(() => ({ error: {} })));
    component.registerForm.setValue({ fullName: 'Test', mobileNumber: '9876543210', email: '' });
    component.otpForm.setValue({ otp: '123456' });
    component.onVerifyOtp();
    expect(component.loading).toBeFalse();
  });
});
