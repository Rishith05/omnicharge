import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { Subject, takeUntil } from 'rxjs';
import { OperatorService } from '../../core/services/operator.service';
import { UserService } from '../../core/services/user.service';
import { Operator, Plan } from '../../core/models/operator.model';
import { User } from '../../core/models/user.model';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule,
  ],
  template: `
    <div class="admin-dashboard fade-in">
      <div class="dashboard-header glass-panel">
        <div class="header-content">
          <div class="title-section">
            <div class="admin-icon-wrapper">
              <mat-icon>admin_panel_settings</mat-icon>
            </div>
            <div>
              <p class="subtitle">Platform Management</p>
              <h1 class="page-title">Admin Console</h1>
            </div>
          </div>
          <div class="header-actions">
            <!-- Optional refresh or report buttons -->
          </div>
        </div>
      </div>

      <div class="stats-grid stagger-up">
        <div class="stat-card glass-card hover-lift">
          <div class="stat-icon-wrapper purple-gradient">
            <mat-icon>people</mat-icon>
          </div>
          <div class="stat-info">
            <p>Total Users</p>
            <h3>{{ users.length }}</h3>
          </div>
        </div>

        <div class="stat-card glass-card hover-lift">
          <div class="stat-icon-wrapper teal-gradient">
            <mat-icon>cell_tower</mat-icon>
          </div>
          <div class="stat-info">
            <p>Active Operators</p>
            <h3>{{ operators.length }}</h3>
          </div>
        </div>

        <div class="stat-card glass-card hover-lift">
          <div class="stat-icon-wrapper amber-gradient">
            <mat-icon>list_alt</mat-icon>
          </div>
          <div class="stat-info">
            <p>Available Plans</p>
            <h3>{{ totalPlans }}</h3>
          </div>
        </div>
      </div>

      <div class="content-section slide-up">
        <div class="glass-panel main-tabs">
          <mat-tab-group animationDuration="300ms">
            <!-- OPERATORS TAB -->
            <mat-tab label="Operators">
              <div class="tab-content">
                <div class="table-header">
                  <h3>Operator Management</h3>
                  <button
                    mat-flat-button
                    class="gradient-btn-small"
                    (click)="
                      showOperatorForm = !showOperatorForm;
                      editingOperator = null;
                      operatorForm.reset()
                    "
                  >
                    <mat-icon>{{ showOperatorForm ? 'close' : 'add' }}</mat-icon>
                    {{ showOperatorForm ? 'Cancel' : 'Add Operator' }}
                  </button>
                </div>

                @if (showOperatorForm) {
                  <div class="inline-form glass-card slide-down">
                    <h4>{{ editingOperator ? 'Edit Operator' : 'New Operator' }}</h4>
                    <form [formGroup]="operatorForm" (ngSubmit)="saveOperator()">
                      <div class="form-row">
                        <mat-form-field appearance="outline">
                          <mat-label>Operator Name</mat-label>
                          <input matInput formControlName="name" placeholder="e.g. Jio" />
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Code</mat-label>
                          <input matInput formControlName="code" placeholder="e.g. JIO" />
                        </mat-form-field>
                        <button
                          mat-raised-button
                          color="primary"
                          class="gradient-btn-small"
                          type="submit"
                          [disabled]="operatorForm.invalid"
                        >
                          <mat-icon>save</mat-icon> {{ editingOperator ? 'Update' : 'Create' }}
                        </button>
                      </div>
                    </form>
                  </div>
                }

                <div class="table-container">
                  <table mat-table [dataSource]="operatorsDataSource" class="custom-table">
                    <ng-container matColumnDef="id"
                      ><th mat-header-cell *matHeaderCellDef>ID</th>
                      <td mat-cell *matCellDef="let o">#{{ o.id }}</td></ng-container
                    >
                    <ng-container matColumnDef="name"
                      ><th mat-header-cell *matHeaderCellDef>Name</th>
                      <td mat-cell *matCellDef="let o" class="fw-600">
                        {{ o.name }}
                      </td></ng-container
                    >
                    <ng-container matColumnDef="code"
                      ><th mat-header-cell *matHeaderCellDef>Code</th>
                      <td mat-cell *matCellDef="let o">
                        <span class="code-badge">{{ o.code }}</span>
                      </td></ng-container
                    >
                    <ng-container matColumnDef="isActive"
                      ><th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let o">
                        <span class="status-badge" [class]="o.isActive ? 'active' : 'inactive'">{{
                          o.isActive ? 'Active' : 'Inactive'
                        }}</span>
                      </td></ng-container
                    >
                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef>Actions</th>
                      <td mat-cell *matCellDef="let o">
                        <button
                          mat-icon-button
                          class="action-btn edit"
                          (click)="editOperator(o)"
                          matTooltip="Edit"
                        >
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button
                          mat-icon-button
                          class="action-btn"
                          [class.toggle-on]="o.isActive"
                          [class.toggle-off]="!o.isActive"
                          (click)="toggleOperator(o)"
                          [matTooltip]="o.isActive ? 'Deactivate' : 'Activate'"
                        >
                          <mat-icon>{{ o.isActive ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                        </button>
                        <button
                          mat-icon-button
                          class="action-btn delete"
                          (click)="deleteOperator(o)"
                          matTooltip="Delete"
                        >
                          <mat-icon>delete</mat-icon>
                        </button>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="operatorColumns"></tr>
                    <tr
                      mat-row
                      *matRowDef="let row; columns: operatorColumns"
                      class="hover-row"
                    ></tr>
                  </table>
                  <mat-paginator
                    #operatorPaginator
                    [pageSizeOptions]="[5, 10, 25, 50]"
                    [pageSize]="10"
                    showFirstLastButtons
                    aria-label="Select operator page"
                  >
                  </mat-paginator>
                </div>
              </div>
            </mat-tab>

            <!-- PLANS TAB -->
            <mat-tab label="Plans">
              <div class="tab-content">
                <div class="table-header">
                  <div class="plans-header-left">
                    <h3>Plan Configuration</h3>
                    <mat-form-field appearance="outline" class="operator-filter">
                      <mat-label>Select Operator</mat-label>
                      <mat-select
                        [value]="selectedOperatorId"
                        (selectionChange)="onPlanOperatorChange($event.value)"
                      >
                        @for (op of operators; track op.id) {
                          <mat-option [value]="op.id">{{ op.name }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </div>
                  <button
                    mat-flat-button
                    class="gradient-btn-small"
                    (click)="showPlanForm = !showPlanForm; editingPlan = null; planForm.reset()"
                    [disabled]="!selectedOperatorId"
                  >
                    <mat-icon>{{ showPlanForm ? 'close' : 'add' }}</mat-icon>
                    {{ showPlanForm ? 'Cancel' : 'Add Plan' }}
                  </button>
                </div>

                @if (showPlanForm && selectedOperatorId) {
                  <div class="inline-form glass-card slide-down">
                    <h4>{{ editingPlan ? 'Edit Plan' : 'New Plan' }}</h4>
                    <form [formGroup]="planForm" (ngSubmit)="savePlan()">
                      <div class="form-grid">
                        <mat-form-field appearance="outline">
                          <mat-label>Plan Name</mat-label>
                          <input
                            matInput
                            formControlName="name"
                            placeholder="e.g. Hero Unlimited"
                          />
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Price (₹)</mat-label>
                          <input matInput formControlName="price" type="number" placeholder="299" />
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Validity (Days)</mat-label>
                          <input
                            matInput
                            formControlName="validity"
                            type="number"
                            placeholder="28"
                          />
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Data</mat-label>
                          <input matInput formControlName="data" placeholder="2 GB/day" />
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Description</mat-label>
                          <input
                            matInput
                            formControlName="description"
                            placeholder="Unlimited calls + 100 SMS/day"
                          />
                        </mat-form-field>
                        <mat-form-field appearance="outline">
                          <mat-label>Category</mat-label>
                          <mat-select formControlName="category">
                            <mat-option value="Recommended">Recommended</mat-option>
                            <mat-option value="Data">Data</mat-option>
                            <mat-option value="Unlimited">Unlimited</mat-option>
                            <mat-option value="Talktime">Talktime</mat-option>
                          </mat-select>
                        </mat-form-field>
                      </div>
                      <div class="form-actions">
                        <button
                          mat-raised-button
                          color="primary"
                          class="gradient-btn-small"
                          type="submit"
                          [disabled]="planForm.invalid"
                        >
                          <mat-icon>save</mat-icon>
                          {{ editingPlan ? 'Update Plan' : 'Create Plan' }}
                        </button>
                      </div>
                    </form>
                  </div>
                }

                @if (selectedOperatorId) {
                  <div class="table-container">
                    <table mat-table [dataSource]="plansDataSource" class="custom-table">
                      <ng-container matColumnDef="id"
                        ><th mat-header-cell *matHeaderCellDef>ID</th>
                        <td mat-cell *matCellDef="let p">#{{ p.id }}</td></ng-container
                      >
                      <ng-container matColumnDef="name"
                        ><th mat-header-cell *matHeaderCellDef>Name</th>
                        <td mat-cell *matCellDef="let p" class="fw-600">
                          {{ p.name }}
                        </td></ng-container
                      >
                      <ng-container matColumnDef="price"
                        ><th mat-header-cell *matHeaderCellDef>Price</th>
                        <td mat-cell *matCellDef="let p" class="amount">
                          ₹{{ p.price }}
                        </td></ng-container
                      >
                      <ng-container matColumnDef="validity"
                        ><th mat-header-cell *matHeaderCellDef>Validity</th>
                        <td mat-cell *matCellDef="let p">{{ p.validity }} days</td></ng-container
                      >
                      <ng-container matColumnDef="data"
                        ><th mat-header-cell *matHeaderCellDef>Data</th>
                        <td mat-cell *matCellDef="let p">{{ p.data }}</td></ng-container
                      >
                      <ng-container matColumnDef="category"
                        ><th mat-header-cell *matHeaderCellDef>Category</th>
                        <td mat-cell *matCellDef="let p">
                          <span class="code-badge">{{ p.category }}</span>
                        </td></ng-container
                      >
                      <ng-container matColumnDef="isActive"
                        ><th mat-header-cell *matHeaderCellDef>Status</th>
                        <td mat-cell *matCellDef="let p">
                          <span class="status-badge" [class]="p.isActive ? 'active' : 'inactive'">{{
                            p.isActive ? 'Active' : 'Inactive'
                          }}</span>
                        </td></ng-container
                      >
                      <ng-container matColumnDef="actions">
                        <th mat-header-cell *matHeaderCellDef>Actions</th>
                        <td mat-cell *matCellDef="let p">
                          <button
                            mat-icon-button
                            class="action-btn edit"
                            (click)="editPlan(p)"
                            matTooltip="Edit"
                          >
                            <mat-icon>edit</mat-icon>
                          </button>
                          <button
                            mat-icon-button
                            class="action-btn"
                            [class.toggle-on]="p.isActive"
                            [class.toggle-off]="!p.isActive"
                            (click)="togglePlan(p)"
                            [matTooltip]="p.isActive ? 'Deactivate' : 'Activate'"
                          >
                            <mat-icon>{{ p.isActive ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                          </button>
                          <button
                            mat-icon-button
                            class="action-btn delete"
                            (click)="deletePlan(p)"
                            matTooltip="Delete"
                          >
                            <mat-icon>delete</mat-icon>
                          </button>
                        </td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="planColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: planColumns" class="hover-row"></tr>
                    </table>
                    <mat-paginator
                      #planPaginator
                      [pageSizeOptions]="[5, 10, 25, 50]"
                      [pageSize]="10"
                      showFirstLastButtons
                      aria-label="Select plan page"
                    >
                    </mat-paginator>
                  </div>
                } @else {
                  <div class="empty-state">
                    <div class="empty-icon-wrapper">
                      <mat-icon>sim_card</mat-icon>
                    </div>
                    <h3>No Operator Selected</h3>
                    <p>
                      Select an operator from the dropdown to view and manage its recharge plans.
                    </p>
                  </div>
                }
              </div>
            </mat-tab>

            <!-- USERS TAB -->
            <mat-tab label="Users">
              <div class="tab-content">
                <div class="table-header">
                  <h3>User Access Control</h3>
                </div>
                <div class="table-container">
                  <table mat-table [dataSource]="usersDataSource" class="custom-table">
                    <ng-container matColumnDef="id"
                      ><th mat-header-cell *matHeaderCellDef>ID</th>
                      <td mat-cell *matCellDef="let u">#{{ u.id }}</td></ng-container
                    >
                    <ng-container matColumnDef="fullName"
                      ><th mat-header-cell *matHeaderCellDef>Name</th>
                      <td mat-cell *matCellDef="let u" class="fw-600">
                        {{ u.fullName }}
                      </td></ng-container
                    >
                    <ng-container matColumnDef="email"
                      ><th mat-header-cell *matHeaderCellDef>Email</th>
                      <td mat-cell *matCellDef="let u" class="text-muted">
                        {{ u.email }}
                      </td></ng-container
                    >
                    <ng-container matColumnDef="role"
                      ><th mat-header-cell *matHeaderCellDef>Role</th>
                      <td mat-cell *matCellDef="let u">
                        <span class="role-badge">{{ u.role }}</span>
                      </td></ng-container
                    >
                    <ng-container matColumnDef="isActive"
                      ><th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let u">
                        <span class="status-badge" [class]="u.isActive ? 'active' : 'inactive'">{{
                          u.isActive ? 'Active' : 'Disabled'
                        }}</span>
                      </td></ng-container
                    >
                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef>Actions</th>
                      <td mat-cell *matCellDef="let u">
                        <button
                          mat-stroked-button
                          [class]="u.isActive ? 'revoke-btn' : 'grant-btn'"
                          (click)="toggleUserAccess(u)"
                        >
                          {{ u.isActive ? 'Revoke Access' : 'Grant Access' }}
                        </button>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="userColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: userColumns" class="hover-row"></tr>
                  </table>
                  <mat-paginator
                    #userPaginator
                    [pageSizeOptions]="[5, 10, 25, 50]"
                    [pageSize]="10"
                    showFirstLastButtons
                    aria-label="Select user page"
                  >
                  </mat-paginator>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>
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

      .admin-dashboard {
        max-width: 1400px;
        margin: 0 auto;
        padding: 24px;
        color: var(--text-main);
      }

      /* Glass Panels */
      .glass-panel {
        background: var(--glass-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--glass-border);
        border-radius: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }

      .glass-card {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }

      /* Animation */
      .hover-lift:hover {
        transform: translateY(-5px);
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      }

      /* Header */
      .dashboard-header {
        padding: 32px;
        margin-bottom: 32px;
        background: linear-gradient(120deg, rgba(30, 30, 45, 0.8) 0%, rgba(20, 20, 35, 0.8) 100%);
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .title-section {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .admin-icon-wrapper {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        background: var(--primary-gradient);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 16px rgba(168, 85, 247, 0.3);
      }

      .admin-icon-wrapper mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: white;
      }

      .subtitle {
        color: var(--text-muted);
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 600;
        margin: 0 0 4px 0;
      }

      .page-title {
        font-size: 32px;
        font-weight: 800;
        margin: 0;
        color: white;
        letter-spacing: -0.5px;
      }

      /* Stats Grid */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
        margin-bottom: 40px;
      }

      .stat-card {
        padding: 24px;
        display: flex;
        align-items: center;
        gap: 24px;
      }

      .stat-icon-wrapper {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      .stat-icon-wrapper mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .purple-gradient {
        background: linear-gradient(135deg, #a855f7, #7e22ce);
        box-shadow: 0 8px 16px rgba(168, 85, 247, 0.3);
      }
      .teal-gradient {
        background: linear-gradient(135deg, #2dd4bf, #0f766e);
        box-shadow: 0 8px 16px rgba(45, 212, 191, 0.3);
      }
      .amber-gradient {
        background: linear-gradient(135deg, #fbbf24, #d97706);
        box-shadow: 0 8px 16px rgba(251, 191, 36, 0.3);
      }

      .stat-info p {
        color: var(--text-muted);
        font-size: 15px;
        margin: 0 0 8px 0;
        font-weight: 500;
      }

      .stat-info h3 {
        font-size: 36px;
        font-weight: 800;
        margin: 0;
        color: white;
        line-height: 1;
      }

      /* Main Tabs and Content */
      .main-tabs {
        overflow: hidden;
      }

      ::ng-deep .mat-mdc-tab-header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        background: rgba(0, 0, 0, 0.2);
      }

      ::ng-deep .mat-mdc-tab .mdc-tab__text-label {
        color: var(--text-muted) !important;
        font-weight: 600;
        letter-spacing: 0.5px;
        font-size: 15px;
      }

      ::ng-deep .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
        color: white !important;
      }

      ::ng-deep .mdc-tab-indicator__content--underline {
        border-color: #a855f7 !important;
        border-width: 3px !important;
      }

      .tab-content {
        padding: 32px;
      }

      /* Tables */
      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .table-header h3 {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
        color: white;
      }

      .plans-header-left {
        display: flex;
        align-items: center;
        gap: 24px;
      }
      .operator-filter {
        width: 250px;
        margin: 0;
      }

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
      ::ng-deep .mat-mdc-text-field-wrapper {
        background: rgba(0, 0, 0, 0.2) !important;
      }

      .table-container {
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.05);
        background: rgba(0, 0, 0, 0.1);
      }

      .custom-table {
        width: 100%;
        background: transparent !important;
      }

      ::ng-deep .mat-mdc-table {
        background: transparent !important;
      }
      ::ng-deep .mat-mdc-header-row {
        background: rgba(0, 0, 0, 0.3);
      }
      ::ng-deep .mat-mdc-header-cell {
        color: var(--text-muted) !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        letter-spacing: 0.5px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      }

      ::ng-deep .mat-mdc-cell {
        color: var(--text-main) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        padding: 16px !important;
      }

      .hover-row:hover {
        background: rgba(255, 255, 255, 0.03);
      }

      .fw-600 {
        font-weight: 600;
      }
      .text-muted {
        color: var(--text-muted) !important;
      }
      .amount {
        font-weight: 700;
        color: #2dd4bf !important;
      }

      /* Badges */
      .code-badge {
        font-size: 12px;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 6px;
        background: rgba(99, 102, 241, 0.15);
        color: #818cf8;
        border: 1px solid rgba(99, 102, 241, 0.3);
      }

      .role-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 20px;
        background: rgba(168, 85, 247, 0.15);
        color: #c084fc;
        border: 1px solid rgba(168, 85, 247, 0.3);
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .status-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 20px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .status-badge.active {
        background: rgba(44, 182, 125, 0.15);
        color: #2cb67d;
        border: 1px solid rgba(44, 182, 125, 0.3);
      }
      .status-badge.inactive {
        background: rgba(229, 49, 112, 0.15);
        color: #e53170;
        border: 1px solid rgba(229, 49, 112, 0.3);
      }

      /* Buttons */
      .gradient-btn-small {
        background: var(--primary-gradient);
        color: white !important;
        border-radius: 8px;
        padding: 0 20px;
        font-weight: 600;
      }

      .action-btn {
        transform: scale(0.9);
        transition: all 0.2s;
      }
      .action-btn:hover {
        transform: scale(1.1);
      }
      .action-btn.edit {
        color: #818cf8;
      }
      .action-btn.delete {
        color: #f87171;
      }
      .action-btn.toggle-on {
        color: #2cb67d;
      }
      .action-btn.toggle-off {
        color: #94a3b8;
      }

      .revoke-btn {
        border-color: rgba(248, 113, 113, 0.3) !important;
        color: #f87171 !important;
        border-radius: 20px;
      }
      .grant-btn {
        border-color: rgba(44, 182, 125, 0.3) !important;
        color: #2cb67d !important;
        border-radius: 20px;
      }
      .revoke-btn:hover {
        background: rgba(248, 113, 113, 0.1);
      }
      .grant-btn:hover {
        background: rgba(44, 182, 125, 0.1);
      }

      /* Forms */
      .inline-form {
        padding: 24px;
        margin-bottom: 24px;
        border: 1px solid var(--primary-gradient);
        background: rgba(99, 102, 241, 0.03);
      }

      .inline-form h4 {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 24px;
        color: white;
      }

      .form-row {
        display: flex;
        gap: 20px;
        align-items: center;
      }
      .form-row mat-form-field {
        flex: 1;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      /* Empty States */
      .empty-state {
        padding: 80px 40px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
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
        margin: 0;
        max-width: 400px;
        line-height: 1.6;
      }

      /* Animations */
      .slide-down {
        animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
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
    `,
  ],
})
export class AdminComponent implements OnInit, OnDestroy, AfterViewInit, HasUnsavedChanges {
  usersDataSource = new MatTableDataSource<User>([]);
  operatorsDataSource = new MatTableDataSource<Operator>([]);
  plansDataSource = new MatTableDataSource<Plan>([]);
  totalPlans = 0;

  // Forms
  operatorForm: FormGroup;
  planForm: FormGroup;
  showOperatorForm = false;
  showPlanForm = false;
  editingOperator: Operator | null = null;
  editingPlan: Plan | null = null;
  selectedOperatorId: number | null = null;

  userColumns = ['id', 'fullName', 'email', 'role', 'isActive', 'actions'];
  operatorColumns = ['id', 'name', 'code', 'isActive', 'actions'];
  planColumns = ['id', 'name', 'price', 'validity', 'data', 'category', 'isActive', 'actions'];

  @ViewChild('userPaginator') userPaginator!: MatPaginator;
  @ViewChild('operatorPaginator') operatorPaginator!: MatPaginator;
  @ViewChild('planPaginator') planPaginator!: MatPaginator;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private operatorService: OperatorService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {
    this.operatorForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
    });
    this.planForm = this.fb.group({
      name: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(1)]],
      validity: ['', [Validators.required, Validators.min(1)]],
      data: ['', Validators.required],
      description: ['', Validators.required],
      category: ['Recommended', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.usersDataSource.paginator = this.userPaginator;
    this.operatorsDataSource.paginator = this.operatorPaginator;
    this.plansDataSource.paginator = this.planPaginator;
  }

  /** CanDeactivate guard — checks if operator or plan form has unsaved changes */
  hasUnsavedChanges(): boolean {
    return (
      (this.showOperatorForm && this.operatorForm.dirty) ||
      (this.showPlanForm && this.planForm.dirty)
    );
  }

  loadData(): void {
    this.userService
      .getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (d) => {
          this.usersDataSource.data = d;
          this.cdr.markForCheck();
          setTimeout(() => {
            if (this.userPaginator) this.usersDataSource.paginator = this.userPaginator;
          });
        },
      });
    this.operatorService
      .getAllOperators()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (d) => {
          this.operatorsDataSource.data = d;
          this.cdr.markForCheck();
          setTimeout(() => {
            if (this.operatorPaginator) this.operatorsDataSource.paginator = this.operatorPaginator;
          });
          // Count total plans across all operators
          let count = 0;
          d.forEach((op) => {
            this.operatorService
              .getPlansByOperator(op.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (plans) => {
                  count += plans.length;
                  this.totalPlans = count;
                  this.cdr.markForCheck();
                },
              });
          });
        },
      });
  }

  // ── Operator CRUD ────────────────────────────────────────
  saveOperator(): void {
    if (this.operatorForm.invalid) return;
    const data = this.operatorForm.value;
    if (this.editingOperator) {
      this.operatorService.updateOperator(this.editingOperator.id, data).subscribe({
        next: () => {
          this.snackBar.open('Operator updated!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          // Update local state
          const idx = this.operatorsDataSource.data.findIndex(
            (o) => o.id === this.editingOperator!.id,
          );
          if (idx >= 0) {
            const updated = [...this.operatorsDataSource.data];
            updated[idx] = { ...updated[idx], ...data };
            this.operatorsDataSource.data = updated;
          }
          this.showOperatorForm = false;
          this.editingOperator = null;
          this.cdr.markForCheck();
        },
        error: () =>
          this.snackBar.open('Update failed', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar'],
          }),
      });
    } else {
      this.operatorService.createOperator({ ...data, isActive: true }).subscribe({
        next: (newOp) => {
          this.snackBar.open('Operator created!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          // In mock mode, create a local operator
          const mockOp: Operator = {
            id: Math.floor(Math.random() * 10000),
            name: data.name,
            code: data.code,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.operatorsDataSource.data = [...this.operatorsDataSource.data, newOp || mockOp];
          this.showOperatorForm = false;
          this.cdr.markForCheck();
        },
        error: () =>
          this.snackBar.open('Create failed', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar'],
          }),
      });
    }
  }

  editOperator(op: Operator): void {
    this.editingOperator = op;
    this.operatorForm.patchValue({ name: op.name, code: op.code });
    this.showOperatorForm = true;
    this.cdr.markForCheck();
  }

  deleteOperator(op: Operator): void {
    if (!confirm(`Delete operator "${op.name}"?`)) return;
    this.operatorService.deleteOperator(op.id).subscribe({
      next: () => {
        this.operatorsDataSource.data = this.operatorsDataSource.data.filter((o) => o.id !== op.id);
        this.snackBar.open('Operator deleted!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.cdr.markForCheck();
      },
      error: () =>
        this.snackBar.open('Delete failed', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        }),
    });
  }

  toggleOperator(op: Operator): void {
    const newStatus = !op.isActive;
    this.operatorService.toggleOperatorStatus(op.id, newStatus).subscribe({
      next: (updatedOp) => {
        op.isActive = updatedOp.isActive;
        this.snackBar.open(`Operator ${newStatus ? 'activated' : 'deactivated'}!`, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.cdr.markForCheck();
      },
      error: () =>
        this.snackBar.open('Failed to update operator status', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        }),
    });
  }

  // ── Plan CRUD ────────────────────────────────────────────
  onPlanOperatorChange(operatorId: number): void {
    this.selectedOperatorId = operatorId;
    this.showPlanForm = false;
    this.loadPlansForOperator(operatorId);
  }

  loadPlansForOperator(operatorId: number): void {
    this.operatorService
      .getPlansByOperator(operatorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          this.plansDataSource.data = plans;
          this.cdr.markForCheck();
          setTimeout(() => {
            if (this.planPaginator) this.plansDataSource.paginator = this.planPaginator;
          });
        },
      });
  }

  savePlan(): void {
    if (this.planForm.invalid || !this.selectedOperatorId) return;
    const data = this.planForm.value;
    if (this.editingPlan) {
      this.operatorService
        .updatePlan(this.selectedOperatorId, this.editingPlan.id, data)
        .subscribe({
          next: () => {
            this.snackBar.open('Plan updated!', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar'],
            });
            const idx = this.plansDataSource.data.findIndex((p) => p.id === this.editingPlan!.id);
            if (idx >= 0) {
              const updated = [...this.plansDataSource.data];
              updated[idx] = { ...updated[idx], ...data };
              this.plansDataSource.data = updated;
            }
            this.showPlanForm = false;
            this.editingPlan = null;
            this.cdr.markForCheck();
          },
          error: () =>
            this.snackBar.open('Update failed', 'Close', {
              duration: 3000,
              panelClass: ['error-snackbar'],
            }),
        });
    } else {
      const opName = this.operators.find((o) => o.id === this.selectedOperatorId)?.name || '';
      this.operatorService
        .createPlan(this.selectedOperatorId, { ...data, isActive: true })
        .subscribe({
          next: (newPlan) => {
            this.snackBar.open('Plan created!', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar'],
            });
            const mockPlan: Plan = {
              id: Math.floor(Math.random() * 10000),
              operatorId: this.selectedOperatorId!,
              operatorName: opName,
              ...data,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            this.plansDataSource.data = [...this.plansDataSource.data, newPlan || mockPlan];
            this.totalPlans++;
            this.showPlanForm = false;
            this.cdr.markForCheck();
          },
          error: () =>
            this.snackBar.open('Create failed', 'Close', {
              duration: 3000,
              panelClass: ['error-snackbar'],
            }),
        });
    }
  }

  editPlan(plan: Plan): void {
    this.editingPlan = plan;
    this.planForm.patchValue({
      name: plan.name,
      price: plan.price,
      validity: plan.validity,
      data: plan.data,
      description: plan.description,
      category: plan.category,
    });
    this.showPlanForm = true;
    this.cdr.markForCheck();
  }

  deletePlan(plan: Plan): void {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    this.operatorService.deletePlan(this.selectedOperatorId!, plan.id).subscribe({
      next: () => {
        this.plansDataSource.data = this.plansDataSource.data.filter((p) => p.id !== plan.id);
        this.totalPlans--;
        this.snackBar.open('Plan deleted!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.cdr.markForCheck();
      },
      error: () =>
        this.snackBar.open('Delete failed', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        }),
    });
  }

  togglePlan(plan: Plan): void {
    const newStatus = !plan.isActive;
    this.operatorService.togglePlanStatus(this.selectedOperatorId!, plan.id, newStatus).subscribe({
      next: (updatedPlan) => {
        plan.isActive = updatedPlan.isActive;
        this.snackBar.open(`Plan ${newStatus ? 'activated' : 'deactivated'}!`, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.cdr.markForCheck();
      },
      error: () =>
        this.snackBar.open('Failed to update plan status', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        }),
    });
  }

  // ── Users ────────────────────────────────────────────────
  toggleUserAccess(user: User): void {
    const newStatus = !user.isActive;
    this.userService.toggleUserStatus(user.id, newStatus).subscribe({
      next: () => {
        user.isActive = newStatus;
        this.cdr.markForCheck();
      },
      error: () =>
        this.snackBar.open('Failed to update user', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        }),
    });
  }

  /** Getter aliases for template compatibility */
  get users() {
    return this.usersDataSource.data;
  }
  get operators() {
    return this.operatorsDataSource.data;
  }
  get operatorPlans() {
    return this.plansDataSource.data;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
