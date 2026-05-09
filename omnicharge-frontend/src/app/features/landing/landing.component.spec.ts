import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandingComponent } from './landing.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OperatorService } from '../../core/services/operator.service';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(async () => {
    const operatorSpy = jasmine.createSpyObj('OperatorService', ['getActiveOperators', 'detectOperator', 'getOperator', 'getAllOperators']);
    operatorSpy.getActiveOperators.and.returnValue(of([]));
    operatorSpy.detectOperator.and.returnValue(of(null));
    operatorSpy.getOperator.and.returnValue(of(null));
    operatorSpy.getAllOperators.and.returnValue(of([]));
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isLoggedIn', 'isAdmin', 'getToken'], {
      currentUser$: new BehaviorSubject(null)
    });
    authSpy.isLoggedIn.and.returnValue(false);
    authSpy.isAdmin.and.returnValue(false);
    const snackSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);

    await TestBed.configureTestingModule({
      imports: [LandingComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: OperatorService, useValue: operatorSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: MatSnackBar, useValue: snackSpy },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();
    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });
});
