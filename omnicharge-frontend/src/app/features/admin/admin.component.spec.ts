import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AdminComponent } from './admin.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OperatorService } from '../../core/services/operator.service';
import { UserService } from '../../core/services/user.service';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let operatorService: jasmine.SpyObj<OperatorService>;
  let userService: jasmine.SpyObj<UserService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const mockOperators: any[] = [{ id: 1, name: 'Jio', code: 'JIO', isActive: true }];
  const mockPlans: any[] = [
    {
      id: 101,
      name: 'Basic',
      price: 199,
      validity: 28,
      data: '1GB',
      category: 'Unlimited',
      isActive: true,
    },
  ];
  const mockUsers: any[] = [
    { id: 1, fullName: 'Test User', email: 'test@test.com', role: 'ROLE_USER', isActive: true },
  ];

  beforeEach(async () => {
    operatorService = jasmine.createSpyObj('OperatorService', [
      'getAllOperators',
      'getPlansByOperator',
      'createOperator',
      'updateOperator',
      'deleteOperator',
      'toggleOperatorStatus',
      'createPlan',
      'updatePlan',
      'deletePlan',
      'togglePlanStatus',
    ]);
    userService = jasmine.createSpyObj('UserService', ['getAllUsers', 'toggleUserStatus']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    operatorService.getAllOperators.and.returnValue(of(mockOperators));
    operatorService.getPlansByOperator.and.returnValue(of(mockPlans));
    userService.getAllUsers.and.returnValue(of(mockUsers));

    await TestBed.configureTestingModule({
      imports: [AdminComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OperatorService, useValue: operatorService },
        { provide: UserService, useValue: userService },
      ],
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create operator', () => {
    operatorService.createOperator.and.returnValue(of(mockOperators[0]));
    component.operatorForm.patchValue({ name: 'A', code: 'B' });
    component.saveOperator();
    expect(operatorService.createOperator).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Operator created!', 'Close', jasmine.any(Object));
  });

  it('should update operator', () => {
    component.editingOperator = mockOperators[0];
    component.operatorForm.patchValue({ name: 'Updated', code: 'UPD' });
    operatorService.updateOperator.and.returnValue(of({ ...mockOperators[0], name: 'Updated' }));
    component.saveOperator();
    expect(operatorService.updateOperator).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Operator updated!', 'Close', jasmine.any(Object));
  });

  it('should delete operator', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    operatorService.deleteOperator.and.returnValue(of(undefined as any));
    component.deleteOperator(mockOperators[0]);
    expect(operatorService.deleteOperator).toHaveBeenCalledWith(mockOperators[0].id);
  });

  it('should toggle user access success', fakeAsync(() => {
    userService.toggleUserStatus.and.returnValue(of({}));
    const user = { id: 1, isActive: true } as any;
    component.toggleUserAccess(user);
    tick();
    expect(user.isActive).toBeFalse();
  }));

  it('should toggle user access failure', fakeAsync(() => {
    userService.toggleUserStatus.and.returnValue(throwError(() => new Error('Fail')));
    const user = { id: 1, isActive: true } as any;
    component.toggleUserAccess(user);
    tick();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to update user',
      'Close',
      jasmine.any(Object),
    );
  }));

  it('should return true for hasUnsavedChanges when operatorForm is dirty', () => {
    component.showOperatorForm = true;
    component.operatorForm.markAsDirty();
    expect(component.hasUnsavedChanges()).toBeTrue();
  });

  it('should load plans for operator', fakeAsync(() => {
    const plans = [{ id: 1, name: 'Plan 1' }];
    operatorService.getPlansByOperator.and.returnValue(of(plans as any));
    component.onPlanOperatorChange(1);
    tick();
    expect(component.selectedOperatorId).toBe(1);
    expect(component.plansDataSource.data).toEqual(plans as any);
  }));

  it('should create plan success', fakeAsync(() => {
    component.selectedOperatorId = 1;
    component.showPlanForm = true;
    const plan = {
      name: 'New Plan',
      price: 100,
      validity: 28,
      data: '1GB',
      description: 'Desc',
      category: 'Data',
    };
    component.planForm.setValue(plan);
    operatorService.createPlan.and.returnValue(of({ ...plan, id: 2, isActive: true } as any));

    component.savePlan();
    tick();

    expect(operatorService.createPlan).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Plan created!', 'Close', jasmine.any(Object));
    expect(component.showPlanForm).toBeFalse();
  }));

  it('should create plan failure', fakeAsync(() => {
    component.selectedOperatorId = 1;
    const plan = {
      name: 'New Plan',
      price: 100,
      validity: 28,
      data: '1GB',
      description: 'Desc',
      category: 'Data',
    };
    component.planForm.setValue(plan);
    operatorService.createPlan.and.returnValue(throwError(() => new Error('Fail')));

    component.savePlan();
    tick();

    expect(snackBar.open).toHaveBeenCalledWith('Create failed', 'Close', jasmine.any(Object));
  }));

  it('should update plan success', fakeAsync(() => {
    component.selectedOperatorId = 1;
    const existingPlan = { id: 2, name: 'Old Plan' } as any;
    component.editingPlan = existingPlan;
    component.showPlanForm = true;
    const planData = {
      name: 'Updated Plan',
      price: 100,
      validity: 28,
      data: '1GB',
      description: 'Desc',
      category: 'Data',
    };
    component.planForm.setValue(planData);
    operatorService.updatePlan.and.returnValue(of({ ...planData, id: 2 } as any));

    component.savePlan();
    tick();

    expect(operatorService.updatePlan).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Plan updated!', 'Close', jasmine.any(Object));
  }));

  it('should delete plan success', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.selectedOperatorId = 1;
    const plan = { id: 2, name: 'Plan' } as any;
    component.plansDataSource.data = [plan];
    operatorService.deletePlan.and.returnValue(of(undefined as any));

    component.deletePlan(plan);
    tick();

    expect(operatorService.deletePlan).toHaveBeenCalled();
    expect(component.plansDataSource.data.length).toBe(0);
  }));

  it('should toggle plan status success', fakeAsync(() => {
    component.selectedOperatorId = 1;
    const plan = { id: 2, isActive: true } as any;
    operatorService.togglePlanStatus.and.returnValue(of({ ...plan, isActive: false }));

    component.togglePlan(plan);
    tick();

    expect(operatorService.togglePlanStatus).toHaveBeenCalled();
    expect(plan.isActive).toBeFalse();
  }));

  it('should handle toggle operator success', fakeAsync(() => {
    const op = { id: 1, isActive: true } as any;
    operatorService.toggleOperatorStatus.and.returnValue(of({ ...op, isActive: false }));
    component.toggleOperator(op);
    tick();
    expect(op.isActive).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Operator deactivated!',
      'Close',
      jasmine.any(Object),
    );
  }));

  it('should handle editPlan', () => {
    const plan = {
      id: 2,
      name: 'Plan',
      price: 10,
      validity: 1,
      data: '1',
      description: 'D',
      category: 'Data',
    } as any;
    component.editPlan(plan);
    expect(component.editingPlan).toBe(plan);
    expect(component.showPlanForm).toBeTrue();
    expect(component.planForm.value.name).toBe('Plan');
  });

  it('should handle editOperator', () => {
    const op = { id: 1, name: 'Op', code: 'C' } as any;
    component.editOperator(op);
    expect(component.editingOperator).toBe(op);
    expect(component.showOperatorForm).toBeTrue();
    expect(component.operatorForm.value.name).toBe('Op');
  });
});
