import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
  ],
  template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav #sidenav mode="side" [opened]="true" class="app-sidenav">
        <div class="sidenav-header">
          <div class="logo">
            <mat-icon class="logo-icon">bolt</mat-icon>
            <span class="logo-text">OmniCharge</span>
          </div>
        </div>
        <mat-nav-list class="nav-list">
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/recharge" routerLinkActive="active-link">
            <mat-icon matListItemIcon>phone_android</mat-icon>
            <span matListItemTitle>Recharge</span>
          </a>
          <a mat-list-item routerLink="/history" routerLinkActive="active-link">
            <mat-icon matListItemIcon>history</mat-icon>
            <span matListItemTitle>History</span>
          </a>
          <a mat-list-item routerLink="/notifications" routerLinkActive="active-link">
            <mat-icon matListItemIcon>notifications</mat-icon>
            <span matListItemTitle>Notifications</span>
          </a>
          <a mat-list-item routerLink="/profile" routerLinkActive="active-link">
            <mat-icon matListItemIcon>person</mat-icon>
            <span matListItemTitle>Profile</span>
          </a>
          @if (authService.isAdmin()) {
            <div class="nav-divider"></div>
            <div class="nav-section-label">ADMIN</div>
            <a mat-list-item routerLink="/admin" routerLinkActive="active-link">
              <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
              <span matListItemTitle>Switch to Admin</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="app-content">
        <mat-toolbar class="app-toolbar glass">
          <button mat-icon-button (click)="sidenav.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="toolbar-spacer"></span>
          <span class="greeting">Welcome, {{ authService.getCurrentUser()?.fullName }}</span>
          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item routerLink="/profile">
              <mat-icon>person</mat-icon>
              <span>Profile</span>
            </button>
            <button mat-menu-item (click)="authService.logout()">
              <mat-icon>logout</mat-icon>
              <span>Logout</span>
            </button>
          </mat-menu>
        </mat-toolbar>
        <main class="main-content fade-in">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .app-container {
        height: 100vh;
      }
      .app-sidenav {
        width: 260px;
        background: var(--bg-secondary);
        border-right: 1px solid var(--border-subtle);
      }
      .sidenav-header {
        padding: 24px;
        border-bottom: 1px solid var(--border-subtle);
      }
      .logo {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .logo-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .logo-text {
        font-size: 22px;
        font-weight: 800;
        background: var(--gradient-primary);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -0.5px;
      }
      .nav-list {
        padding-top: 8px;
      }
      .nav-list a {
        margin: 4px 12px;
        border-radius: var(--radius-sm);
        transition: var(--transition);
      }
      .nav-list a:hover {
        background: var(--bg-glass);
      }
      .active-link {
        background: rgba(127, 90, 240, 0.15) !important;
        border-left: 3px solid var(--accent-purple);
      }
      .nav-divider {
        height: 1px;
        background: var(--border-subtle);
        margin: 16px 20px;
      }
      .nav-section-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-secondary);
        padding: 0 28px;
        margin-bottom: 4px;
        letter-spacing: 1.5px;
      }
      .app-toolbar {
        background: transparent !important;
        border-bottom: 1px solid var(--border-subtle);
        color: var(--text-primary);
      }
      .toolbar-spacer {
        flex: 1 1 auto;
      }
      .greeting {
        font-size: 14px;
        color: var(--text-secondary);
        margin-right: 8px;
      }
      .main-content {
        padding: 24px;
        min-height: calc(100vh - 64px);
      }
    `,
  ],
})
export class UserLayoutComponent {
  constructor(public authService: AuthService) {}
}
