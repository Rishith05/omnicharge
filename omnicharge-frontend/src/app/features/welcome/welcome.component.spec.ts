import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WelcomeComponent } from './welcome.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('WelcomeComponent', () => {
  let component: WelcomeComponent;
  let fixture: ComponentFixture<WelcomeComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'isAdmin', 'getCurrentUser', 'getToken'], {
      currentUser$: { subscribe: () => {} }
    });
    authServiceSpy.isLoggedIn.and.returnValue(false);
    authServiceSpy.isAdmin.and.returnValue(false);
    authServiceSpy.getCurrentUser.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [WelcomeComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture = TestBed.createComponent(WelcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display OmniCharge brand', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Charge');
  });

  it('should start countdown at 5', () => {
    expect(component.countdown).toBeLessThanOrEqual(5);
  });

  it('should navigate on goToRecharge', fakeAsync(() => {
    component.goToRecharge();
    expect(component.leaving).toBeTrue();
    tick(500);
    expect(router.navigate).toHaveBeenCalledWith(['/recharge-home']);
  }));

  it('should clear timer on destroy', () => {
    component.ngOnDestroy();
    expect(component).toBeTruthy();
  });
});
