import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationService],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Real API', () => {
    beforeEach(() => (environment.useMockApi = false));

    it('should get notifications from API', () => {
      service.getNotifications().subscribe((notifs) => expect(notifs.length).toBe(0));
      httpMock
        .expectOne(
          (req) =>
            req.method === 'GET' &&
            req.url.includes('/api/notifications') &&
            !req.url.includes('/admin'),
        )
        .flush([]);
    });

    it('should get unread count from API', () => {
      service.getUnreadCount().subscribe((count) => expect(count).toBe(5));
      httpMock
        .expectOne(
          (req) => req.method === 'GET' && req.url.includes('/api/notifications/unread-count'),
        )
        .flush(5);
    });

    it('should mark as read via API', () => {
      service.markAsRead(1).subscribe();
      httpMock
        .expectOne((req) => req.method === 'PUT' && req.url.includes('/api/notifications/1/read'))
        .flush({});
    });

    it('should mark all as read via API', () => {
      service.markAllAsRead().subscribe();
      httpMock
        .expectOne((req) => req.method === 'PUT' && req.url.includes('/api/notifications/read-all'))
        .flush({});
    });

    it('should get all notifications (admin) from API', () => {
      service.getAllNotifications().subscribe();
      httpMock.expectOne((req) => req.url.includes('/api/admin/notifications')).flush([]);
    });
  });

  describe('Mock', () => {
    beforeEach(() => (environment.useMockApi = true));

    it('should handle mock notifications', fakeAsync(() => {
      let res: any;
      service.getNotifications().subscribe((notifs) => (res = notifs));
      tick(500);
      expect(res).toBeDefined();
    }));

    it('should push local notification', fakeAsync(() => {
      service.addLocalNotification('Title', 'Message', 'RECHARGE');
      let res: any;
      service.getNotifications().subscribe((notifs) => (res = notifs));
      tick();
      expect(res[0].title).toBe('Title');
    }));

    it('should send payment notifications', fakeAsync(() => {
      service.sendPaymentNotifications({
        amount: 100,
        transactionId: 'TXN1',
        operatorName: 'Jio',
        planData: '1GB/Day',
        mobileNumber: '1234567890',
        userEmail: 'user@example.com',
      });
      let res: any;
      service.getNotifications().subscribe((notifs) => (res = notifs));
      tick();
      expect(res.length).toBeGreaterThan(0);
    }));

    it('should mock getUnreadCount', fakeAsync(() => {
      service.addLocalNotification('Unread', 'Msg', 'SYS');
      let res: any;
      service.getUnreadCount().subscribe((c) => (res = c));
      tick();
      expect(res).toBeGreaterThan(0);
    }));

    it('should mock markAsRead', fakeAsync(() => {
      service.addLocalNotification('Unread', 'Msg', 'SYS');
      let notifs: any;
      service.getNotifications().subscribe((n) => (notifs = n));
      tick();
      const id = notifs[0].id;

      let res = false;
      service.markAsRead(id).subscribe(() => (res = true));
      tick(200);
      expect(res).toBeTrue();
    }));

    it('should mock markAllAsRead', fakeAsync(() => {
      service.addLocalNotification('Unread', 'Msg', 'SYS');
      let res = false;
      service.markAllAsRead().subscribe(() => (res = true));
      tick(200);
      expect(res).toBeTrue();
    }));

    it('should mock getAllNotifications', fakeAsync(() => {
      let res: any;
      service.getAllNotifications().subscribe((n) => (res = n));
      tick(100);
      expect(res).toBeDefined();
    }));
  });
});
