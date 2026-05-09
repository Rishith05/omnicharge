import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationsComponent } from './notifications.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationService } from '../../core/services/notification.service';
import { of } from 'rxjs';

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;

  beforeEach(async () => {
    const notifSpy = jasmine.createSpyObj('NotificationService', [
      'getNotifications', 'markAsRead', 'markAllAsRead', 'deleteNotification'
    ]);
    notifSpy.getNotifications.and.returnValue(of([]));
    notifSpy.markAsRead.and.returnValue(of({}));
    notifSpy.markAllAsRead.and.returnValue(of({}));
    notifSpy.deleteNotification.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [NotificationsComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });
});
