import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../core/services/auth.service';
import { RechargeService } from '../../core/services/recharge.service';
import { NotificationService } from '../../core/services/notification.service';
import { of, throwError } from 'rxjs';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let rechargeSpy: jasmine.SpyObj<RechargeService>;
  let notifSpy: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isLoggedIn'], {
      currentUser$: of(null),
    });
    authSpy.getCurrentUser.and.returnValue({ fullName: 'TestUser' } as any);
    rechargeSpy = jasmine.createSpyObj('RechargeService', ['getRechargeHistory']);
    rechargeSpy.getRechargeHistory.and.returnValue(of([]));
    notifSpy = jasmine.createSpyObj('NotificationService', ['getNotifications', 'markAsRead']);
    notifSpy.getNotifications.and.returnValue(of([]));
    notifSpy.markAsRead.and.returnValue(of(undefined as any));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy },
        { provide: RechargeService, useValue: rechargeSpy },
        { provide: NotificationService, useValue: notifSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('should set userName', () => {
    expect(component.userName).toBe('TestUser');
  });

  it('should dismiss notification', () => {
    component.recentNotifications = [
      { id: 1, title: 'T', message: 'M', isRead: false, category: 'PAYMENT' } as any,
    ];
    component.dismissNotification();
    expect(component.recentNotifications.length).toBe(0);
    expect(notifSpy.markAsRead).toHaveBeenCalledWith(1);
  });

  it('should handle errors gracefully', () => {
    rechargeSpy.getRechargeHistory.and.returnValue(throwError(() => new Error('Err')));
    component.ngOnInit();
    expect(component.recentRecharges.length).toBe(0);
  });
});
