import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { RechargeComponent } from './recharge.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OperatorService } from '../../core/services/operator.service';
import { RechargeService } from '../../core/services/recharge.service';
import { PaymentService } from '../../core/services/payment.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

describe('RechargeComponent', () => {
  let component: RechargeComponent;
  let fixture: ComponentFixture<RechargeComponent>;
  let operatorService: jasmine.SpyObj<OperatorService>;
  let rechargeService: jasmine.SpyObj<RechargeService>;
  let paymentService: jasmine.SpyObj<PaymentService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let authService: jasmine.SpyObj<AuthService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let router: Router;

  const mockOperator: any = { id: 1, name: 'Jio', code: 'JIO', isActive: true };
  const mockPlan: any = {
    id: 101,
    name: 'Basic',
    price: 199,
    validity: 28,
    data: '1GB',
    category: 'Unlimited',
    isActive: true,
    description: 'Desc',
  };
  const mockRecharge: any = { rechargeId: 'REC123', id: 1 };

  beforeEach(async () => {
    operatorService = jasmine.createSpyObj('OperatorService', [
      'getAllOperators',
      'detectOperator',
      'getPlansByOperator',
    ]);
    rechargeService = jasmine.createSpyObj('RechargeService', [
      'initiateRecharge',
      'completeRecharge',
      'failRecharge',
    ]);
    paymentService = jasmine.createSpyObj('PaymentService', [
      'createOrder',
      'openRazorpayCheckout',
      'verifyPayment',
      'recordFailedTransaction',
    ]);
    notificationService = jasmine.createSpyObj('NotificationService', [
      'sendPaymentNotifications',
      'addLocalNotification',
    ]);
    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isLoggedIn'], {
      currentUser$: of({ email: 'test@test.com' }),
    });
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    operatorService.getAllOperators.and.returnValue(of([mockOperator]));
    operatorService.detectOperator.and.returnValue(
      of({ operator: mockOperator, mobileNumber: '123', detectionMethod: 'MOCK' } as any),
    );
    operatorService.getPlansByOperator.and.returnValue(of([mockPlan]));
    authService.getCurrentUser.and.returnValue({ id: 1, fullName: 'Test User' } as any);

    await TestBed.configureTestingModule({
      imports: [RechargeComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OperatorService, useValue: operatorService },
        { provide: RechargeService, useValue: rechargeService },
        { provide: PaymentService, useValue: paymentService },
        { provide: NotificationService, useValue: notificationService },
        { provide: AuthService, useValue: authService },
      ],
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(RechargeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should detect operator', fakeAsync(() => {
    component.numberForm.patchValue({ mobileNumber: '9876543210' });
    component.detectOperator();
    tick();
    expect(operatorService.detectOperator).toHaveBeenCalled();
  }));

  it('should handle detection failure', () => {
    operatorService.detectOperator.and.returnValue(
      throwError(() => ({ error: { message: 'Failed' } })),
    );
    component.numberForm.patchValue({ mobileNumber: '9876543210' });
    component.detectOperator();
    expect(snackBar.open).toHaveBeenCalledWith('Failed', 'Close', jasmine.any(Object));
  });

  it('should fail saga if create order fails', fakeAsync(() => {
    component.detectedOperator = mockOperator;
    component.selectedPlan = mockPlan;
    rechargeService.initiateRecharge.and.returnValue(of(mockRecharge));
    paymentService.createOrder.and.returnValue(
      throwError(() => ({ error: { message: 'OrderFailed' } })),
    );
    component.executeSaga();
    tick();
    expect(snackBar.open).toHaveBeenCalled();
  }));

  it('should handle cancelled payment', fakeAsync(() => {
    component.detectedOperator = mockOperator;
    component.selectedPlan = mockPlan;
    rechargeService.initiateRecharge.and.returnValue(of(mockRecharge));
    paymentService.createOrder.and.returnValue(
      of({ status: 'SUCCESS', razorpayOrderId: 'ORD1' } as any),
    );
    paymentService.openRazorpayCheckout.and.returnValue(Promise.reject(new Error('Cancelled')));
    component.executeSaga();
    tick();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Payment was cancelled. You can try again.',
      'Close',
      jasmine.any(Object),
    );
  }));

  it('should complete saga successfully', fakeAsync(() => {
    component.detectedOperator = mockOperator;
    component.selectedPlan = mockPlan;
    component.numberForm.patchValue({ mobileNumber: '9876543210' });

    rechargeService.initiateRecharge.and.returnValue(of(mockRecharge));
    paymentService.createOrder.and.returnValue(
      of({ status: 'SUCCESS', razorpayOrderId: 'ORD1' } as any),
    );
    paymentService.openRazorpayCheckout.and.returnValue(
      Promise.resolve({ razorpay_payment_id: 'PAY1' } as any),
    );
    paymentService.verifyPayment.and.returnValue(
      of({ status: 'SUCCESS', transactionId: 'TXN1' } as any),
    );

    component.executeSaga();
    tick();

    expect(rechargeService.completeRecharge).toHaveBeenCalled();
    expect(notificationService.sendPaymentNotifications).toHaveBeenCalled();
    expect(component.paymentSuccess).toBeTrue();
  }));

  it('should fail saga if verification fails', fakeAsync(() => {
    component.detectedOperator = mockOperator;
    component.selectedPlan = mockPlan;

    rechargeService.initiateRecharge.and.returnValue(of(mockRecharge));
    paymentService.createOrder.and.returnValue(
      of({ status: 'SUCCESS', razorpayOrderId: 'ORD1' } as any),
    );
    paymentService.openRazorpayCheckout.and.returnValue(
      Promise.resolve({ razorpay_payment_id: 'PAY1' } as any),
    );
    paymentService.verifyPayment.and.returnValue(throwError(() => new Error('VerificationFailed')));

    component.executeSaga();
    tick();

    expect(rechargeService.failRecharge).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Payment failed at VERIFY. Please try again.',
      'Close',
      jasmine.any(Object),
    );
  }));

  it('should select plan and move to next step', () => {
    component.selectPlan(mockPlan);
    expect(component.selectedPlan).toBe(mockPlan);
  });

  it('should restore context from localStorage', fakeAsync(() => {
    const context = { mobileNumber: '9876543210', operatorId: 1, planId: 1 };
    localStorage.setItem('omni_recharge_context', JSON.stringify(context));
    component.allOperators = [mockOperator];
    component.plans = [mockPlan];

    // Trigger restoration
    (component as any).restoreRechargeContext();
    tick(200);

    expect(component.numberForm.value.mobileNumber).toBe('9876543210');
    expect(component.selectedPlan).toBeDefined();
    flush();
  }));

  it('should handle saga compensation', () => {
    const failSpy = spyOn(component as any, 'sagaCompensate').and.callThrough();
    rechargeService.initiateRecharge.and.returnValue(throwError(() => new Error('Fail')));

    component.detectedOperator = mockOperator;
    component.selectedPlan = mockPlan;
    component.executeSaga();

    expect(failSpy).toHaveBeenCalledWith('INITIATE', null, '');
    expect(component.processing).toBeFalse();
  });

  it('should reset flow', () => {
    component.paymentSuccess = true;
    component.selectedPlan = mockPlan;
    component.resetFlow();
    expect(component.paymentSuccess).toBeFalse();
    expect(component.selectedPlan).toBeNull();
  });

  it('should handle operator change', () => {
    component.allOperators = [mockOperator];
    component.onOperatorChange(1);
    expect(component.detectedOperator).toBe(mockOperator);
    expect(operatorService.getPlansByOperator).toHaveBeenCalledWith(1);
  });

  it('should get recharge number', () => {
    component.numberForm.patchValue({ mobileNumber: '+91 98765 43210' });
    expect(component.getRechargeNumber()).toBe('9876543210');
  });

  it('should check unsaved changes', () => {
    expect(component.hasUnsavedChanges()).toBeFalse();
    component.processing = true;
    expect(component.hasUnsavedChanges()).toBeTrue();
  });
});
