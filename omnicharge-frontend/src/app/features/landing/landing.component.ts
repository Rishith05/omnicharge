import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { OperatorService } from '../../core/services/operator.service';
import { AuthService } from '../../core/services/auth.service';
import { Operator, Plan } from '../../core/models/operator.model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSelectModule, MatChipsModule, MatSnackBarModule, MatToolbarModule
  ],
  template: `
    <!-- Top Navigation Bar -->
    <nav class="landing-nav glass">
      <div class="nav-inner">
        <div class="nav-logo" routerLink="/">
          <mat-icon class="logo-icon">bolt</mat-icon>
          <span class="logo-text">OmniCharge</span>
        </div>
        <div class="nav-actions">
          @if (isLoggedIn) {
            <span class="nav-greeting">Hi, {{ userName }}</span>
            @if (isAdmin) {
              <button mat-raised-button color="accent" routerLink="/admin/dashboard" class="nav-btn admin-btn">
                <mat-icon>admin_panel_settings</mat-icon> Admin Panel
              </button>
            }
            <button mat-raised-button routerLink="/dashboard" class="nav-btn dashboard-btn">
              <mat-icon>dashboard</mat-icon> Dashboard
            </button>
            <button mat-button (click)="logout()" class="nav-btn logout-btn">
              <mat-icon>logout</mat-icon> Logout
            </button>
          } @else {
            <button mat-button routerLink="/auth/login" class="nav-btn login-btn">
              <mat-icon>login</mat-icon> Sign In
            </button>
            <button mat-raised-button color="primary" routerLink="/auth/register" class="nav-btn signup-btn">
              <mat-icon>person_add</mat-icon> Sign Up
            </button>
          }
        </div>
      </div>
    </nav>

    <div class="landing-page">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-decoration-1"></div>
        <div class="hero-decoration-2"></div>
        <div class="hero-content fade-in">
          <h1 class="hero-title">
            Instant Mobile <span class="gradient-text">Recharge</span>
          </h1>
          <p class="hero-subtitle">
            Recharge any mobile number instantly. Auto-detect operator, choose a plan, and pay securely with Razorpay.
          </p>

          <!-- Number Input Card -->
          <mat-card class="number-card slide-up">
            <form [formGroup]="numberForm" class="number-form">
              <mat-form-field appearance="outline" class="number-field">
                <mat-label>Enter Mobile Number</mat-label>
                <input matInput formControlName="mobileNumber" placeholder="+91 9876543210" maxlength="15"
                       (keyup.enter)="detectOperator()">
                <mat-icon matPrefix>phone</mat-icon>
                @if (numberForm.get('mobileNumber')?.hasError('required') && numberForm.get('mobileNumber')?.touched) {
                  <mat-error>Mobile number is required</mat-error>
                }
                @if (numberForm.get('mobileNumber')?.hasError('pattern') && numberForm.get('mobileNumber')?.touched) {
                  <mat-error>Enter a valid 10-digit mobile number</mat-error>
                }
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="detectOperator()"
                      [disabled]="detecting || numberForm.invalid" class="detect-btn">
                @if (detecting) {
                  <mat-spinner diameter="20"></mat-spinner>
                  Detecting...
                } @else {
                  <ng-container>
                    <mat-icon>search</mat-icon> Detect Operator
                  </ng-container>
                }
              </button>
            </form>
          </mat-card>
        </div>
      </section>

      <!-- Operator Detection Result -->
      @if (detectedOperator) {
        <section class="operator-section slide-up">
          <mat-card class="operator-card">
            <div class="operator-result">
              <mat-icon class="check-icon">check_circle</mat-icon>
              <div class="operator-info">
                <strong>{{ detectedOperator.name }}</strong>
                <span>Operator detected for {{ numberForm.value.mobileNumber }}</span>
              </div>
            </div>

            <!-- Change Operator -->
            <div class="change-operator">
              <mat-form-field appearance="outline" class="operator-select">
                <mat-label>Change Operator</mat-label>
                <mat-select [value]="detectedOperator.id" (selectionChange)="onOperatorChange($event.value)">
                  @for (op of allOperators; track op.id) {
                    <mat-option [value]="op.id">{{ op.name }}</mat-option>
                  }
                </mat-select>
                <mat-icon matPrefix>swap_horiz</mat-icon>
              </mat-form-field>
              <p class="change-hint">Not the right operator? Select the correct one above.</p>
            </div>
          </mat-card>
        </section>
      }

      <!-- Plans Section -->
      @if (detectedOperator && plans.length > 0) {
        <section class="plans-section slide-up">
          <h2 class="section-title">
            <mat-icon>list_alt</mat-icon>
            Plans for <span class="gradient-text">{{ detectedOperator.name }}</span>
          </h2>
          <div class="plans-grid">
            @for (plan of plans; track plan.id) {
              <mat-card class="plan-card" [class.selected]="selectedPlan?.id === plan.id"
                        (click)="selectPlan(plan)">
                <div class="plan-badge">{{ plan.category }}</div>
                <div class="plan-price">₹{{ plan.price }}</div>
                <div class="plan-validity">{{ plan.validity }} Days</div>
                <div class="plan-data">{{ plan.data }}</div>
                <div class="plan-desc">{{ plan.description }}</div>
                @if (selectedPlan?.id === plan.id) {
                  <mat-icon class="plan-check">check_circle</mat-icon>
                }
              </mat-card>
            }
          </div>

          @if (selectedPlan) {
            <div class="proceed-section slide-up">
              <mat-card class="summary-mini glass">
                <div class="summary-row">
                  <span>{{ detectedOperator.name }} • {{ selectedPlan.name }}</span>
                  <strong class="gradient-text">₹{{ selectedPlan.price }}</strong>
                </div>
              </mat-card>
              <button mat-raised-button color="primary" (click)="proceedToPayment()" class="proceed-btn">
                <mat-icon>payment</mat-icon>
                Proceed to Pay ₹{{ selectedPlan.price }}
              </button>
            </div>
          }
        </section>
      }

      @if (detectedOperator && plans.length === 0 && !loadingPlans) {
        <section class="no-plans-section">
          <mat-card class="no-plans-card">
            <mat-icon>info</mat-icon>
            <p>No plans available for this operator at the moment.</p>
          </mat-card>
        </section>
      }

      @if (loadingPlans) {
        <section class="loading-section">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading plans...</p>
        </section>
      }

      <!-- Features Section -->
      <section class="features-section">
        <h2 class="section-title"><mat-icon>star</mat-icon> Why OmniCharge?</h2>
        <div class="features-grid">
          <div class="feature-item">
            <div class="feature-icon purple"><mat-icon>speed</mat-icon></div>
            <h3>Instant Recharge</h3>
            <p>Recharge in seconds with auto-operator detection</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon teal"><mat-icon>security</mat-icon></div>
            <h3>Secure Payments</h3>
            <p>Powered by Razorpay with end-to-end encryption</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon amber"><mat-icon>notifications_active</mat-icon></div>
            <h3>Real-time Alerts</h3>
            <p>Get instant SMS, email & in-app notifications</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon blue"><mat-icon>devices</mat-icon></div>
            <h3>All Operators</h3>
            <p>Jio, Airtel, Vi, BSNL and more supported</p>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    /* Navigation */
    .landing-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: rgba(15, 14, 23, 0.85) !important;
      backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-subtle);
    }
    .nav-inner {
      max-width: 1200px; margin: 0 auto; padding: 12px 24px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .nav-logo {
      display: flex; align-items: center; gap: 10px; cursor: pointer;
      text-decoration: none;
    }
    .logo-icon {
      font-size: 32px; width: 32px; height: 32px;
      background: var(--gradient-primary);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .logo-text {
      font-size: 22px; font-weight: 800; letter-spacing: -0.5px;
      background: var(--gradient-primary);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .nav-actions { display: flex; align-items: center; gap: 12px; }
    .nav-greeting { color: var(--text-secondary); font-size: 14px; margin-right: 4px; }
    .nav-btn { display: flex; align-items: center; gap: 6px; font-size: 14px; }
    .login-btn { color: var(--text-secondary); }
    .login-btn:hover { color: var(--text-primary); }
    .signup-btn { height: 40px; }
    .logout-btn { color: var(--text-secondary); }
    .admin-btn {
      background: rgba(44, 182, 125, 0.2) !important; color: var(--accent-teal) !important;
      border: 1px solid rgba(44, 182, 125, 0.3) !important;
    }
    .dashboard-btn {
      background: rgba(127, 90, 240, 0.15) !important; color: var(--accent-purple) !important;
      border: 1px solid rgba(127, 90, 240, 0.25) !important;
    }

    /* Page */
    .landing-page {
      max-width: 1200px; margin: 0 auto; padding: 0 24px;
      padding-top: 80px;
    }

    /* Hero */
    .hero-section {
      text-align: center; padding: 80px 0 40px; position: relative;
    }
    .hero-decoration-1 {
      position: absolute; width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(127,90,240,0.12) 0%, transparent 70%);
      top: -200px; right: -200px; pointer-events: none;
    }
    .hero-decoration-2 {
      position: absolute; width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(44,182,125,0.10) 0%, transparent 70%);
      bottom: -100px; left: -100px; pointer-events: none;
    }
    .hero-content { position: relative; z-index: 1; }
    .hero-title { font-size: 48px; font-weight: 900; line-height: 1.2; margin-bottom: 16px; }
    .gradient-text {
      background: var(--gradient-primary);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .hero-subtitle {
      font-size: 18px; color: var(--text-secondary); max-width: 600px;
      margin: 0 auto 40px; line-height: 1.6;
    }

    /* Number Card */
    .number-card {
      max-width: 600px; margin: 0 auto; padding: 32px !important;
    }
    .number-form { display: flex; gap: 16px; align-items: flex-start; }
    .number-field { flex: 1; }
    .detect-btn {
      height: 56px; min-width: 180px; display: flex; align-items: center; gap: 8px;
      white-space: nowrap; margin-top: 4px;
    }

    /* Operator */
    .operator-section { max-width: 600px; margin: 24px auto; }
    .operator-card { padding: 24px !important; }
    .operator-result {
      display: flex; align-items: center; gap: 12px;
      padding: 16px; background: rgba(44,182,125,0.1);
      border-radius: var(--radius-sm); border: 1px solid rgba(44,182,125,0.3);
    }
    .check-icon { color: var(--accent-teal); font-size: 28px; width: 28px; height: 28px; }
    .operator-info span { color: var(--text-secondary); font-size: 13px; display: block; }
    .change-operator {
      margin-top: 16px; padding: 16px;
      background: rgba(127,90,240,0.05); border-radius: var(--radius-sm);
      border: 1px solid rgba(127,90,240,0.15);
    }
    .operator-select { width: 100%; }
    .change-hint { color: var(--text-secondary); font-size: 12px; margin-top: -8px; margin-bottom: 0; }

    /* Plans */
    .plans-section { margin: 40px 0; }
    .section-title {
      display: flex; align-items: center; gap: 12px;
      font-size: 24px; font-weight: 800; margin-bottom: 24px;
    }
    .plans-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
    }
    .plan-card {
      padding: 24px !important; cursor: pointer; transition: var(--transition);
      border: 2px solid transparent; position: relative; overflow: hidden;
    }
    .plan-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-glow); }
    .plan-card.selected {
      border-color: var(--accent-purple);
      box-shadow: 0 0 30px rgba(127,90,240,0.25);
    }
    .plan-badge {
      position: absolute; top: 12px; right: 12px;
      font-size: 11px; font-weight: 700; padding: 3px 10px;
      border-radius: 20px; background: rgba(127,90,240,0.2); color: var(--accent-purple);
    }
    .plan-price {
      font-size: 32px; font-weight: 900;
      background: var(--gradient-primary);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .plan-validity { font-size: 14px; font-weight: 600; color: var(--accent-teal); margin: 4px 0; }
    .plan-data { font-size: 16px; font-weight: 600; margin: 4px 0; }
    .plan-desc { font-size: 13px; color: var(--text-secondary); margin: 8px 0 0; }
    .plan-check {
      position: absolute; bottom: 12px; right: 12px;
      color: var(--accent-teal); font-size: 24px; width: 24px; height: 24px;
    }

    /* Proceed */
    .proceed-section {
      display: flex; align-items: center; gap: 20px;
      margin-top: 32px; justify-content: center; flex-wrap: wrap;
    }
    .summary-mini { padding: 16px 24px !important; }
    .summary-row {
      display: flex; align-items: center; gap: 16px;
    }
    .summary-row span { color: var(--text-secondary); }
    .summary-row strong { font-size: 20px; }
    .proceed-btn {
      height: 52px; font-size: 16px; min-width: 260px;
      display: flex; align-items: center; gap: 8px;
    }

    /* No Plans */
    .no-plans-section { text-align: center; margin: 40px 0; }
    .no-plans-card {
      padding: 40px !important; display: flex; align-items: center;
      justify-content: center; gap: 12px; max-width: 500px; margin: 0 auto;
    }
    .no-plans-card mat-icon { color: var(--text-secondary); }
    .no-plans-card p { color: var(--text-secondary); margin: 0; }

    /* Loading */
    .loading-section {
      text-align: center; padding: 40px; display: flex;
      flex-direction: column; align-items: center; gap: 16px;
    }
    .loading-section p { color: var(--text-secondary); }

    /* Features */
    .features-section {
      margin: 80px 0 60px; padding-top: 40px;
      border-top: 1px solid var(--border-subtle);
    }
    .features-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 24px;
    }
    .feature-item {
      padding: 28px; border-radius: var(--radius);
      background: var(--bg-card); border: 1px solid var(--border-subtle);
      transition: var(--transition);
    }
    .feature-item:hover { transform: translateY(-4px); box-shadow: var(--shadow-glow); }
    .feature-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 16px;
    }
    .feature-icon.purple { background: rgba(127,90,240,0.2); color: var(--accent-purple); }
    .feature-icon.teal { background: rgba(44,182,125,0.2); color: var(--accent-teal); }
    .feature-icon.amber { background: rgba(255,137,6,0.2); color: var(--accent-amber); }
    .feature-icon.blue { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .feature-item h3 { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
    .feature-item p { color: var(--text-secondary); font-size: 13px; line-height: 1.5; }

    /* Responsive */
    @media (max-width: 768px) {
      .landing-nav { position: relative; padding: 12px 0; }
      .landing-page { padding-top: 24px; padding-left: 12px; padding-right: 12px; }
      .hero-section { padding-top: 20px; }
      .hero-title { font-size: 32px; }
      .hero-subtitle { font-size: 15px; }
      .number-form { flex-direction: column; }
      .detect-btn { width: 100%; margin-top: 12px; }
      .nav-inner { flex-direction: column; gap: 16px; }
      .nav-actions { flex-wrap: wrap; justify-content: center; gap: 8px; }
      .nav-greeting { display: none; }
      .proceed-section { flex-direction: column; width: 100%; }
      .proceed-btn { width: 100%; }
      .summary-mini { width: 100%; }
    }
  `]
})
export class LandingComponent implements OnInit {
  numberForm: FormGroup;
  detectedOperator: Operator | null = null;
  allOperators: Operator[] = [];
  plans: Plan[] = [];
  selectedPlan: Plan | null = null;
  detecting = false;
  loadingPlans = false;
  isLoggedIn = false;
  isAdmin = false;
  userName = '';

  constructor(
    private fb: FormBuilder,
    private operatorService: OperatorService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.numberForm = this.fb.group({
      mobileNumber: ['', [Validators.required, Validators.pattern(/^[\+]?[0-9\s\-\(\)]{10,15}$/)]]
    });
  }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isAdmin = this.authService.isAdmin();
    this.userName = this.authService.getCurrentUser()?.fullName || '';
    this.cdr.markForCheck();

    // Load all operators for the dropdown
    this.operatorService.getAllOperators().subscribe({
      next: (operators) => {
        this.allOperators = operators;
        this.cdr.markForCheck();
      }
    });

    // Restore recharge context if returning from login
    const savedContext = localStorage.getItem('omni_recharge_context');
    if (savedContext && this.isLoggedIn) {
      try {
        const ctx = JSON.parse(savedContext);
        this.numberForm.patchValue({ mobileNumber: ctx.mobileNumber });
        if (ctx.operatorId) {
          // Auto-detect again
          this.detectOperator();
        }
        localStorage.removeItem('omni_recharge_context');
      } catch { /* ignore */ }
    }
  }

  detectOperator(): void {
    if (this.numberForm.invalid) return;
    this.detecting = true;
    this.selectedPlan = null;
    this.plans = [];
    this.cdr.markForCheck();

    this.operatorService.detectOperator(this.numberForm.value.mobileNumber).subscribe({
      next: (res) => {
        this.detectedOperator = res.operator;
        this.detecting = false;
        this.cdr.markForCheck();
        this.loadPlans(res.operator.id);
      },
      error: (err) => {
        this.detecting = false;
        this.cdr.markForCheck();
        this.snackBar.open(err.error?.message || 'Could not detect operator. Please try again.', 'Close',
          { duration: 4000, panelClass: ['error-snackbar'] });
      }
    });
  }

  onOperatorChange(operatorId: number): void {
    const op = this.allOperators.find(o => o.id === operatorId);
    if (op) {
      this.detectedOperator = op;
      this.selectedPlan = null;
      this.plans = [];
      this.cdr.markForCheck();
      this.loadPlans(op.id);
    }
  }

  loadPlans(operatorId: number): void {
    this.loadingPlans = true;
    this.cdr.markForCheck();
    this.operatorService.getPlansByOperator(operatorId).subscribe({
      next: (plans) => {
        this.plans = plans;
        this.loadingPlans = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingPlans = false;
        this.cdr.markForCheck();
      }
    });
  }

  selectPlan(plan: Plan): void {
    this.selectedPlan = plan;
    this.cdr.markForCheck();
  }

  proceedToPayment(): void {
    if (!this.selectedPlan || !this.detectedOperator) return;

    // Save recharge context for post-login restoration
    const context = {
      mobileNumber: this.numberForm.value.mobileNumber,
      operatorId: this.detectedOperator.id,
      operatorName: this.detectedOperator.name,
      planId: this.selectedPlan.id,
      planName: this.selectedPlan.name,
      planPrice: this.selectedPlan.price,
      planData: this.selectedPlan.data,
      planValidity: this.selectedPlan.validity
    };
    localStorage.setItem('omni_recharge_context', JSON.stringify(context));

    if (!this.authService.isLoggedIn()) {
      // Redirect to login with return URL
      this.snackBar.open('Please sign in to continue with your recharge', 'Close',
        { duration: 3000, panelClass: ['success-snackbar'] });
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/recharge' }
      });
    } else {
      // Directly go to recharge page
      this.router.navigate(['/recharge']);
    }
  }

  logout(): void {
    this.authService.logout();
    this.isLoggedIn = false;
    this.isAdmin = false;
    this.userName = '';
    this.cdr.markForCheck();
  }
}
