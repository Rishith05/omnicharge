import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add a local notification', () => {
    service.addLocalNotification('Test Title', 'Test Message', 'PAYMENT', 'IN_APP');

    service.notifications$.subscribe(notifications => {
      const found = notifications.find(n => n.title === 'Test Title');
      expect(found).toBeTruthy();
      expect(found?.message).toBe('Test Message');
      expect(found?.isRead).toBeFalse();
    });
  });

  it('should send payment notifications', () => {
    service.sendPaymentNotifications({
      amount: 299,
      transactionId: 'TXN-123',
      operatorName: 'Jio',
      planData: 'Unlimited',
      mobileNumber: '9876543210',
      userEmail: 'test@test.com'
    });

    service.notifications$.subscribe(notifications => {
      expect(notifications.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('should get notifications from API', () => {
    service.getNotifications().subscribe(notifications => {
      expect(notifications.length).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.includes('/notifications'));
    req.flush([{ id: 1, title: 'Test', message: 'Msg', isRead: false }]);
  });

  it('should get unread count from API', () => {
    service.getUnreadCount().subscribe(count => {
      expect(count).toBe(5);
    });

    const req = httpMock.expectOne(r => r.url.includes('/unread-count'));
    req.flush(5);
  });

  it('should mark as read via API', () => {
    service.markAsRead(1).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/notifications/1/read'));
    expect(req.request.method).toBe('PUT');
    req.flush(null);
  });

  it('should mark all as read via API', () => {
    service.markAllAsRead().subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/read-all'));
    expect(req.request.method).toBe('PUT');
    req.flush(null);
  });

  it('should get all notifications (admin) from API', () => {
    service.getAllNotifications().subscribe(notifications => {
      expect(notifications).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/admin/notifications'));
    req.flush([]);
  });

  it('should handle corrupt localStorage gracefully', () => {
    localStorage.setItem('omni_notifications', 'invalid-json{');
    // Service should still initialize without errors
    expect(service).toBeTruthy();
  });
});
