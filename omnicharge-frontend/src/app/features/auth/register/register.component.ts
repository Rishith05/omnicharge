import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, 
    MatProgressSpinnerModule, MatStepperModule
  ],
  template: `
    <div class="auth-container">
      <div class="auth-bg-decoration"></div>
      <mat-card class="auth-card slide-up">
        <div class="auth-header">
          <a routerLink="/" class="back-home">
            <mat-icon class="auth-logo">bolt</mat-icon>
          </a>
          <h1>Create Account</h1>
          <p>Join OmniCharge today</p>
        </div>

        <mat-stepper [linear]="true" #stepper>
          <!-- Step 1: User Info + Phone Number -->
          <mat-step [stepControl]="registerForm">
            <form [formGroup]="registerForm" (ngSubmit)="onSendOtp()">
              <ng-template matStepLabel>Your Info</ng-template>

              <mat-form-field appearance="outline">
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="fullName" placeholder="John Doe">
                <mat-icon matPrefix>person</mat-icon>
                @if (registerForm.get('fullName')?.hasError('required') && registerForm.get('fullName')?.touched) {
                  <mat-error>Full name is required</mat-error>
                }
              </mat-form-field>

              <div class="phone-input-group">
                <div class="country-code">
                  <span>+91</span>
                </div>
                <mat-form-field appearance="outline" class="phone-field">
                  <mat-label>Phone Number</mat-label>
                  <input matInput formControlName="mobileNumber" type="tel"
                         placeholder="9876543210" maxlength="10">
                  <mat-icon matSuffix>phone_android</mat-icon>
                  @if (registerForm.get('mobileNumber')?.hasError('pattern') && registerForm.get('mobileNumber')?.touched) {
                    <mat-error>Enter a valid 10-digit mobile number</mat-error>
                  }
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline">
                <mat-label>Email (Optional)</mat-label>
                <input matInput formControlName="email" type="email" placeholder="you&#64;example.com">
                <mat-icon matPrefix>email</mat-icon>
                @if (registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched) {
                  <mat-error>Enter a valid email</mat-error>
                }
              </mat-form-field>

              <div class="info-text">
                <mat-icon>info</mat-icon>
                <span>Email is optional. You can add/verify it later in your profile.</span>
              </div>

              <button mat-raised-button color="primary" type="submit"
                      [disabled]="loading || registerForm.invalid" class="submit-btn">
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>send</mat-icon> Send OTP
                }
              </button>
            </form>
          </mat-step>

          <!-- Step 2: OTP Verification -->
          <mat-step [stepControl]="otpForm">
            <form [formGroup]="otpForm" (ngSubmit)="onVerifyOtp()">
              <ng-template matStepLabel>Verify</ng-template>

              <div class="sent-to-info">
                <mat-icon>smartphone</mat-icon>
                <span>OTP sent to <strong>+91 {{ registerForm.value.mobileNumber }}</strong></span>
              </div>

              <mat-form-field appearance="outline" class="otp-field">
                <mat-label>6-Digit OTP</mat-label>
                <input matInput formControlName="otp" placeholder="• • • • • •"
                       maxlength="6" class="otp-input">
                <mat-icon matPrefix>pin</mat-icon>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit"
                      [disabled]="loading || otpForm.invalid" class="submit-btn" style="margin-top: 16px;">
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>verified</mat-icon> Verify & Create Account
                }
              </button>

              <div class="resend-row">
                <span class="timer-text">
                  @if (resendTimer > 0) {
                    Resend in {{ resendTimer }}s
                  } @else {
                    Didn't receive the code?
                  }
                </span>
                <button mat-button class="resend-btn" [disabled]="resendTimer > 0" (click)="onResendOtp()">
                  Resend OTP
                </button>
              </div>

              <button mat-button type="button" (click)="stepper.previous()" class="back-btn">
                <mat-icon>arrow_back</mat-icon> Back
              </button>
            </form>
          </mat-step>
        </mat-stepper>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/auth/login" [queryParams]="returnUrl ? { returnUrl: returnUrl } : {}">Sign In</a></p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: var(--bg-primary);
      position: relative; overflow: hidden;
    }
    .auth-bg-decoration {
      position: absolute; width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(44,182,125,0.15) 0%, transparent 70%);
      bottom: -100px; left: -100px; pointer-events: none;
    }
    .auth-card {
      width: 100%; max-width: 460px; padding: 40px;
      background: var(--bg-card) !important;
      border: 1px solid var(--border-subtle); backdrop-filter: blur(20px);
    }
    .auth-header { text-align: center; margin-bottom: 24px; }
    .back-home { text-decoration: none; cursor: pointer; }
    .auth-logo {
      font-size: 48px; width: 48px; height: 48px;
      background: var(--gradient-primary);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .auth-header h1 {
      font-size: 28px; font-weight: 800; margin-top: 8px;
      background: var(--gradient-primary);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .auth-header p { color: var(--text-secondary); margin-top: 4px; font-size: 14px; }
    mat-form-field { width: 100%; margin-bottom: 8px; }
    .phone-input-group { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 8px; }
    .country-code {
      display: flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle);
      border-radius: 12px; padding: 14px 12px; margin-top: 4px;
      color: var(--text-secondary); font-weight: 600; font-size: 15px;
    }
    .phone-field { flex: 1; }
    .info-text {
      display: flex; align-items: center; gap: 8px;
      color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;
      padding: 10px 12px; background: rgba(255,255,255,0.02); border-radius: 8px;
    }
    .info-text mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--accent-purple); flex-shrink: 0; }
    .sent-to-info {
      display: flex; align-items: center; gap: 8px;
      background: rgba(44,182,125,0.1); border: 1px solid rgba(44,182,125,0.2);
      border-radius: 12px; padding: 12px 16px; margin-bottom: 24px;
      color: var(--accent-teal); font-size: 14px;
    }
    .sent-to-info mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .otp-field { width: 100%; }
    .otp-input { font-size: 24px !important; letter-spacing: 8px; font-weight: 700; text-align: center; }
    .resend-row { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
    .timer-text { color: var(--text-secondary); font-size: 13px; }
    .resend-btn { color: var(--accent-purple) !important; font-weight: 600; }
    .resend-btn:disabled { opacity: 0.4; }
    .submit-btn { width: 100%; height: 48px; font-size: 16px; }
    .back-btn { width: 100%; margin-top: 8px; }
    .auth-footer { text-align: center; margin-top: 24px; }
    .auth-footer p { color: var(--text-secondary); font-size: 14px; }
    .auth-footer a { color: var(--accent-teal); text-decoration: none; font-weight: 600; }
  `]
})
export class RegisterComponent {
  @ViewChild('stepper') stepper!: MatStepper;
  registerForm: FormGroup;
  otpForm: FormGroup;
  loading = false;
  returnUrl = '';
  resendTimer = 0;
  private resendInterval: any = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      mobileNumber: ['', [Validators.required, Validators.pattern('^[6-9]\\d{9}$')]],
      email: ['', Validators.email]  // Optional
    });
    
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';
  }

  onSendOtp(): void {
    if (this.registerForm.invalid) return;
    this.loading = true;
    this.cdr.markForCheck();

    this.authService.sendOtp({ mobileNumber: this.registerForm.value.mobileNumber }).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.snackBar.open('OTP sent to your phone!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.stepper.next();
        this.startResendTimer();
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.snackBar.open(err.error?.message || 'Failed to send OTP', 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
      }
    });
  }

  onVerifyOtp(): void {
    if (this.otpForm.invalid) return;
    this.loading = true;
    this.cdr.markForCheck();
    
    const request = {
      mobileNumber: this.registerForm.value.mobileNumber,
      otp: this.otpForm.value.otp,
      fullName: this.registerForm.value.fullName
    };

    this.authService.verifyPhoneOtp(request).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.snackBar.open('Welcome to OmniCharge!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        
        const savedContext = localStorage.getItem('omni_recharge_context');
        if (this.returnUrl) {
          this.router.navigateByUrl(this.returnUrl);
        } else if (savedContext) {
          this.router.navigate(['/recharge']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.snackBar.open(err.error?.message || 'Verification failed', 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
      }
    });
  }

  onResendOtp(): void {
    this.otpForm.reset();
    this.onSendOtp();
  }

  private startResendTimer(): void {
    this.resendTimer = 120;
    if (this.resendInterval) clearInterval(this.resendInterval);
    this.resendInterval = setInterval(() => {
      this.resendTimer--;
      this.cdr.markForCheck();
      if (this.resendTimer <= 0) clearInterval(this.resendInterval);
    }, 1000);
  }
}
