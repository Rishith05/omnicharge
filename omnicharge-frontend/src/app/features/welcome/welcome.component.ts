import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="welcome-page" [class.fade-out]="leaving">
      <!-- Animated Background -->
      <div class="bg-gradient"></div>
      <div class="bg-orb orb-1"></div>
      <div class="bg-orb orb-2"></div>
      <div class="bg-orb orb-3"></div>
      <div class="bg-grid"></div>

      <!-- Top Nav -->
      <nav class="welcome-nav">
        <div class="nav-spacer"></div>
        <div class="nav-actions">
          @if (isLoggedIn) {
            <button mat-button routerLink="/dashboard" class="nav-link">
              <mat-icon>dashboard</mat-icon> Dashboard
            </button>
          } @else {
            <button mat-button routerLink="/auth/login" class="nav-link">
              <mat-icon>login</mat-icon> Sign In
            </button>
            <button
              mat-raised-button
              color="primary"
              routerLink="/auth/register"
              class="nav-link signup"
            >
              <mat-icon>person_add</mat-icon> Sign Up
            </button>
          }
        </div>
      </nav>

      <!-- Center Content -->
      <div class="welcome-center">
        <div class="logo-wrap animate-logo">
          <mat-icon class="logo-bolt">bolt</mat-icon>
          <div class="logo-ring"></div>
          <div class="logo-ring ring-2"></div>
        </div>

        <h1 class="brand-title animate-title">Omni<span class="highlight">Charge</span></h1>

        <p class="tagline animate-tagline">Instant Mobile Recharge — <em>Anytime, Anywhere</em></p>

        <div class="feature-pills animate-pills">
          <span class="pill"><mat-icon>speed</mat-icon> Lightning Fast</span>
          <span class="pill"><mat-icon>security</mat-icon> Secure Payments</span>
          <span class="pill"><mat-icon>cell_tower</mat-icon> All Operators</span>
        </div>

        <button
          mat-raised-button
          color="primary"
          class="cta-btn animate-cta"
          (click)="goToRecharge()"
        >
          <mat-icon>phone_android</mat-icon>
          Get Started
          <mat-icon class="arrow-bounce">arrow_forward</mat-icon>
        </button>

        <p class="auto-hint animate-hint">Redirecting in {{ countdown }}s...</p>
      </div>

      <!-- Bottom wave decoration -->
      <div class="bottom-wave">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 60L60 52C120 44 240 28 360 24C480 20 600 28 720 40C840 52 960 68 1080 72C1200 76 1320 68 1380 64L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V60Z"
            fill="rgba(127,90,240,0.08)"
          />
        </svg>
      </div>
    </div>
  `,
  styles: [
    `
      .welcome-page {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #0f0e17;
        overflow: hidden;
        transition:
          opacity 0.5s ease,
          transform 0.5s ease;
        z-index: 1000;
      }

      .welcome-page.fade-out {
        opacity: 0;
        transform: scale(1.05);
      }

      /* Background effects */
      .bg-gradient {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(ellipse at 50% 30%, rgba(127, 90, 240, 0.12) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 80%, rgba(44, 182, 125, 0.08) 0%, transparent 50%);
      }

      .bg-grid {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
        background-size: 60px 60px;
      }

      .bg-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        opacity: 0.4;
        animation: orbFloat 10s ease-in-out infinite alternate;
      }

      .orb-1 {
        width: 400px;
        height: 400px;
        background: #7f5af0;
        top: -100px;
        right: -100px;
      }

      .orb-2 {
        width: 300px;
        height: 300px;
        background: #2cb67d;
        bottom: -80px;
        left: -80px;
        animation-delay: 3s;
      }

      .orb-3 {
        width: 200px;
        height: 200px;
        background: #ff8906;
        top: 50%;
        left: 10%;
        animation-delay: 6s;
        opacity: 0.2;
      }

      @keyframes orbFloat {
        0% {
          transform: translateY(0) scale(1);
        }
        100% {
          transform: translateY(40px) scale(1.15);
        }
      }

      /* Navigation */
      .welcome-nav {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 16px 32px;
        z-index: 10;
      }

      .nav-spacer {
        flex: 1;
      }

      .nav-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .nav-link {
        color: rgba(255, 255, 255, 0.7);
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
      }

      .nav-link:hover {
        color: #fff;
      }

      .nav-link.signup {
        color: #fff;
        background: rgba(127, 90, 240, 0.3);
        border: 1px solid rgba(127, 90, 240, 0.4);
      }

      /* Center content */
      .welcome-center {
        position: relative;
        z-index: 5;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 0 24px;
      }

      /* Logo */
      .logo-wrap {
        position: relative;
        width: 100px;
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
      }

      .logo-bolt {
        font-size: 56px;
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #7f5af0 0%, #2cb67d 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        z-index: 2;
        position: relative;
      }

      .logo-ring {
        position: absolute;
        inset: 0;
        border: 2px solid rgba(127, 90, 240, 0.3);
        border-radius: 50%;
        animation: ringPulse 3s ease-in-out infinite;
      }

      .logo-ring.ring-2 {
        inset: -12px;
        border-color: rgba(44, 182, 125, 0.2);
        animation-delay: 1.5s;
      }

      @keyframes ringPulse {
        0%,
        100% {
          transform: scale(1);
          opacity: 0.5;
        }
        50% {
          transform: scale(1.15);
          opacity: 1;
        }
      }

      /* Text */
      .brand-title {
        font-size: 56px;
        font-weight: 900;
        color: #fffffe;
        letter-spacing: -2px;
        margin: 0 0 12px 0;
      }

      .highlight {
        background: linear-gradient(135deg, #7f5af0 0%, #2cb67d 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .tagline {
        font-size: 18px;
        color: rgba(255, 255, 255, 0.6);
        margin: 0 0 32px 0;
        font-weight: 300;
        max-width: 400px;
        line-height: 1.6;
      }

      .tagline em {
        color: #2cb67d;
        font-style: normal;
        font-weight: 500;
      }

      /* Feature pills */
      .feature-pills {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
        margin-bottom: 40px;
      }

      .pill {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 100px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
        font-weight: 500;
        backdrop-filter: blur(8px);
      }

      .pill mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #7f5af0;
      }

      /* CTA Button */
      .cta-btn {
        height: 56px;
        min-width: 240px;
        font-size: 17px;
        font-weight: 700;
        border-radius: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        background: linear-gradient(135deg, #7f5af0 0%, #6c3de8 100%) !important;
        color: #fff !important;
        box-shadow: 0 8px 32px rgba(127, 90, 240, 0.4);
        transition: all 0.3s ease;
      }

      .cta-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 40px rgba(127, 90, 240, 0.5);
      }

      .arrow-bounce {
        animation: arrowBounce 1.5s ease-in-out infinite;
      }

      @keyframes arrowBounce {
        0%,
        100% {
          transform: translateX(0);
        }
        50% {
          transform: translateX(6px);
        }
      }

      /* Auto-hint */
      .auto-hint {
        color: rgba(255, 255, 255, 0.3);
        font-size: 13px;
        margin-top: 20px;
      }

      /* Animations */
      .animate-logo {
        animation: fadeScaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
      }
      .animate-title {
        animation: fadeSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
      }
      .animate-tagline {
        animation: fadeSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.7s both;
      }
      .animate-pills {
        animation: fadeSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.9s both;
      }
      .animate-cta {
        animation: fadeScaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.1s both;
      }
      .animate-hint {
        animation: fadeSlideUp 0.5s ease 1.4s both;
      }

      @keyframes fadeScaleIn {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes fadeSlideUp {
        from {
          opacity: 0;
          transform: translateY(24px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Bottom wave */
      .bottom-wave {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        pointer-events: none;
      }

      .bottom-wave svg {
        display: block;
        width: 100%;
      }

      /* Responsive */
      @media (max-width: 600px) {
        .brand-title {
          font-size: 40px;
        }
        .tagline {
          font-size: 15px;
        }
        .feature-pills {
          gap: 8px;
        }
        .pill {
          font-size: 12px;
          padding: 6px 12px;
        }
        .cta-btn {
          min-width: 200px;
          font-size: 15px;
        }
      }
    `,
  ],
})
export class WelcomeComponent implements OnInit, OnDestroy {
  countdown = 5;
  leaving = false;
  isLoggedIn = false;
  private timer: any;

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();

    this.timer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.goToRecharge();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  goToRecharge(): void {
    if (this.timer) clearInterval(this.timer);
    this.leaving = true;
    setTimeout(() => {
      this.router.navigate(['/recharge-home']);
    }, 400);
  }
}
