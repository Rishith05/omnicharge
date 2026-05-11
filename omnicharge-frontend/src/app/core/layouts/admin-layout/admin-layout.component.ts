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
  selector: 'app-admin-layout',
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
    <mat-sidenav-container class="admin-container">
      <mat-sidenav #sidenav mode="side" [opened]="true" class="admin-sidenav">
        <div class="sidenav-header">
          <div class="logo">
            <mat-icon class="logo-icon">admin_panel_settings</mat-icon>
            <span class="logo-text">Admin Portal</span>
          </div>
        </div>
        <mat-nav-list class="nav-list">
          <div class="nav-section-label">MANAGEMENT</div>
          <a mat-list-item routerLink="/admin/dashboard" routerLinkActive="active-link">
            <mat-icon matListItemIcon>analytics</mat-icon>
            <span matListItemTitle>System Overview</span>
          </a>
          <div class="nav-divider"></div>
          <div class="nav-section-label">USER ZONE</div>
          <a mat-list-item routerLink="/dashboard">
            <mat-icon matListItemIcon>swap_horiz</mat-icon>
            <span matListItemTitle>Switch to User View</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="admin-content">
        <mat-toolbar class="admin-toolbar glass">
          <button mat-icon-button (click)="sidenav.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="toolbar-spacer"></span>
          <span class="greeting">System Admin: {{ authService.getCurrentUser()?.fullName }}</span>
          <button mat-icon-button [matMenuTriggerFor]="adminMenu">
            <mat-icon>shield</mat-icon>
          </button>
          <mat-menu #adminMenu="matMenu">
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
      .admin-container {
        height: 100vh;
      }
      .admin-sidenav {
        width: 260px;
        background: #0d1117;
        border-right: 1px solid rgba(44, 182, 125, 0.2);
      }
      .sidenav-header {
        padding: 24px;
        border-bottom: 1px solid rgba(44, 182, 125, 0.2);
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
        color: var(--accent-teal);
      }
      .logo-text {
        font-size: 20px;
        font-weight: 800;
        color: var(--text-primary);
        letter-spacing: -0.5px;
      }
      .nav-list {
        padding-top: 8px;
      }
      .nav-list a {
        margin: 4px 12px;
        border-radius: var(--radius-sm);
        transition: var(--transition);
        color: var(--text-secondary);
      }
      .nav-list a:hover {
        background: rgba(44, 182, 125, 0.1);
        color: var(--text-primary);
      }
      .active-link {
        background: rgba(44, 182, 125, 0.15) !important;
        border-left: 3px solid var(--accent-teal);
        color: var(--accent-teal) !important;
      }
      .nav-divider {
        height: 1px;
        background: rgba(44, 182, 125, 0.2);
        margin: 16px 20px;
      }
      .nav-section-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--accent-teal);
        padding: 0 28px;
        margin-bottom: 4px;
        letter-spacing: 1.5px;
      }
      .admin-toolbar {
        background: transparent !important;
        border-bottom: 1px solid rgba(44, 182, 125, 0.2);
        color: var(--text-primary);
      }
      .toolbar-spacer {
        flex: 1 1 auto;
      }
      .greeting {
        font-size: 14px;
        color: var(--accent-teal);
        margin-right: 8px;
        font-weight: 600;
      }
      .main-content {
        padding: 24px;
        min-height: calc(100vh - 64px);
        background: #16181d;
      }
    `,
  ],
})
export class AdminLayoutComponent {
  constructor(public authService: AuthService) {}
}
