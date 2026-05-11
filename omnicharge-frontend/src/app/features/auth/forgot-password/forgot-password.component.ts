import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatStepperModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card slide-up">
        <div class="auth-header">
          <mat-icon class="auth-logo">lock_reset</mat-icon>
          <h1>Reset Password</h1>
          <p>We'll send you a 6-digit OTP</p>
        </div>

        <mat-stepper [linear]="true" #stepper>
          <!-- Step 1: Email -->
          <mat-step [stepControl]="emailForm">
            <form [formGroup]="emailForm" (ngSubmit)="sendOtp()">
              <ng-template matStepLabel>Email</ng-template>
              <mat-form-field appearance="outline">
                <mat-label>Email Address</mat-label>
                <input matInput formControlName="email" type="email" />
                <mat-icon matPrefix>email</mat-icon>
              </mat-form-field>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="loading"
                class="submit-btn"
              >
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Send OTP
                }
              </button>
            </form>
          </mat-step>

          <!-- Step 2: OTP + New Password -->
          <mat-step [stepControl]="resetForm">
            <form [formGroup]="resetForm" (ngSubmit)="resetPassword()">
              <ng-template matStepLabel>Reset</ng-template>
              <mat-form-field appearance="outline">
                <mat-label>OTP Code</mat-label>
                <input matInput formControlName="otp" placeholder="6-digit code" />
                <mat-icon matPrefix>pin</mat-icon>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>New Password</mat-label>
                <input matInput formControlName="newPassword" type="password" />
                <mat-icon matPrefix>lock</mat-icon>
              </mat-form-field>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="loading"
                class="submit-btn"
              >
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Reset Password
                }
              </button>
            </form>
          </mat-step>
        </mat-stepper>

        <div class="auth-footer">
          <p><a routerLink="/auth/login">← Back to Login</a></p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .auth-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: var(--bg-primary);
      }
      .auth-card {
        width: 100%;
        max-width: 480px;
        padding: 40px;
        background: var(--bg-card) !important;
        border: 1px solid var(--border-subtle);
        backdrop-filter: blur(20px);
      }
      .auth-header {
        text-align: center;
        margin-bottom: 24px;
      }
      .auth-logo {
        font-size: 48px;
        width: 48px;
        height: 48px;
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .auth-header h1 {
        font-size: 24px;
        font-weight: 800;
        margin-top: 8px;
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .auth-header p {
        color: var(--text-secondary);
        font-size: 14px;
      }
      .submit-btn {
        width: 100%;
        height: 44px;
        margin-top: 8px;
      }
      .auth-footer {
        text-align: center;
        margin-top: 24px;
      }
      .auth-footer a {
        color: var(--accent-purple);
        text-decoration: none;
      }
    `,
  ],
})
export class ForgotPasswordComponent {
  @ViewChild('stepper') stepper!: MatStepper;
  emailForm: FormGroup;
  resetForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.emailForm = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
    this.resetForm = this.fb.group({
      otp: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  sendOtp(): void {
    if (this.emailForm.invalid) return;
    this.loading = true;
    this.authService.forgotPassword(this.emailForm.value).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('OTP sent to your email!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.stepper.next();
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Failed to send OTP', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  resetPassword(): void {
    if (this.resetForm.invalid) return;
    this.loading = true;
    const data = { email: this.emailForm.value.email, ...this.resetForm.value };
    this.authService.resetPassword(data).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Password reset! Please login.', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Reset failed', 'Close', {
          duration: 4000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }
}
