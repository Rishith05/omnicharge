import { Component, ViewChild, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { OperatorService } from '../../core/services/operator.service';
import { RechargeService } from '../../core/services/recharge.service';
import { PaymentService } from '../../core/services/payment.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { Operator, Plan } from '../../core/models/operator.model';
import { Recharge } from '../../core/models/recharge.model';
import { Subject, takeUntil } from 'rxjs';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';

/**
 * RECHARGE FLOW (no OTP before payment):
 *
 *  Step 1: ENTER NUMBER        → Enter mobile number, auto-detect operator
 *  Step 2: SELECT PLAN         → Select from available recharge plans
 *  Step 3: PAY                 → Click Pay → Razorpay Payment directly
 *
 *  SAGA PATTERN orchestration for recharge payment:
 *    Step 1: INITIATE_RECHARGE  → rechargeService.initiateRecharge()
 *    Step 2: CREATE_ORDER       → paymentService.createOrder()
 *    Step 3: RAZORPAY_CHECKOUT  → paymentService.openRazorpayCheckout()
 *    Step 4: VERIFY_PAYMENT     → paymentService.verifyPayment()
 *    Step 5: COMPLETE_RECHARGE  → rechargeService.completeRecharge()
 *    Step 6: SEND_NOTIFICATIONS → notificationService.sendPaymentNotifications()
 */

@Component({
  selector: 'app-recharge',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatStepperModule,
    MatProgressBarModule, MatRadioModule, MatChipsModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatSelectModule
  ],
  template: `
    <div class="recharge-page fade-in">
      <h1 class="page-title">
        <mat-icon>phone_android</mat-icon>
        Mobile Recharge
      </h1>

      <mat-stepper [linear]="true" #stepper>
        <!-- Step 1: Enter Mobile Number -->
        <mat-step [stepControl]="numberForm">
          <ng-template matStepLabel>Mobile Number</ng-template>
          <mat-card class="step-card">
            <h2>Enter Mobile Number</h2>
            <p class="step-desc">We'll auto-detect your operator</p>
            <form [formGroup]="numberForm">
              <mat-form-field appearance="outline">
                <mat-label>Mobile Number</mat-label>
                <input matInput formControlName="mobileNumber" placeholder="+91 9876543210" maxlength="15">
                <mat-icon matPrefix>phone</mat-icon>
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="detectOperator()" [disabled]="detecting" class="action-btn">
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

            @if (detectedOperator) {
              <div class="operator-result slide-up">
                <mat-icon class="check-icon">check_circle</mat-icon>
                <div class="operator-info">
                  <strong>{{ detectedOperator.name }}</strong>
                  <span>Operator detected successfully</span>
                </div>
              </div>

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

              <button mat-raised-button color="accent" matStepperNext class="action-btn next-btn">
                <mat-icon>arrow_forward</mat-icon> Continue to Plans
              </button>
            }
          </mat-card>
        </mat-step>

        <!-- Step 2: Select Plan -->
        <mat-step [stepControl]="planForm">
          <ng-template matStepLabel>Choose Plan</ng-template>
          <mat-card class="step-card">
            <h2>Select a Plan</h2>
            <p class="step-desc">
              Plans for <strong>{{ detectedOperator?.name }}</strong>
            </p>

            @if (loadingPlans) {
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            }

            <div class="plans-grid">
              @for (plan of plans; track plan.id) {
                <mat-card class="plan-card" [class.selected]="selectedPlan?.id === plan.id"
                          (click)="selectPlan(plan)">
                  <div class="plan-price">₹{{ plan.price }}</div>
                  <div class="plan-validity">{{ plan.validity }} Days</div>
                  <div class="plan-data">{{ plan.data }}</div>
                  <div class="plan-desc">{{ plan.description }}</div>
                  <mat-chip class="plan-category">{{ plan.category }}</mat-chip>
                </mat-card>
              }
            </div>

            @if (plans.length === 0 && !loadingPlans) {
              <div class="no-plans">
                <mat-icon>info</mat-icon>
                <p>No plans available for this operator.</p>
              </div>
            }

            <div class="step-actions">
              <button mat-button matStepperPrevious class="back-btn">
                <mat-icon>arrow_back</mat-icon> Back
              </button>
              @if (selectedPlan) {
                <button mat-raised-button color="primary" matStepperNext class="action-btn">
                  Continue with ₹{{ selectedPlan.price }}
                </button>
              }
            </div>
          </mat-card>
        </mat-step>

        <!-- Step 3: Payment (direct Saga orchestrator) -->
        <mat-step>
          <ng-template matStepLabel>Payment</ng-template>
          <mat-card class="step-card">
            @if (!paymentSuccess) {
              <h2>Confirm & Pay</h2>

              <!-- Saga Progress Tracker -->
              @if (sagaStep) {
                <div class="saga-tracker slide-up">
                  <div class="saga-step" [class.active]="sagaStep === 'INITIATE'" [class.done]="sagaStepDone('INITIATE')">
                    <mat-icon>{{ sagaStepDone('INITIATE') ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                    <span>Initiating Recharge</span>
                  </div>
                  <div class="saga-line"></div>
                  <div class="saga-step" [class.active]="sagaStep === 'ORDER'" [class.done]="sagaStepDone('ORDER')">
                    <mat-icon>{{ sagaStepDone('ORDER') ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                    <span>Creating Payment Order</span>
                  </div>
                  <div class="saga-line"></div>
                  <div class="saga-step" [class.active]="sagaStep === 'CHECKOUT'" [class.done]="sagaStepDone('CHECKOUT')">
                    <mat-icon>{{ sagaStepDone('CHECKOUT') ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                    <span>Razorpay Checkout</span>
                  </div>
                  <div class="saga-line"></div>
                  <div class="saga-step" [class.active]="sagaStep === 'VERIFY'" [class.done]="sagaStepDone('VERIFY')">
                    <mat-icon>{{ sagaStepDone('VERIFY') ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                    <span>Verifying Payment</span>
                  </div>
                  <div class="saga-line"></div>
                  <div class="saga-step" [class.active]="sagaStep === 'COMPLETE'" [class.done]="sagaStepDone('COMPLETE')">
                    <mat-icon>{{ sagaStepDone('COMPLETE') ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                    <span>Completing Recharge</span>
                  </div>
                  <div class="saga-line"></div>
                  <div class="saga-step" [class.active]="sagaStep === 'NOTIFY'" [class.done]="sagaStepDone('NOTIFY')">
                    <mat-icon>{{ sagaStepDone('NOTIFY') ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                    <span>Sending Notifications</span>
                  </div>
                </div>
              }

              @if (selectedPlan && detectedOperator && !sagaStep) {
                <div class="summary-card glass">
                  <div class="summary-row">
                    <span>Mobile Number</span>
                    <strong>{{ numberForm.value.mobileNumber }}</strong>
                  </div>
                  <div class="summary-row">
                    <span>Operator</span>
                    <strong>{{ detectedOperator.name }}</strong>
                  </div>
                  <div class="summary-row">
                    <span>Plan</span>
                    <strong>{{ selectedPlan.name }} • {{ selectedPlan.data }} • {{ selectedPlan.validity }} Days</strong>
                  </div>
                  <div class="summary-row total">
                    <span>Amount</span>
                    <strong>₹{{ selectedPlan.price }}</strong>
                  </div>
                </div>

                <div class="payment-method">
                  <mat-icon class="razorpay-icon">account_balance</mat-icon>
                  <span>Pay via <strong>Razorpay</strong></span>
                </div>

                <div class="step-actions">
                  <button mat-button matStepperPrevious class="back-btn">
                    <mat-icon>arrow_back</mat-icon> Back
                  </button>
                  <button mat-raised-button color="primary" (click)="executeSaga()" [disabled]="processing" class="action-btn pay-btn">
                    @if (processing) {
                      <mat-spinner diameter="20"></mat-spinner>
                      Processing...
                    } @else {
                      <ng-container>
                        <mat-icon>payment</mat-icon> Pay ₹{{ selectedPlan.price }}
                      </ng-container>
                    }
                  </button>
                </div>
              }
            } @else {
              <!-- Payment Success -->
              <div class="payment-success slide-up">
                <div class="success-icon-wrap">
                  <mat-icon>check_circle</mat-icon>
                </div>
                <h2>Payment & Recharge Successful!</h2>
                <p class="txn-id">Transaction ID: {{ transactionId }}</p>

                <div class="success-notifications">
                  <div class="success-notif">
                    <mat-icon class="notif-icon payment">payment</mat-icon>
                    <div>
                      <strong>Payment Successful</strong>
                      <span>₹{{ selectedPlan?.price }} paid via Razorpay</span>
                    </div>
                  </div>
                  <div class="success-notif">
                    <mat-icon class="notif-icon recharge">phone_android</mat-icon>
                    <div>
                      <strong>Recharge Successful</strong>
                      <span>{{ detectedOperator?.name }} {{ selectedPlan?.data }} activated for {{ numberForm.value.mobileNumber }}</span>
                    </div>
                  </div>
                  <div class="success-notif">
                    <mat-icon class="notif-icon sms">sms</mat-icon>
                    <div>
                      <strong>SMS Sent</strong>
                      <span>Confirmation sent to {{ numberForm.value.mobileNumber }}</span>
                    </div>
                  </div>
                  <div class="success-notif">
                    <mat-icon class="notif-icon email">email</mat-icon>
                    <div>
                      <strong>Email Sent</strong>
                      <span>Confirmation sent to {{ userEmail }}</span>
                    </div>
                  </div>
                </div>

                <div class="success-actions">
                  <button mat-raised-button color="primary" (click)="goToDashboard()" class="action-btn">
                    <mat-icon>dashboard</mat-icon> Go to Dashboard
                  </button>
                  <button mat-stroked-button (click)="resetFlow()" class="action-btn">
                    <mat-icon>refresh</mat-icon> New Recharge
                  </button>
                </div>
              </div>
            }
          </mat-card>
        </mat-step>
      </mat-stepper>
    </div>
  `,
  styles: [`
    .recharge-page { max-width: 900px; margin: 0 auto; }
    .page-title {
      display: flex; align-items: center; gap: 12px;
      font-size: 24px; font-weight: 800; margin-bottom: 24px;
    }
    .step-card { padding: 32px; margin-top: 16px; }
    .step-card h2 { font-size: 20px; font-weight: 700; }
    .step-desc { color: var(--text-secondary); font-size: 14px; margin-bottom: 20px; }
    .action-btn {
      display: flex; align-items: center; gap: 8px;
      height: 44px; margin-top: 16px;
    }
    .next-btn { margin-top: 20px; }
    .operator-result {
      display: flex; align-items: center; gap: 12px;
      margin-top: 20px; padding: 16px;
      background: rgba(44,182,125,0.1);
      border-radius: var(--radius-sm);
      border: 1px solid rgba(44,182,125,0.3);
    }
    .check-icon { color: var(--accent-teal); font-size: 28px; width: 28px; height: 28px; }
    .operator-info span { color: var(--text-secondary); font-size: 13px; display: block; }
    .change-operator {
      margin-top: 16px; padding: 16px;
      background: rgba(127,90,240,0.05);
      border-radius: var(--radius-sm);
      border: 1px solid rgba(127,90,240,0.15);
    }
    .operator-select { width: 100%; }
    .change-hint { color: var(--text-secondary); font-size: 12px; margin-top: -8px; margin-bottom: 0; }
    .plans-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px; margin: 20px 0;
    }
    .plan-card {
      padding: 20px; cursor: pointer;
      transition: var(--transition);
      border: 2px solid transparent;
    }
    .plan-card:hover { transform: translateY(-2px); }
    .plan-card.selected {
      border-color: var(--accent-purple);
      box-shadow: 0 0 20px rgba(127,90,240,0.2);
    }
    .plan-price {
      font-size: 28px; font-weight: 800;
      background: var(--gradient-primary);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .plan-validity { font-size: 14px; font-weight: 600; color: var(--accent-teal); margin: 4px 0; }
    .plan-data { font-size: 15px; font-weight: 600; }
    .plan-desc { font-size: 12px; color: var(--text-secondary); margin: 8px 0; }
    .plan-category { font-size: 11px; }
    .no-plans {
      display: flex; align-items: center; gap: 8px;
      padding: 24px; color: var(--text-secondary); justify-content: center;
    }
    .step-actions {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 20px; gap: 12px;
    }
    .back-btn { display: flex; align-items: center; gap: 4px; }
    .summary-card { padding: 24px; margin: 20px 0; }
    .summary-row {
      display: flex; justify-content: space-between;
      padding: 12px 0; border-bottom: 1px solid var(--border-subtle);
    }
    .summary-row span { color: var(--text-secondary); }
    .summary-row.total { border-bottom: none; font-size: 18px; }
    .summary-row.total strong {
      background: var(--gradient-primary);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .payment-method {
      display: flex; align-items: center; gap: 12px;
      padding: 16px; margin-top: 12px;
      background: rgba(59,130,246,0.1);
      border-radius: var(--radius-sm);
      border: 1px solid rgba(59,130,246,0.2);
    }
    .razorpay-icon { color: #3b82f6; }
    .pay-btn { height: 52px; font-size: 16px; }

    /* Saga Progress Tracker */
    .saga-tracker {
      display: flex; align-items: center; justify-content: center;
      gap: 0; padding: 28px 16px; margin: 20px 0;
      background: var(--bg-glass); border-radius: var(--radius-sm);
      flex-wrap: wrap;
    }
    .saga-step {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      opacity: 0.35; transition: all 0.3s ease;
    }
    .saga-step.active { opacity: 1; }
    .saga-step.active mat-icon { color: var(--accent-amber); animation: pulse 1s infinite; }
    .saga-step.done { opacity: 1; }
    .saga-step.done mat-icon { color: var(--accent-teal); }
    .saga-step span { font-size: 11px; font-weight: 600; text-align: center; max-width: 80px; }
    .saga-line {
      width: 24px; height: 2px; background: var(--border-subtle); margin: 0 4px;
      margin-bottom: 20px;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }

    /* Payment Success */
    .payment-success { text-align: center; padding: 20px 0; }
    .success-icon-wrap mat-icon {
      font-size: 72px; width: 72px; height: 72px;
      color: var(--accent-teal);
    }
    .payment-success h2 {
      font-size: 24px; font-weight: 800; margin-top: 16px;
      color: var(--accent-teal);
    }
    .txn-id { color: var(--text-secondary); font-size: 13px; margin-top: 4px; font-family: monospace; }
    .success-notifications {
      display: flex; flex-direction: column; gap: 12px;
      margin: 28px 0; text-align: left;
    }
    .success-notif {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 16px; border-radius: var(--radius-sm);
      background: var(--bg-glass);
    }
    .success-notif div { display: flex; flex-direction: column; }
    .success-notif strong { font-size: 14px; }
    .success-notif span { color: var(--text-secondary); font-size: 13px; margin-top: 2px; }
    .notif-icon.payment { color: var(--accent-teal); }
    .notif-icon.recharge { color: var(--accent-purple); }
    .notif-icon.sms { color: var(--accent-amber); }
    .notif-icon.email { color: #3b82f6; }
    .success-actions {
      display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .recharge-page { padding: 12px; }
      .step-card { padding: 20px 16px; }
      .page-title { font-size: 20px; }
      .plans-grid { grid-template-columns: 1fr; }
      .saga-tracker { padding: 16px 8px; flex-direction: column; align-items: flex-start; gap: 12px; }
      .saga-step { flex-direction: row; align-items: center; justify-content: flex-start; width: 100%; gap: 12px; }
      .saga-step span { text-align: left; max-width: none; font-size: 13px; }
      .saga-line { width: 2px; height: 16px; margin: 0 0 0 11px; }
      .success-actions { flex-direction: column; width: 100%; }
      .success-actions button { width: 100%; }
      .step-actions { flex-direction: column-reverse; }
      .step-actions button { width: 100%; }
      .summary-card { padding: 16px; }
    }
  `]
})
export class RechargeComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  @ViewChild('stepper') stepper!: MatStepper;

  numberForm: FormGroup;
  planForm: FormGroup;
  detectedOperator: Operator | null = null;
  allOperators: Operator[] = [];
  plans: Plan[] = [];
  selectedPlan: Plan | null = null;
  detecting = false;
  loadingPlans = false;
  processing = false;
  paymentSuccess = false;
  transactionId = '';
  userEmail = '';

  // Saga state
  sagaStep: string | null = null;
  sagaStepsCompleted: string[] = [];
  currentRecharge: Recharge | null = null;

  users: any[] = [];
  operators: any[] = [];
  private readonly SAGA_STEPS = ['INITIATE', 'ORDER', 'CHECKOUT', 'VERIFY', 'COMPLETE', 'NOTIFY'];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private operatorService: OperatorService,
    private rechargeService: RechargeService,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.numberForm = this.fb.group({ mobileNumber: ['', Validators.required] });
    this.planForm = this.fb.group({ planId: ['', Validators.required] });
  }

  ngOnInit(): void {
    this.userEmail = this.authService.getCurrentUser()?.email || 'user@omnicharge.com';
    this.operatorService.getAllOperators()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (operators) => {
          this.allOperators = operators;
          this.cdr.markForCheck();
          this.restoreRechargeContext();
        }
      });
  }

  hasUnsavedChanges(): boolean {
    if (this.paymentSuccess) return false;
    if (this.processing) return true;
    return (this.numberForm.dirty && !!this.detectedOperator) || !!this.selectedPlan;
  }

  private restoreRechargeContext(): void {
    const savedContext = localStorage.getItem('omni_recharge_context');
    if (!savedContext) return;

    try {
      const ctx = JSON.parse(savedContext);
      localStorage.removeItem('omni_recharge_context');

      if (ctx.mobileNumber) {
        this.numberForm.patchValue({ mobileNumber: ctx.mobileNumber });
      }
      if (ctx.operatorId) {
        const op = this.allOperators.find(o => o.id === ctx.operatorId);
        if (op) {
          this.detectedOperator = op;
          this.loadPlans(op.id);

          if (ctx.planId) {
            const planCheckInterval = setInterval(() => {
              if (this.plans.length > 0) {
                clearInterval(planCheckInterval);
                const plan = this.plans.find(p => p.id === ctx.planId);
                if (plan) {
                  this.selectPlan(plan);
                  setTimeout(() => {
                    if (this.stepper) {
                      this.stepper.selectedIndex = 2;
                      this.cdr.markForCheck();
                    }
                  }, 100);
                }
              }
            }, 100);
            setTimeout(() => clearInterval(planCheckInterval), 5000);
          }
        }
      }
      this.cdr.markForCheck();
    } catch { /* ignore corrupt context */ }
  }

  getRechargeNumber(): string {
    const rawNumber = this.numberForm.value.mobileNumber || '';
    let cleanNumber = rawNumber.replace(/\D/g, '');
    if (cleanNumber.length > 10) {
      cleanNumber = cleanNumber.slice(-10);
    }
    return cleanNumber;
  }

  sagaStepDone(step: string): boolean {
    return this.sagaStepsCompleted.includes(step);
  }

  detectOperator(): void {
    if (this.numberForm.invalid) return;
    const cleanNumber = this.getRechargeNumber();

    this.detecting = true;
    this.selectedPlan = null;
    this.plans = [];
    this.cdr.markForCheck();

    this.operatorService.detectOperator(cleanNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.detectedOperator = res.operator;
          this.detecting = false;
          this.cdr.markForCheck();
          this.loadPlans(res.operator.id);
        },
        error: (err) => {
          this.detecting = false;
          this.cdr.markForCheck();
          this.snackBar.open(err.error?.message || 'Detection failed', 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
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
    this.operatorService.getPlansByOperator(operatorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          this.plans = plans;
          this.loadingPlans = false;
          this.cdr.markForCheck();
        },
        error: () => { this.loadingPlans = false; this.cdr.markForCheck(); }
      });
  }

  selectPlan(plan: Plan): void {
    this.selectedPlan = plan;
    this.planForm.patchValue({ planId: plan.id });
    this.cdr.markForCheck();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // ─── SAGA ORCHESTRATOR (directly on "Pay" click) ────────────────
  executeSaga(): void {
    if (!this.selectedPlan || !this.detectedOperator) return;
    this.processing = true;
    this.sagaStep = 'INITIATE';
    this.sagaStepsCompleted = [];
    this.cdr.markForCheck();

    const cleanNumber = this.getRechargeNumber();

    // SAGA Step 1: INITIATE_RECHARGE
    this.rechargeService.initiateRecharge({
      mobileNumber: cleanNumber,
      planId: this.selectedPlan.id,
      paymentMethod: 'RAZORPAY',
      operatorId: this.detectedOperator.id,
      operatorName: this.detectedOperator.name,
      planName: this.selectedPlan.name,
      amount: this.selectedPlan.price
    }).subscribe({
      next: (recharge) => {
        this.currentRecharge = recharge;
        this.sagaStepsCompleted.push('INITIATE');
        this.sagaStep = 'ORDER';
        this.cdr.markForCheck();

        // SAGA Step 2: CREATE_ORDER
        const paymentPayload = {
          rechargeId: recharge.rechargeId,
          amount: Number(this.selectedPlan!.price),
          paymentMethod: 'RAZORPAY',
          userEmail: this.userEmail || 'user@omnicharge.com',
          userMobile: this.numberForm.value.mobileNumber || '',
          mobileNumber: this.numberForm.value.mobileNumber || '',
          operatorName: this.detectedOperator!.name || '',
          planName: this.selectedPlan!.name || ''
        };
        this.paymentService.createOrder(paymentPayload).subscribe({
          next: (paymentRes) => {
            // Check if backend returned a FAILED status (e.g. Razorpay API rejected the order)
            if (paymentRes.status === 'FAILED' || !paymentRes.razorpayOrderId) {
              console.error('Create Order returned FAILED:', paymentRes);
              this.snackBar.open(
                'Payment order creation failed. Please try again.',
                'Close',
                { duration: 5000, panelClass: ['error-snackbar'] }
              );
              this.sagaCompensate('ORDER', recharge, '');
              return;
            }

            this.sagaStepsCompleted.push('ORDER');
            this.sagaStep = 'CHECKOUT';
            this.cdr.markForCheck();

            const razorpayOrderId = paymentRes.razorpayOrderId;
            const transactionId = paymentRes.transactionId;

            // SAGA Step 3: RAZORPAY CHECKOUT
            this.paymentService.openRazorpayCheckout({
              orderId: razorpayOrderId,
              amount: this.selectedPlan!.price,
              currency: 'INR',
              name: 'OmniCharge',
              description: `${this.detectedOperator!.name} - ${this.selectedPlan!.name}`,
              userEmail: this.userEmail,
              userPhone: this.numberForm.value.mobileNumber
            }).then((paymentResult) => {
              this.sagaStepsCompleted.push('CHECKOUT');
              this.sagaStep = 'VERIFY';
              this.cdr.markForCheck();

              // SAGA Step 4: VERIFY_PAYMENT
              this.paymentService.verifyPayment({
                razorpayPaymentId: paymentResult.razorpayPaymentId,
                razorpayOrderId: paymentResult.razorpayOrderId,
                razorpaySignature: paymentResult.razorpaySignature,
                transactionId: transactionId,
                rechargeId: recharge.rechargeId,
                amount: this.selectedPlan!.price
              }).subscribe({
                next: (txn) => {
                  this.sagaStepsCompleted.push('VERIFY');
                  this.sagaStep = 'COMPLETE';
                  this.cdr.markForCheck();

                  // SAGA Step 5: COMPLETE_RECHARGE
                  this.rechargeService.completeRecharge(recharge, txn.transactionId || paymentResult.razorpayPaymentId);
                  this.transactionId = txn.transactionId || paymentResult.razorpayPaymentId;
                  this.sagaStepsCompleted.push('COMPLETE');
                  this.sagaStep = 'NOTIFY';
                  this.cdr.markForCheck();

                  // SAGA Step 6: SEND_NOTIFICATIONS
                  this.notificationService.sendPaymentNotifications({
                    amount: this.selectedPlan!.price,
                    transactionId: this.transactionId,
                    operatorName: this.detectedOperator!.name,
                    planData: this.selectedPlan!.data,
                    mobileNumber: this.numberForm.value.mobileNumber,
                    userEmail: this.userEmail
                  });

                  this.sagaStepsCompleted.push('NOTIFY');
                  this.processing = false;
                  this.paymentSuccess = true;
                  this.sagaStep = null;
                  this.cdr.markForCheck();

                  this.snackBar.open('Payment & Recharge successful! 🎉', 'Close', { duration: 4000, panelClass: ['success-snackbar'] });
                },
                error: () => this.sagaCompensate('VERIFY', recharge, razorpayOrderId)
              });
            }).catch((paymentError: Error) => {
              console.error('Razorpay checkout error:', paymentError.message);
              this.sagaCompensate('CHECKOUT', recharge, razorpayOrderId);
            });
          },
          error: (err) => {
            console.error('Create Order failed:', err);
            const errorMsg = err.error?.message || err.message || 'Payment order creation failed';
            this.snackBar.open(errorMsg, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
            this.sagaCompensate('ORDER', recharge, '');
          }
        });
      },
      error: () => this.sagaCompensate('INITIATE', null, '')
    });
  }

  private sagaCompensate(failedAt: string, recharge: Recharge | null, orderId: string): void {
    if (recharge) {
      this.rechargeService.failRecharge(recharge);
    }
    if (this.sagaStepsCompleted.includes('ORDER') && orderId) {
      this.paymentService.recordFailedTransaction(recharge?.id || 0, this.selectedPlan?.price || 0, orderId);
    }
    this.notificationService.addLocalNotification(
      'Payment Failed ❌',
      `Recharge payment of ₹${this.selectedPlan?.price} for ${this.numberForm.value.mobileNumber} failed at step: ${failedAt}. Please try again.`,
      'PAYMENT', 'IN_APP'
    );

    this.processing = false;
    this.sagaStep = null;
    this.cdr.markForCheck();

    const message = failedAt === 'CHECKOUT'
      ? 'Payment was cancelled. You can try again.'
      : `Payment failed at ${failedAt}. Please try again.`;
    this.snackBar.open(message, 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
  }

  resetFlow(): void {
    this.paymentSuccess = false;
    this.detectedOperator = null;
    this.selectedPlan = null;
    this.plans = [];
    this.transactionId = '';
    this.currentRecharge = null;
    this.sagaStep = null;
    this.sagaStepsCompleted = [];
    this.numberForm.reset();
    this.planForm.reset();
    this.stepper.reset();
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
