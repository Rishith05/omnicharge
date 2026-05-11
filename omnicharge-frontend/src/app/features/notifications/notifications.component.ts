import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatSnackBarModule,
    MatPaginatorModule,
    MatTooltipModule,
  ],
  template: `
    <div class="notifications-page fade-in">
      <div class="page-header">
        <h1 class="page-title"><mat-icon>notifications</mat-icon> Notifications</h1>
        <div class="page-actions">
          <button
            mat-stroked-button
            (click)="refreshData()"
            matTooltip="Refresh notifications"
            class="refresh-btn"
          >
            <mat-icon>refresh</mat-icon> Refresh
          </button>
          <button
            mat-raised-button
            color="primary"
            (click)="markAllRead()"
            *ngIf="allNotifications.length > 0"
          >
            <mat-icon>done_all</mat-icon> Mark All Read
          </button>
        </div>
      </div>

      @if (allNotifications.length > 0) {
        <div class="notification-list">
          @for (n of paginatedNotifications; track n.id) {
            <mat-card class="notification-card" [class.unread]="!n.isRead" (click)="markRead(n)">
              <div class="notif-icon-wrap" [class]="getIconClass(n)">
                <mat-icon>{{ getIcon(n) }}</mat-icon>
              </div>
              <div class="notif-content">
                <div class="notif-title-row">
                  <strong>{{ n.title }}</strong>
                  <span class="notif-type-badge" [class]="n.type.toLowerCase()">{{ n.type }}</span>
                </div>
                <p>{{ n.message }}</p>
                <span class="notif-time">{{ n.createdDate | date: 'medium' }}</span>
              </div>
              @if (!n.isRead) {
                <div class="unread-dot"></div>
              }
            </mat-card>
          }
        </div>
        <mat-paginator
          [length]="allNotifications.length"
          [pageSizeOptions]="[5, 10, 25, 50]"
          [pageSize]="10"
          showFirstLastButtons
          (page)="onPageChange($event)"
          aria-label="Select notification page"
        >
        </mat-paginator>
      } @else {
        <mat-card class="empty-state">
          <mat-icon>notifications_off</mat-icon>
          <p>No notifications yet</p>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .notifications-page {
        max-width: 800px;
        margin: 0 auto;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .page-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 24px;
        font-weight: 800;
      }
      .page-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .refresh-btn {
        border-color: var(--border-subtle) !important;
        color: var(--text-secondary) !important;
        border-radius: 8px;
      }
      .refresh-btn:hover {
        background: rgba(127, 90, 240, 0.1);
        color: var(--accent-purple) !important;
      }
      .notification-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .notification-card {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 20px;
        cursor: pointer;
        transition: var(--transition);
      }
      .notification-card:hover {
        transform: translateX(4px);
      }
      .notification-card.unread {
        border-left: 3px solid var(--accent-purple);
      }
      .notif-icon-wrap {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .notif-icon-wrap.payment {
        background: rgba(44, 182, 125, 0.2);
        color: var(--accent-teal);
      }
      .notif-icon-wrap.recharge {
        background: rgba(127, 90, 240, 0.2);
        color: var(--accent-purple);
      }
      .notif-icon-wrap.sms {
        background: rgba(255, 137, 6, 0.2);
        color: var(--accent-amber);
      }
      .notif-icon-wrap.email {
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
      }
      .notif-icon-wrap.default {
        background: rgba(255, 137, 6, 0.2);
        color: var(--accent-amber);
      }
      .notif-content {
        flex: 1;
      }
      .notif-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .notif-content strong {
        font-size: 15px;
      }
      .notif-type-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 10px;
        text-transform: uppercase;
      }
      .notif-type-badge.in_app {
        background: rgba(127, 90, 240, 0.2);
        color: var(--accent-purple);
      }
      .notif-type-badge.sms {
        background: rgba(255, 137, 6, 0.2);
        color: var(--accent-amber);
      }
      .notif-type-badge.email {
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
      }
      .notif-content p {
        color: var(--text-secondary);
        font-size: 13px;
        margin: 4px 0;
      }
      .notif-time {
        font-size: 12px;
        color: var(--text-secondary);
      }
      .unread-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent-purple);
        flex-shrink: 0;
        margin-top: 6px;
      }
      .empty-state {
        padding: 60px;
        text-align: center;
      }
      .empty-state mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--text-secondary);
      }
      .empty-state p {
        color: var(--text-secondary);
        margin-top: 12px;
      }
    `,
  ],
})
export class NotificationsComponent implements OnInit, OnDestroy {
  allNotifications: Notification[] = [];
  paginatedNotifications: Notification[] = [];

  // Pagination state
  private currentPage = 0;
  private pageSize = 10;

  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.notificationService
      .getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.allNotifications = data;
          this.updatePaginatedView();
          this.cdr.markForCheck();
        },
      });
  }

  refreshData(): void {
    this.loadData();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedView();
  }

  private updatePaginatedView(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedNotifications = this.allNotifications.slice(start, end);
  }

  markRead(n: Notification): void {
    if (n.isRead) return;
    this.notificationService
      .markAsRead(n.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          n.isRead = true;
          this.cdr.markForCheck();
        },
      });
  }

  markAllRead(): void {
    this.notificationService
      .markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.allNotifications.forEach((n) => (n.isRead = true));
          this.cdr.markForCheck();
          this.snackBar.open('All notifications marked as read', 'Close', {
            duration: 2000,
            panelClass: ['success-snackbar'],
          });
        },
      });
  }

  getIcon(n: Notification): string {
    if (n.type === 'SMS') return 'sms';
    if (n.type === 'EMAIL') return 'email';
    if (n.category?.toLowerCase().includes('payment')) return 'payment';
    if (n.category?.toLowerCase().includes('recharge')) return 'phone_android';
    return 'notifications';
  }

  getIconClass(n: Notification): string {
    if (n.type === 'SMS') return 'sms';
    if (n.type === 'EMAIL') return 'email';
    if (n.category?.toLowerCase().includes('payment')) return 'payment';
    if (n.category?.toLowerCase().includes('recharge')) return 'recharge';
    return 'default';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
