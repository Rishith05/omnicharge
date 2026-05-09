import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let snackSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['forgotPassword', 'resetPassword']);
    snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy },
        { provide: MatSnackBar, useValue: snackSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });

  it('should not send OTP if form invalid', () => {
    component.sendOtp();
    expect(authSpy.forgotPassword).not.toHaveBeenCalled();
  });

  it('should handle send OTP error', () => {
    authSpy.forgotPassword.and.returnValue(throwError(() => ({ error: {} })));
    component.emailForm.setValue({ email: 'test@test.com' });
    component.sendOtp();
    expect(component.loading).toBeFalse();
  });

  it('should reset password successfully', () => {
    authSpy.resetPassword.and.returnValue(of({}));
    component.emailForm.setValue({ email: 'test@test.com' });
    component.resetForm.setValue({ otp: '123456', newPassword: 'newpass123' });
    component.resetPassword();
    expect(component.loading).toBeFalse();
  });

  it('should handle reset password error', () => {
    authSpy.resetPassword.and.returnValue(throwError(() => ({ error: {} })));
    component.emailForm.setValue({ email: 'test@test.com' });
    component.resetForm.setValue({ otp: '123456', newPassword: 'newpass123' });
    component.resetPassword();
    expect(component.loading).toBeFalse();
  });
});
