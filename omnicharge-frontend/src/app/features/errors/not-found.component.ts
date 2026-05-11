import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="error-page">
      <div class="error-container glass-panel">
        <div class="error-icon-wrapper notfound-gradient">
          <mat-icon>search_off</mat-icon>
        </div>
        <h1 class="error-code">404</h1>
        <h2 class="error-title">Page Not Found</h2>
        <p class="error-message">
          The page you're looking for doesn't exist or has been moved. Please check the URL or
          navigate back to a known page.
        </p>
        <div class="error-actions">
          <button mat-raised-button color="primary" routerLink="/dashboard" class="gradient-btn">
            <mat-icon>home</mat-icon> Go to Dashboard
          </button>
          <button mat-stroked-button routerLink="/" class="outline-btn">
            <mat-icon>arrow_back</mat-icon> Back to Home
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .error-page {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 24px;
        background: var(--bg-primary);
      }
      .error-container {
        text-align: center;
        padding: 64px 48px;
        max-width: 520px;
        width: 100%;
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
      }
      .error-icon-wrapper {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        margin: 0 auto 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .error-icon-wrapper mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: white;
      }
      .notfound-gradient {
        background: linear-gradient(135deg, #6366f1, #a855f7);
        box-shadow: 0 12px 24px rgba(99, 102, 241, 0.3);
      }
      .error-code {
        font-size: 72px;
        font-weight: 900;
        margin: 0;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .error-title {
        font-size: 24px;
        font-weight: 700;
        margin: 8px 0 16px;
        color: var(--text-primary);
      }
      .error-message {
        color: var(--text-secondary);
        font-size: 15px;
        line-height: 1.6;
        margin-bottom: 32px;
      }
      .error-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
      }
      .gradient-btn {
        background: var(--gradient-primary) !important;
        color: white;
        border-radius: 12px;
        padding: 0 32px;
        height: 48px;
        font-weight: 600;
      }
      .outline-btn {
        border-color: var(--border-subtle) !important;
        color: var(--text-secondary) !important;
        border-radius: 12px;
        padding: 0 32px;
        height: 48px;
      }
    `,
  ],
})
export class NotFoundComponent {}
