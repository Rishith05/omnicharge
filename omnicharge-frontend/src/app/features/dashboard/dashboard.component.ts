import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { AuthService } from '../../core/services/auth.service';
import { RechargeService } from '../../core/services/recharge.service';
import { Recharge } from '../../core/models/recharge.model';
import { Subject, takeUntil } from 'rxjs';

import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../core/models/notification.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
  ],
  template: `
    <div class="dashboard fade-in">
      <!-- Notification Bar -->
      @if (recentNotifications.length > 0) {
        <div class="notification-bar slide-down">
          <div class="notif-content">
            <div class="notif-icon-wrapper pulse-animation">
              <mat-icon>notifications_active</mat-icon>
            </div>
            <div class="notif-text">
              <strong>{{ recentNotifications[0].title }}</strong>
              <span>{{ recentNotifications[0].message }}</span>
            </div>
          </div>
          <button mat-icon-button (click)="dismissNotification()" class="dismiss-btn">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }

      <div class="welcome-banner glass-panel slide-down">
        <div class="welcome-content">
          <p class="greeting">Welcome back,</p>
          <h1>
            <span class="highlight">{{ userName }}</span> 👋
          </h1>
          <p class="subtitle">Experience seamless mobile recharges with our premium platform.</p>
        </div>
        <div class="banner-decoration">
          <div class="glow-orb orb-1"></div>
          <div class="glow-orb orb-2"></div>
        </div>
      </div>

      <div class="quick-actions stagger-up">
        <div class="action-card glass-card hover-lift" routerLink="/recharge">
          <div class="action-icon-wrapper purple-gradient">
            <mat-icon>bolt</mat-icon>
          </div>
          <div class="action-text">
            <h3>Quick Recharge</h3>
            <p>Instant mobile top-up</p>
          </div>
          <mat-icon class="arrow-icon">arrow_forward</mat-icon>
        </div>

        <div class="action-card glass-card hover-lift" routerLink="/history">
          <div class="action-icon-wrapper teal-gradient">
            <mat-icon>history</mat-icon>
          </div>
          <div class="action-text">
            <h3>History</h3>
            <p>Past transactions</p>
          </div>
          <mat-icon class="arrow-icon">arrow_forward</mat-icon>
        </div>

        <div class="action-card glass-card hover-lift" routerLink="/notifications">
          <div class="action-icon-wrapper amber-gradient">
            <mat-icon>notifications_active</mat-icon>
          </div>
          <div class="action-text">
            <h3>Alerts</h3>
            <p>Account updates</p>
          </div>
          <mat-icon class="arrow-icon">arrow_forward</mat-icon>
        </div>

        <div class="action-card glass-card hover-lift" routerLink="/profile">
          <div class="action-icon-wrapper blue-gradient">
            <mat-icon>manage_accounts</mat-icon>
          </div>
          <div class="action-text">
            <h3>Profile</h3>
            <p>Manage settings</p>
          </div>
          <mat-icon class="arrow-icon">arrow_forward</mat-icon>
        </div>
      </div>

      <div class="recent-section slide-up">
        <div class="section-header">
          <h2>Recent Recharges</h2>
          <button mat-button color="primary" routerLink="/history" class="view-all-btn">
            View All
          </button>
        </div>

        @if (recentRecharges.length > 0) {
          <div class="recent-grid">
            @for (r of recentRecharges; track r.id) {
              <div class="recent-card glass-card hover-scale">
                <div class="recent-header">
                  <div class="operator-icon" [ngClass]="r.operatorName.toLowerCase()">
                    <mat-icon>cell_tower</mat-icon>
                  </div>
                  <span class="status-badge" [class]="r.status.toLowerCase()">{{ r.status }}</span>
                </div>
                <div class="recent-body">
                  <h3 class="amount">₹{{ r.amount }}</h3>
                  <p class="number">{{ r.mobileNumber }}</p>
                  <p class="operator-name">{{ r.operatorName }}</p>
                </div>
                <div class="recent-footer">
                  <button mat-stroked-button class="repeat-btn" routerLink="/recharge">
                    <mat-icon>replay</mat-icon> Repeat
                  </button>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="empty-state glass-panel">
            <div class="empty-icon-wrapper">
              <mat-icon>receipt_long</mat-icon>
            </div>
            <h3>No Recent Recharges</h3>
            <p>You haven't made any recharges lately. Stay connected by recharging now!</p>
            <button mat-raised-button class="gradient-btn" routerLink="/recharge">
              <mat-icon>bolt</mat-icon> Recharge Now
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        --primary-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        --glass-bg: rgba(255, 255, 255, 0.05);
        --glass-border: rgba(255, 255, 255, 0.1);
        --surface-color: #1e1e2d;
        --text-main: #f8fafc;
        --text-muted: #94a3b8;
      }

      .dashboard {
        max-width: 1280px;
        margin: 0 auto;
        padding: 24px;
        color: var(--text-main);
      }

      /* Notification Bar */
      .notification-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(
          135deg,
          rgba(45, 212, 191, 0.15) 0%,
          rgba(15, 118, 110, 0.15) 100%
        );
        border: 1px solid rgba(45, 212, 191, 0.3);
        padding: 16px 24px;
        border-radius: 16px;
        margin-bottom: 24px;
        backdrop-filter: blur(10px);
      }

      .notif-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .notif-icon-wrapper {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(45, 212, 191, 0.2);
        color: #2dd4bf;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .pulse-animation {
        animation: pulse 2s infinite;
      }

      .notif-text {
        display: flex;
        flex-direction: column;
      }

      .notif-text strong {
        font-size: 15px;
        color: white;
        margin-bottom: 2px;
      }

      .notif-text span {
        font-size: 13px;
        color: var(--text-muted);
      }

      .dismiss-btn {
        color: var(--text-muted);
      }
      .dismiss-btn:hover {
        color: white;
      }

      /* Glassmorphism Utilities */
      .glass-panel {
        background: var(--glass-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--glass-border);
        border-radius: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }

      .glass-card {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      /* Animations */
      .hover-lift:hover {
        transform: translateY(-8px);
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow:
          0 15px 35px rgba(0, 0, 0, 0.2),
          0 0 20px rgba(99, 102, 241, 0.1);
      }

      .hover-scale:hover {
        transform: scale(1.03);
        background: rgba(255, 255, 255, 0.06);
      }

      /* Welcome Banner */
      .welcome-banner {
        position: relative;
        padding: 48px;
        margin-bottom: 40px;
        overflow: hidden;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(120deg, rgba(30, 30, 45, 0.9) 0%, rgba(20, 20, 35, 0.9) 100%);
      }

      .welcome-content {
        position: relative;
        z-index: 2;
      }

      .greeting {
        font-size: 18px;
        color: var(--text-muted);
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 600;
      }

      .welcome-banner h1 {
        font-size: 42px;
        font-weight: 800;
        margin: 0 0 12px 0;
        letter-spacing: -1px;
      }

      .highlight {
        background: var(--primary-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 30px rgba(168, 85, 247, 0.3);
      }

      .subtitle {
        color: var(--text-muted);
        font-size: 16px;
        max-width: 500px;
        line-height: 1.6;
      }

      .banner-decoration {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        overflow: hidden;
        z-index: 1;
        pointer-events: none;
      }

      .glow-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(60px);
        opacity: 0.4;
        animation: float 8s ease-in-out infinite alternate;
      }

      .orb-1 {
        width: 300px;
        height: 300px;
        background: #6366f1;
        top: -100px;
        right: -50px;
      }

      .orb-2 {
        width: 250px;
        height: 250px;
        background: #a855f7;
        bottom: -100px;
        right: 200px;
        animation-delay: 2s;
      }

      @keyframes float {
        0% {
          transform: translateY(0) scale(1);
        }
        100% {
          transform: translateY(30px) scale(1.1);
        }
      }

      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.4);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(45, 212, 191, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(45, 212, 191, 0);
        }
      }

      /* Quick Actions */
      .quick-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 24px;
        margin-bottom: 50px;
      }

      .action-card {
        padding: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 20px;
        position: relative;
        overflow: hidden;
      }

      .action-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
      }

      .action-card:hover::before {
        background: var(--primary-gradient);
      }

      .action-icon-wrapper {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      }

      .action-icon-wrapper mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .purple-gradient {
        background: linear-gradient(135deg, #a855f7, #7e22ce);
      }
      .teal-gradient {
        background: linear-gradient(135deg, #2dd4bf, #0f766e);
      }
      .amber-gradient {
        background: linear-gradient(135deg, #fbbf24, #d97706);
      }
      .blue-gradient {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      }

      .action-text h3 {
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 4px 0;
        color: var(--text-main);
      }

      .action-text p {
        color: var(--text-muted);
        font-size: 14px;
        margin: 0;
      }

      .arrow-icon {
        margin-left: auto;
        color: var(--text-muted);
        opacity: 0;
        transform: translateX(-10px);
        transition: all 0.3s ease;
      }

      .action-card:hover .arrow-icon {
        opacity: 1;
        transform: translateX(0);
        color: white;
      }

      /* Recent Section */
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .section-header h2 {
        font-size: 24px;
        font-weight: 800;
        margin: 0;
        position: relative;
        padding-left: 16px;
      }

      .section-header h2::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 24px;
        border-radius: 4px;
        background: var(--primary-gradient);
      }

      .view-all-btn {
        color: #a855f7;
        font-weight: 600;
        letter-spacing: 1px;
      }

      .recent-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
      }

      .recent-card {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .recent-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .operator-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
      }

      .operator-icon.jio {
        color: #e53935;
        background: rgba(229, 57, 53, 0.1);
      }
      .operator-icon.airtel {
        color: #d32f2f;
        background: rgba(211, 47, 47, 0.1);
      }
      .operator-icon.vi {
        color: #fbc02d;
        background: rgba(251, 192, 45, 0.1);
      }

      .recent-body .amount {
        font-size: 32px;
        font-weight: 800;
        margin: 0 0 8px 0;
        color: white;
      }

      .recent-body .number {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-main);
        margin: 0 0 4px 0;
        letter-spacing: 1px;
      }

      .recent-body .operator-name {
        font-size: 14px;
        color: var(--text-muted);
        margin: 0;
      }

      .recent-footer {
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 16px;
        margin-top: auto;
      }

      .repeat-btn {
        width: 100%;
        border-radius: 10px;
        border-color: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
        font-weight: 600;
      }

      .repeat-btn:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .status-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 6px 12px;
        border-radius: 20px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .status-badge.success {
        background: rgba(44, 182, 125, 0.15);
        color: #2cb67d;
        border: 1px solid rgba(44, 182, 125, 0.3);
      }
      .status-badge.failed {
        background: rgba(229, 49, 112, 0.15);
        color: #e53170;
        border: 1px solid rgba(229, 49, 112, 0.3);
      }
      .status-badge.initiated,
      .status-badge.processing {
        background: rgba(255, 137, 6, 0.15);
        color: #ff8906;
        border: 1px solid rgba(255, 137, 6, 0.3);
      }

      /* Empty State */
      .empty-state {
        padding: 60px 40px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .empty-icon-wrapper {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
      }

      .empty-icon-wrapper mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--text-muted);
      }

      .empty-state h3 {
        font-size: 22px;
        font-weight: 700;
        margin: 0 0 12px 0;
        color: white;
      }

      .empty-state p {
        color: var(--text-muted);
        margin: 0 0 32px 0;
        max-width: 400px;
        line-height: 1.6;
      }

      .gradient-btn {
        background: var(--primary-gradient);
        color: white;
        padding: 8px 32px;
        border-radius: 30px;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 1px;
      }

      /* Animations config */
      .slide-down {
        animation: slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .slide-up {
        animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
      }

      .stagger-up > * {
        animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .stagger-up > *:nth-child(1) {
        animation-delay: 0.1s;
      }
      .stagger-up > *:nth-child(2) {
        animation-delay: 0.2s;
      }
      .stagger-up > *:nth-child(3) {
        animation-delay: 0.3s;
      }
      .stagger-up > *:nth-child(4) {
        animation-delay: 0.4s;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .dashboard {
          padding: 16px;
        }
        .welcome-banner {
          padding: 24px;
          flex-direction: column;
          text-align: center;
        }
        .welcome-banner h1 {
          font-size: 32px;
        }
        .quick-actions {
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 32px;
        }
        .recent-grid {
          grid-template-columns: 1fr;
        }
        .orb-1 {
          width: 150px;
          height: 150px;
          right: -20px;
          top: -50px;
        }
        .orb-2 {
          width: 100px;
          height: 100px;
          right: 80px;
          bottom: -50px;
        }
        .notification-bar {
          padding: 12px 16px;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
        .dismiss-btn {
          position: absolute;
          right: 8px;
          top: 8px;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  userName = '';
  recentRecharges: Recharge[] = [];
  recentNotifications: Notification[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private rechargeService: RechargeService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getCurrentUser()?.fullName || 'User';

    this.rechargeService
      .getRechargeHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.recentRecharges = data.slice(0, 5);
          this.cdr.markForCheck();
        },
        error: () => {},
      });

    this.notificationService
      .getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifs) => {
          // Get the latest unread payment/recharge notifications (max 1) for the banner
          this.recentNotifications = notifs
            .filter((n) => !n.isRead && (n.category === 'PAYMENT' || n.category === 'RECHARGE'))
            .slice(0, 1);
          this.cdr.markForCheck();
        },
      });

    this.cdr.markForCheck();
  }

  dismissNotification(): void {
    if (this.recentNotifications.length > 0) {
      this.notificationService
        .markAsRead(this.recentNotifications[0].id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
      this.recentNotifications = [];
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
