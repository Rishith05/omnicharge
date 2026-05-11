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
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { RechargeService } from '../../core/services/recharge.service';
import { PaymentService } from '../../core/services/payment.service';
import { Recharge, Transaction } from '../../core/models/recharge.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatTabsModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  template: `
    <div class="history-page fade-in">
      <div class="page-header">
        <h1 class="page-title"><mat-icon>history</mat-icon> History</h1>
        <button
          mat-stroked-button
          (click)="refreshData()"
          matTooltip="Refresh data from server"
          class="refresh-btn"
        >
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      </div>

      <mat-tab-group animationDuration="300ms">
        <mat-tab label="Recharges">
          <mat-card class="table-card">
            @if (rechargeDataSource.data.length > 0) {
              <table mat-table [dataSource]="rechargeDataSource" matSort class="custom-table">
                <ng-container matColumnDef="mobileNumber">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Mobile</th>
                  <td mat-cell *matCellDef="let r">{{ r.mobileNumber }}</td>
                </ng-container>
                <ng-container matColumnDef="operatorName">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Operator</th>
                  <td mat-cell *matCellDef="let r">{{ r.operatorName }}</td>
                </ng-container>
                <ng-container matColumnDef="planName">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Plan</th>
                  <td mat-cell *matCellDef="let r">{{ r.planName }}</td>
                </ng-container>
                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount</th>
                  <td mat-cell *matCellDef="let r" class="amount">₹{{ r.amount }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="status-chip" [class]="r.status.toLowerCase()">{{ r.status }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="createdDate">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
                  <td mat-cell *matCellDef="let r">{{ r.createdDate | date: 'medium' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="rechargeColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: rechargeColumns"></tr>
              </table>
              <mat-paginator
                #rechargePaginator
                [pageSizeOptions]="[5, 10, 25, 50]"
                [pageSize]="10"
                showFirstLastButtons
                aria-label="Select recharge page"
              >
              </mat-paginator>
            } @else {
              <div class="empty-state">
                <mat-icon>receipt_long</mat-icon>
                <p>No recharge history yet — complete a recharge to see it here!</p>
              </div>
            }
          </mat-card>
        </mat-tab>

        <mat-tab label="Transactions">
          <mat-card class="table-card">
            @if (txnDataSource.data.length > 0) {
              <table mat-table [dataSource]="txnDataSource" matSort class="custom-table">
                <ng-container matColumnDef="id">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
                  <td mat-cell *matCellDef="let t">#{{ t.id }}</td>
                </ng-container>
                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount</th>
                  <td mat-cell *matCellDef="let t" class="amount">₹{{ t.amount }}</td>
                </ng-container>
                <ng-container matColumnDef="paymentMethod">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Method</th>
                  <td mat-cell *matCellDef="let t">{{ t.paymentMethod }}</td>
                </ng-container>
                <ng-container matColumnDef="transactionId">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Transaction ID</th>
                  <td mat-cell *matCellDef="let t" class="txn-id">{{ t.transactionId }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                  <td mat-cell *matCellDef="let t">
                    <span class="status-chip" [class]="t.status.toLowerCase()">{{ t.status }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="createdDate">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
                  <td mat-cell *matCellDef="let t">{{ t.createdDate | date: 'medium' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="txnColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: txnColumns"></tr>
              </table>
              <mat-paginator
                #txnPaginator
                [pageSizeOptions]="[5, 10, 25, 50]"
                [pageSize]="10"
                showFirstLastButtons
                aria-label="Select transaction page"
              >
              </mat-paginator>
            } @else {
              <div class="empty-state">
                <mat-icon>account_balance_wallet</mat-icon>
                <p>No transactions yet — make a payment to see it here!</p>
              </div>
            }
          </mat-card>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .history-page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 16px;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .page-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 24px;
        font-weight: 800;
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
      .table-card {
        padding: 0;
        margin-top: 16px;
        overflow: auto;
      }
      .custom-table {
        width: 100%;
      }
      .amount {
        font-weight: 700;
        color: var(--accent-teal);
      }
      .txn-id {
        font-family: monospace;
        font-size: 12px;
      }
      .status-chip {
        font-size: 11px;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 20px;
        text-transform: uppercase;
      }
      .status-chip.success {
        background: rgba(44, 182, 125, 0.2);
        color: #2cb67d;
      }
      .status-chip.failed {
        background: rgba(229, 49, 112, 0.2);
        color: #e53170;
      }
      .status-chip.pending,
      .status-chip.initiated,
      .status-chip.processing {
        background: rgba(255, 137, 6, 0.2);
        color: #ff8906;
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
export class HistoryComponent implements OnInit, OnDestroy, AfterViewInit {
  rechargeDataSource = new MatTableDataSource<Recharge>([]);
  txnDataSource = new MatTableDataSource<Transaction>([]);
  rechargeColumns = ['mobileNumber', 'operatorName', 'planName', 'amount', 'status', 'createdDate'];
  txnColumns = ['id', 'amount', 'paymentMethod', 'transactionId', 'status', 'createdDate'];

  @ViewChild('rechargePaginator') rechargePaginator!: MatPaginator;
  @ViewChild('txnPaginator') txnPaginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();

  constructor(
    private rechargeService: RechargeService,
    private paymentService: PaymentService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Attach paginators after view init
    this.rechargeDataSource.paginator = this.rechargePaginator;
    this.txnDataSource.paginator = this.txnPaginator;
  }

  loadData(): void {
    this.rechargeService
      .getRechargeHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.rechargeDataSource.data = data;
          this.cdr.markForCheck();
          // Re-attach paginator when data arrives
          setTimeout(() => {
            if (this.rechargePaginator) {
              this.rechargeDataSource.paginator = this.rechargePaginator;
            }
          });
        },
        error: () => {
          this.rechargeDataSource.data = [];
          this.cdr.markForCheck();
        },
      });

    this.paymentService
      .getTransactionHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.txnDataSource.data = data;
          this.cdr.markForCheck();
          setTimeout(() => {
            if (this.txnPaginator) {
              this.txnDataSource.paginator = this.txnPaginator;
            }
          });
        },
        error: () => {
          this.txnDataSource.data = [];
          this.cdr.markForCheck();
        },
      });
  }

  refreshData(): void {
    // Force refresh bypasses cache
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
