import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatDividerModule
  ],
  template: `
    <div class="profile-page fade-in">
      <h1 class="page-title"><mat-icon>person</mat-icon> My Profile</h1>

      <div class="profile-grid">
        <mat-card class="profile-info-card">
          <div class="avatar-section">
            <div class="avatar">
              <mat-icon>account_circle</mat-icon>
            </div>
            <h2>{{ user?.fullName }}</h2>
            <span class="role-badge">{{ user?.role === 'ROLE_ADMIN' ? 'Admin' : 'User' }}</span>
            <p>{{ user?.email }}</p>
          </div>
          <mat-divider></mat-divider>
          <div class="info-rows">
            <div class="info-row"><span>Mobile</span><strong>{{ user?.mobileNumber || 'Not set' }}</strong></div>
            <div class="info-row"><span>Auth Provider</span><strong>{{ user?.authProvider }}</strong></div>
            <div class="info-row"><span>Joined</span><strong>{{ user?.createdAt | date:'mediumDate' }}</strong></div>
          </div>
        </mat-card>

        <div class="forms-col">
          <mat-card class="form-card">
            <h3>Update Profile</h3>
            <form [formGroup]="profileForm" (ngSubmit)="updateProfile()">
              <mat-form-field appearance="outline">
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="fullName">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Mobile Number</mat-label>
                <input matInput formControlName="mobileNumber">
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit">Save Changes</button>
            </form>
          </mat-card>

          <mat-card class="form-card">
            <h3>Change Password</h3>
            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
              <mat-form-field appearance="outline">
                <mat-label>Current Password</mat-label>
                <input matInput formControlName="currentPassword" type="password">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>New Password</mat-label>
                <input matInput formControlName="newPassword" type="password">
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit">Update Password</button>
            </form>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page { max-width: 1000px; margin: 0 auto; }
    .page-title { display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 800; margin-bottom: 24px; }
    .profile-grid { display: grid; grid-template-columns: 320px 1fr; gap: 24px; }
    .profile-info-card { padding: 32px; text-align: center; }
    .avatar { margin-bottom: 12px; }
    .avatar mat-icon { font-size: 80px; width: 80px; height: 80px; color: var(--accent-purple); }
    .profile-info-card h2 { font-size: 20px; font-weight: 700; }
    .role-badge {
      display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 12px;
      border-radius: 20px; background: rgba(127,90,240,0.2); color: var(--accent-purple);
      margin: 6px 0; text-transform: uppercase; letter-spacing: 1px;
    }
    .profile-info-card p { color: var(--text-secondary); font-size: 14px; }
    .info-rows { padding: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; }
    .info-row span { color: var(--text-secondary); font-size: 14px; }
    .forms-col { display: flex; flex-direction: column; gap: 20px; }
    .form-card { padding: 28px; }
    .form-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 16px; }
    @media (max-width: 768px) { .profile-grid { grid-template-columns: 1fr; } }
  `]
})
export class ProfileComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  user: User | null = null;
  profileForm: FormGroup;
  passwordForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      mobileNumber: ['']
    });
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /** CanDeactivate guard — checks if profile or password form has unsaved changes */
  hasUnsavedChanges(): boolean {
    return this.profileForm.dirty || this.passwordForm.dirty;
  }

  ngOnInit(): void {
    this.userService.getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.user = user;
          this.profileForm.patchValue({ fullName: user.fullName, mobileNumber: user.mobileNumber });
          // Mark as pristine since we just loaded the data
          this.profileForm.markAsPristine();
        }
      });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) return;
    this.userService.updateProfile(this.profileForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          this.user = updatedUser;
          this.profileForm.markAsPristine();
          this.snackBar.open('Profile updated!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Update failed', 'Close', { duration: 4000, panelClass: ['error-snackbar'] })
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.userService.changePassword(this.passwordForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Password changed!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.passwordForm.reset();
          this.passwordForm.markAsPristine();
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Password change failed', 'Close', { duration: 4000, panelClass: ['error-snackbar'] })
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
