import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationsComponent } from './notifications.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationService } from '../../core/services/notification.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  let mockNotifs: any[];

  beforeEach(async () => {
    mockNotifs = [
      {
        id: 1,
        title: 'T1',
        message: 'M1',
        type: 'IN_APP',
        category: 'PAYMENT',
        isRead: false,
        createdDate: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'T2',
        message: 'M2',
        type: 'SMS',
        category: 'RECHARGE',
        isRead: true,
        createdDate: new Date().toISOString(),
      },
    ];
    notificationService = jasmine.createSpyObj('NotificationService', [
      'getNotifications',
      'markAsRead',
      'markAllAsRead',
    ]);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    notificationService.getNotifications.and.returnValue(of(mockNotifs));
    notificationService.markAsRead.and.returnValue(of(undefined as any));
    notificationService.markAllAsRead.and.returnValue(of(undefined as any));

    await TestBed.configureTestingModule({
      imports: [NotificationsComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notificationService },
      ],
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load notifications', () => {
    expect(notificationService.getNotifications).toHaveBeenCalled();
    expect(component.allNotifications.length).toBe(2);
  });

  it('should mark single as read', () => {
    component.markRead(mockNotifs[0]);
    expect(notificationService.markAsRead).toHaveBeenCalledWith(1);
    expect(mockNotifs[0].isRead).toBeTrue();
  });

  it('should mark all as read', () => {
    component.markAllRead();
    expect(notificationService.markAllAsRead).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should get correct icons', () => {
    expect(component.getIcon(mockNotifs[0])).toBe('payment');
    expect(component.getIcon(mockNotifs[1])).toBe('sms');
    const emailNotif = { type: 'EMAIL', category: 'OTHER' };
    expect(component.getIcon(emailNotif as any)).toBe('email');
  });

  it('should get correct icon classes', () => {
    expect(component.getIconClass(mockNotifs[0])).toBe('payment');
    expect(component.getIconClass(mockNotifs[1])).toBe('sms');
  });

  it('should refresh data', () => {
    notificationService.getNotifications.calls.reset();
    component.refreshData();
    expect(notificationService.getNotifications).toHaveBeenCalled();
  });

  it('should handle page change', () => {
    const event = { pageIndex: 1, pageSize: 5, length: 10 };
    component.onPageChange(event as any);
    expect(component.paginatedNotifications.length).toBe(0); // since only 2 items total
  });
});
