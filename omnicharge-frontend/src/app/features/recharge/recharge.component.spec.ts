import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import { BehaviorSubject, of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('RechargeComponent', () => {
  let component: RechargeComponent;
  let fixture: ComponentFixture<RechargeComponent>;

  beforeEach(async () => {
    const operatorSpy = jasmine.createSpyObj('OperatorService', ['getActiveOperators', 'detectOperator', 'getOperator', 'getAllOperators']);
    operatorSpy.getActiveOperators.and.returnValue(of([]));
    operatorSpy.detectOperator.and.returnValue(of(null));
    operatorSpy.getOperator.and.returnValue(of(null));
    operatorSpy.getAllOperators.and.returnValue(of([]));
    const rechargeSpy = jasmine.createSpyObj('RechargeService', ['initiateRecharge']);
    rechargeSpy.initiateRecharge.and.returnValue(of({}));
    const paymentSpy = jasmine.createSpyObj('PaymentService', ['createOrder', 'verifyPayment'], {
      transactionHistory$: of([])
    });
    paymentSpy.createOrder.and.returnValue(of({}));
    const notifSpy = jasmine.createSpyObj('NotificationService', ['getNotifications']);
    notifSpy.getNotifications.and.returnValue(of([]));
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isLoggedIn', 'isAdmin', 'getToken'], {
      currentUser$: new BehaviorSubject(null)
    });
    authSpy.getCurrentUser.and.returnValue({ id: 1, fullName: 'Test' });
    authSpy.isLoggedIn.and.returnValue(true);
    authSpy.getToken.and.returnValue('token');
    const snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [RechargeComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: OperatorService, useValue: operatorSpy },
        { provide: RechargeService, useValue: rechargeSpy },
        { provide: PaymentService, useValue: paymentSpy },
        { provide: NotificationService, useValue: notifSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: MatSnackBar, useValue: snackSpy },
        { provide: Router, useValue: routerSpy },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();
    fixture = TestBed.createComponent(RechargeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });
});
