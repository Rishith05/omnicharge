import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../../core/services/auth.service';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['sendOtp', 'verifyPhoneOtp']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, NoopAnimationsModule],
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

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should send OTP', () => {
    authService.sendOtp.and.returnValue(of({}));
    component.registerForm.patchValue({ fullName: 'A', mobileNumber: '9876543210' });
    component.onSendOtp();
    expect(authService.sendOtp).toHaveBeenCalled();
  });

  it('should verify OTP', () => {
    authService.verifyPhoneOtp.and.returnValue(of({} as any));
    component.registerForm.patchValue({ mobileNumber: '9876543210' });
    component.otpForm.patchValue({ otp: '123456' });
    component.onVerifyOtp();
    expect(authService.verifyPhoneOtp).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('should handle timer', fakeAsync(() => {
    authService.sendOtp.and.returnValue(of({}));
    component.registerForm.patchValue({ fullName: 'A', mobileNumber: '9876543210' });
    component.onSendOtp();
    expect(component.resendTimer).toBe(120);
    tick(1000);
    expect(component.resendTimer).toBe(119);
  }));
});
