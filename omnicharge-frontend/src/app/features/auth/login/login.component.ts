import { Component, ChangeDetectorRef } from '@angular/core';
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
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="auth-container">
      <div class="auth-bg-decoration"></div>
      <div class="auth-bg-decoration-2"></div>
      <mat-card class="auth-card slide-up">
        <div class="auth-header">
          <a routerLink="/" class="back-home">
            <mat-icon class="auth-logo">bolt</mat-icon>
          </a>
          <h1>OmniCharge</h1>
          <p>{{ step === 'phone' ? 'Sign in with your phone number' : 'Enter verification code' }}</p>
        </div>

        <!-- Step 1: Phone Number -->
        @if (step === 'phone') {
          <form [formGroup]="phoneForm" (ngSubmit)="onSendOtp()">
            <div class="phone-input-group">
              <div class="country-code">
                <mat-icon>flag</mat-icon>
                <span>+91</span>
              </div>
              <mat-form-field appearance="outline" class="phone-field">
                <mat-label>Phone Number</mat-label>
                <input matInput formControlName="mobileNumber" type="tel"
                       placeholder="9876543210" maxlength="10" autocomplete="tel">
                <mat-icon matSuffix>phone_android</mat-icon>
                @if (phoneForm.get('mobileNumber')?.hasError('required') && phoneForm.get('mobileNumber')?.touched) {
                  <mat-error>Phone number is required</mat-error>
                }
                @if (phoneForm.get('mobileNumber')?.hasError('pattern') && phoneForm.get('mobileNumber')?.touched) {
                  <mat-error>Enter a valid 10-digit Indian mobile number</mat-error>
                }
              </mat-form-field>
            </div>

            <button mat-raised-button color="primary" type="submit"
                    [disabled]="loading || phoneForm.invalid" class="submit-btn">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>send</mat-icon> Send OTP
              }
            </button>
          </form>

          <div class="info-text">
            <mat-icon>info</mat-icon>
            <span>We'll send a 6-digit verification code to your phone</span>
          </div>
        }

        <!-- Step 2: OTP Verification -->
        @if (step === 'otp') {
          <div class="otp-section">
            <div class="sent-to-info">
              <mat-icon>smartphone</mat-icon>
              <span>OTP sent to <strong>+91 {{ phoneForm.value.mobileNumber }}</strong></span>
              <button mat-button class="change-btn" (click)="step = 'phone'">Change</button>
            </div>

            <form [formGroup]="otpForm" (ngSubmit)="onVerifyOtp()">
              <mat-form-field appearance="outline" class="otp-field">
                <mat-label>6-Digit OTP</mat-label>
                <input matInput formControlName="otp" type="text"
                       placeholder="• • • • • •" maxlength="6" autocomplete="one-time-code"
                       class="otp-input">
                <mat-icon matPrefix>pin</mat-icon>
                @if (otpForm.get('otp')?.hasError('pattern') && otpForm.get('otp')?.touched) {
                  <mat-error>OTP must be exactly 6 digits</mat-error>
                }
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit"
                      [disabled]="loading || otpForm.invalid" class="submit-btn">
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>verified</mat-icon> Verify & Sign In
                }
              </button>
            </form>

            <div class="resend-row">
              <span class="timer-text">
                @if (resendTimer > 0) {
                  Resend OTP in {{ resendTimer }}s
                } @else {
                  Didn't receive the code?
                }
              </span>
              <button mat-button class="resend-btn" [disabled]="resendTimer > 0" (click)="onResendOtp()">
                Resend OTP
              </button>
            </div>
          </div>
        }

        <div class="auth-footer">
          <p>New to OmniCharge? <a routerLink="/auth/register" [queryParams]="returnUrl ? { returnUrl: returnUrl } : {}">Create Account</a></p>
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
      background: radial-gradient(circle, rgba(127,90,240,0.15) 0%, transparent 70%);
      top: -100px; right: -100px; pointer-events: none;
    }
    .auth-bg-decoration-2 {
      position: absolute; width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(44,182,125,0.1) 0%, transparent 70%);
      bottom: -100px; left: -100px; pointer-events: none;
    }
    .auth-card {
      width: 100%; max-width: 440px; padding: 40px;
      background: var(--bg-card) !important;
      border: 1px solid var(--border-subtle);
      backdrop-filter: blur(20px);
      z-index: 1;
    }
    .auth-header { text-align: center; margin-bottom: 32px; }
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

    /* Phone input */
    .phone-input-group {
      display: flex; gap: 12px; align-items: flex-start; margin-bottom: 8px;
    }
    .country-code {
      display: flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle);
      border-radius: 12px; padding: 14px 12px; margin-top: 4px;
      color: var(--text-secondary); font-weight: 600; font-size: 15px; white-space: nowrap;
    }
    .country-code mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .phone-field { flex: 1; }

    /* OTP */
    .otp-section { animation: slideUp 0.4s ease; }
    .sent-to-info {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      background: rgba(44,182,125,0.1); border: 1px solid rgba(44,182,125,0.2);
      border-radius: 12px; padding: 12px 16px; margin-bottom: 24px;
      color: var(--accent-teal); font-size: 14px;
    }
    .sent-to-info mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .change-btn { color: var(--accent-purple) !important; font-size: 13px; margin-left: auto; }
    .otp-field { width: 100%; }
    .otp-input { font-size: 24px !important; letter-spacing: 8px; font-weight: 700; text-align: center; }

    .resend-row {
      display: flex; justify-content: space-between; align-items: center; margin-top: 16px;
    }
    .timer-text { color: var(--text-secondary); font-size: 13px; }
    .resend-btn { color: var(--accent-purple) !important; font-weight: 600; }
    .resend-btn:disabled { opacity: 0.4; }

    .info-text {
      display: flex; align-items: center; gap: 8px;
      color: var(--text-secondary); font-size: 13px; margin-top: 16px;
      padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px;
    }
    .info-text mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--accent-purple); }

    .submit-btn { width: 100%; height: 48px; font-size: 16px; margin-top: 8px; }
    .auth-footer { text-align: center; margin-top: 24px; }
    .auth-footer p { color: var(--text-secondary); font-size: 14px; }
    .auth-footer a { color: var(--accent-teal); text-decoration: none; font-weight: 600; }
    .auth-footer a:hover { text-decoration: underline; }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class LoginComponent {
  phoneForm: FormGroup;
  otpForm: FormGroup;
  step: 'phone' | 'otp' = 'phone';
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
    this.phoneForm = this.fb.group({
      mobileNumber: ['', [Validators.required, Validators.pattern('^[6-9]\\d{9}$')]]
    });
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
    });
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';
  }

  onSendOtp(): void {
    if (this.phoneForm.invalid) return;
    this.loading = true;
    this.cdr.markForCheck();

    this.authService.sendOtp({ mobileNumber: this.phoneForm.value.mobileNumber }).subscribe({
      next: () => {
        this.loading = false;
        this.step = 'otp';
        this.startResendTimer();
        this.cdr.markForCheck();
        this.snackBar.open('OTP sent to your phone!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
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
      mobileNumber: this.phoneForm.value.mobileNumber,
      otp: this.otpForm.value.otp
    };

    this.authService.verifyPhoneOtp(request).subscribe({
      next: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.snackBar.open('Signed in successfully!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });

        if (this.authService.isAdmin()) {
          this.router.navigate(['/admin/dashboard']);
        } else if (this.returnUrl) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.snackBar.open(err.error?.message || 'OTP verification failed', 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
      }
    });
  }

  onResendOtp(): void {
    this.otpForm.reset();
    this.onSendOtp();
  }

  private startResendTimer(): void {
    this.resendTimer = 60; // 1 minute (matches backend rate limit)
    if (this.resendInterval) clearInterval(this.resendInterval);
    this.resendInterval = setInterval(() => {
      this.resendTimer--;
      this.cdr.markForCheck();
      if (this.resendTimer <= 0) {
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }
}
