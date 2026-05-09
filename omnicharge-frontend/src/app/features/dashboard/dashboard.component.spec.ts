import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../core/services/auth.service';
import { RechargeService } from '../../core/services/recharge.service';
import { NotificationService } from '../../core/services/notification.service';
import { of } from 'rxjs';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isLoggedIn'], { currentUser$: of(null) });
    authSpy.getCurrentUser.and.returnValue({ fullName: 'TestUser' });
    const rechargeSpy = jasmine.createSpyObj('RechargeService', ['getRechargeHistory']);
    rechargeSpy.getRechargeHistory.and.returnValue(of([]));
    const notifSpy = jasmine.createSpyObj('NotificationService', ['getNotifications', 'markAsRead']);
    notifSpy.getNotifications.and.returnValue(of([]));
    notifSpy.markAsRead.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy },
        { provide: RechargeService, useValue: rechargeSpy },
        { provide: NotificationService, useValue: notifSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });
  it('should set userName from auth service', () => { expect(component.userName).toBe('TestUser'); });
  it('should have empty recentRecharges initially', () => { expect(component.recentRecharges.length).toBe(0); });
  it('should dismiss notification', () => {
    component.recentNotifications = [{ id: 1, title: 'Test', message: 'msg', isRead: false, category: 'PAYMENT' } as any];
    component.dismissNotification();
    expect(component.recentNotifications.length).toBe(0);
  });
  it('should cleanup on destroy', () => { component.ngOnDestroy(); expect(component).toBeTruthy(); });
});
