import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LandingComponent } from './landing.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OperatorService } from '../../core/services/operator.service';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;
  let operatorService: jasmine.SpyObj<OperatorService>;
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

  beforeEach(async () => {
    operatorService = jasmine.createSpyObj('OperatorService', [
      'getAllOperators',
      'detectOperator',
      'getPlansByOperator',
    ]);
    authService = jasmine.createSpyObj('AuthService', [
      'isLoggedIn',
      'isAdmin',
      'getCurrentUser',
      'logout',
    ]);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    operatorService.getAllOperators.and.returnValue(of([mockOperator]));
    operatorService.detectOperator.and.returnValue(of({ operator: mockOperator } as any));
    operatorService.getPlansByOperator.and.returnValue(of([mockPlan]));
    authService.isLoggedIn.and.returnValue(false);
    authService.isAdmin.and.returnValue(false);
    authService.getCurrentUser.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [LandingComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OperatorService, useValue: operatorService },
        { provide: AuthService, useValue: authService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideProvider(MatSnackBar, { useValue: jasmine.createSpyObj('MatSnackBar', ['open']) })
      .compileComponents();

    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should detect operator on button click', fakeAsync(() => {
    component.numberForm.patchValue({ mobileNumber: '9876543210' });
    component.detectOperator();
    tick();
    expect(operatorService.detectOperator).toHaveBeenCalled();
  }));

  it('should redirect to login if not logged in when proceeding to payment', () => {
    authService.isLoggedIn.and.returnValue(false);
    component.detectedOperator = mockOperator;
    component.selectedPlan = mockPlan;
    component.numberForm.patchValue({ mobileNumber: '9876543210' });
    component.proceedToPayment();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], jasmine.any(Object));
  });

  it('should redirect to recharge if logged in when proceeding to payment', () => {
    authService.isLoggedIn.and.returnValue(true);
    component.detectedOperator = mockOperator;
    component.selectedPlan = mockPlan;
    component.numberForm.patchValue({ mobileNumber: '9876543210' });
    component.proceedToPayment();
    expect(router.navigate).toHaveBeenCalledWith(['/recharge']);
  });

  it('should restore context on ngOnInit if logged in', () => {
    const context = { mobileNumber: '9876543210', operatorId: 1 };
    localStorage.setItem('omni_recharge_context', JSON.stringify(context));
    authService.isLoggedIn.and.returnValue(true);

    component.ngOnInit();

    expect(component.numberForm.value.mobileNumber).toBe('9876543210');
    expect(operatorService.detectOperator).toHaveBeenCalled();
  });

  it('should handle operator change', () => {
    component.allOperators = [mockOperator];
    component.onOperatorChange(1);
    expect(component.detectedOperator).toBe(mockOperator);
    expect(operatorService.getPlansByOperator).toHaveBeenCalledWith(1);
  });

  it('should select a plan', () => {
    component.selectPlan(mockPlan);
    expect(component.selectedPlan).toBe(mockPlan);
  });

  it('should logout and reset state', () => {
    component.isLoggedIn = true;
    component.logout();
    expect(authService.logout).toHaveBeenCalled();
    expect(component.isLoggedIn).toBeFalse();
  });

  it('should show error if operator detection fails', fakeAsync(() => {
    operatorService.detectOperator.and.returnValue(
      throwError(() => ({ error: { message: 'Could not detect operator. Please try again.' } })),
    );
    component.numberForm.patchValue({ mobileNumber: '9876543210' });

    component.detectOperator();
    tick();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Could not detect operator. Please try again.',
      'Close',
      jasmine.any(Object),
    );
  }));
});
