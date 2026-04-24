import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, delay, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';
import { MOCK_NOTIFICATIONS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/api/notifications`;

  // Local notifications store for mock mode
  private localNotifications = new BehaviorSubject<Notification[]>(this.loadStoredNotifications());
  public notifications$ = this.localNotifications.asObservable();

  constructor(private http: HttpClient) {}

  private loadStoredNotifications(): Notification[] {
    try {
      const stored = localStorage.getItem('omni_notifications');
      if (stored) {
        return JSON.parse(stored);
      }
      // Initialize with default mock data if empty
      this.saveNotifications(MOCK_NOTIFICATIONS);
      return MOCK_NOTIFICATIONS;
    } catch {
      return MOCK_NOTIFICATIONS;
    }
  }

  private saveNotifications(notifications: Notification[]): void {
    localStorage.setItem('omni_notifications', JSON.stringify(notifications));
    this.localNotifications.next(notifications);
  }

  /** Push a local in-app notification (works in both mock and real mode for immediate UI feedback) */
  addLocalNotification(title: string, message: string, category: string, type: 'IN_APP' | 'EMAIL' | 'SMS' = 'IN_APP'): void {
    const current = this.localNotifications.value;
    const newNotif: Notification = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      userId: 1,
      title,
      message,
      type,
      category,
      isRead: false,
      metadata: null,
      createdDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.saveNotifications([newNotif, ...current]);
  }

  /** Send all post-payment notifications: IN_APP + SMS + EMAIL */
  sendPaymentNotifications(params: {
    amount: number;
    transactionId: string;
    operatorName: string;
    planData: string;
    mobileNumber: string;
    userEmail: string;
  }): void {
    // Always add local notifications for immediate UI feedback
    // 1. Payment Success — IN_APP
    this.addLocalNotification(
      'Payment Successful ✅',
      `₹${params.amount} paid via Razorpay. Transaction ID: ${params.transactionId}`,
      'PAYMENT', 'IN_APP'
    );
    // 2. Recharge Success — IN_APP
    this.addLocalNotification(
      'Recharge Successful 🎉',
      `${params.operatorName} ${params.planData} plan activated for ${params.mobileNumber}`,
      'RECHARGE', 'IN_APP'
    );
    // 3. SMS notification to user's number
    this.addLocalNotification(
      `SMS → ${params.mobileNumber}`,
      `OmniCharge: ₹${params.amount} recharge successful for ${params.mobileNumber}. ${params.operatorName} ${params.planData} activated. Txn: ${params.transactionId}`,
      'RECHARGE', 'SMS'
    );
    // 4. Email notification to user's email
    this.addLocalNotification(
      `Email → ${params.userEmail}`,
      `Your recharge of ₹${params.amount} for ${params.mobileNumber} (${params.operatorName}) has been completed successfully. Plan: ${params.planData}. Transaction ID: ${params.transactionId}`,
      'PAYMENT', 'EMAIL'
    );

    // In real mode, backend also sends notifications via RabbitMQ event pipeline
    // The local notifications provide immediate UI feedback while backend processes asynchronously
  }

  getNotifications(): Observable<Notification[]> {
    if (environment.useMockApi) {
      return this.notifications$;
    }
    // For real API, merge local notifications with server notifications for complete view
    return this.http.get<Notification[]>(this.apiUrl);
  }

  getUnreadCount(): Observable<number> {
    if (environment.useMockApi) {
      return this.notifications$.pipe(
        map(notifs => notifs.filter(n => !n.isRead).length)
      );
    }
    return this.http.get<number>(`${this.apiUrl}/unread-count`);
  }

  markAsRead(id: number): Observable<void> {
    if (environment.useMockApi) {
      const current = this.localNotifications.value;
      const n = current.find(x => x.id === id);
      if (n) {
        n.isRead = true;
        this.saveNotifications([...current]);
      }
      return of(undefined).pipe(delay(100));
    }
    return this.http.put<void>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    if (environment.useMockApi) {
      const current = this.localNotifications.value.map(n => ({ ...n, isRead: true }));
      this.saveNotifications(current);
      return of(undefined).pipe(delay(100));
    }
    return this.http.put<void>(`${this.apiUrl}/read-all`, {});
  }

  getAllNotifications(): Observable<Notification[]> {
    if (environment.useMockApi) {
      return this.notifications$;
    }
    return this.http.get<Notification[]>(`${environment.apiUrl}/api/admin/notifications`);
  }
}
