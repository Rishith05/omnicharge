import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../../core/services/auth.service';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['sendOtp', 'verifyPhoneOtp', 'isAdmin']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: MatSnackBar, useValue: snackBar },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams: {} } },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    spyOn(router, 'navigateByUrl');

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should send OTP', () => {
    authService.sendOtp.and.returnValue(of({}));
    component.phoneForm.patchValue({ mobileNumber: '9876543210' });
    component.onSendOtp();
    expect(component.step).toBe('otp');
  });

  it('should verify OTP and navigate', () => {
    authService.verifyPhoneOtp.and.returnValue(of({} as any));
    authService.isAdmin.and.returnValue(false);
    component.otpForm.patchValue({ otp: '123456' });
    component.onVerifyOtp();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should handle timer', fakeAsync(() => {
    authService.sendOtp.and.returnValue(of({}));
    component.phoneForm.patchValue({ mobileNumber: '9876543210' });
    component.onSendOtp();
    expect(component.resendTimer).toBe(60);
    tick(1000);
    expect(component.resendTimer).toBe(59);
  }));
});
