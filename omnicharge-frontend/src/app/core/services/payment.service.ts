import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, delay, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Transaction } from '../models/recharge.model';

declare var Razorpay: any;

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/api/payments`;

  // Local transaction store for mock mode
  private transactionHistory = new BehaviorSubject<Transaction[]>(this.loadStoredTransactions());
  public transactionHistory$ = this.transactionHistory.asObservable();

  constructor(private http: HttpClient) {}

  private loadStoredTransactions(): Transaction[] {
    try {
      const stored = localStorage.getItem('omni_transactions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem('omni_transactions', JSON.stringify(transactions));
    this.transactionHistory.next(transactions);
  }

  /**
   * Step 1 of payment: Create a Razorpay order via DirectRazorpayController.
   * POST /api/payments/create-order  with { amount, currency }
   * Backend returns ApiResponse<OrderResponse> → unwrapped to { orderId, amount, currency }
   */
  createOrder(payload: any): Observable<any> {
    if (environment.useMockApi) {
      return of({
        transactionId: 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        razorpayOrderId: 'order_' + Math.random().toString(36).substring(2, 12),
        amount: Math.round(payload.amount * 100),
        currency: 'INR',
        rechargeId: payload.rechargeId
      }).pipe(delay(800));
    }
    return this.http.post(`${this.apiUrl}/process`, payload);
  }

  /**
   * Step 2: Open Razorpay Checkout modal for real payment processing.
   * Returns a Promise that resolves with payment data or rejects on failure/cancellation.
   */
  openRazorpayCheckout(options: {
    orderId: string;
    amount: number;
    currency?: string;
    name?: string;
    description?: string;
    userEmail?: string;
    userPhone?: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      const razorpayOptions = {
        key: (environment as any).razorpayKeyId || 'rzp_live_SlZ6w1LdJA29oZ',
        amount: Math.round(options.amount * 100), // Razorpay expects paisa
        currency: options.currency || 'INR',
        name: options.name || 'OmniCharge',
        description: options.description || 'Mobile Recharge Payment',
        order_id: options.orderId,
        prefill: {
          email: options.userEmail || '',
          contact: options.userPhone || ''
        },
        theme: {
          color: '#7f5af0'
        },
        handler: (response: any) => {
          // Payment successful — Razorpay returns payment_id, order_id, signature
          resolve({
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature
          });
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled by user'));
          }
        }
      };

      try {
        if (typeof Razorpay !== 'undefined') {
          const rzp = new Razorpay(razorpayOptions);
          rzp.on('payment.failed', (response: any) => {
            reject(new Error(response.error?.description || 'Payment failed'));
          });
          rzp.open();
        } else {
          reject(new Error('Razorpay SDK not loaded. Please check your internet connection and try again.'));
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Step 3: Verify the payment on the backend via DirectRazorpayController.
   * POST /api/payments/verify-payment  with { razorpayOrderId, razorpayPaymentId, razorpaySignature }
   * Backend returns ApiResponse<String> → unwrapped to "SUCCESS" string
   * We convert it to a Transaction-like object for the saga.
   */
  verifyPayment(paymentData: any): Observable<Transaction> {
    if (environment.useMockApi) {
      const mockTxn: Transaction = {
        id: Math.floor(Math.random() * 10000),
        transactionId: 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        rechargeId: paymentData.rechargeId || '1',
        userId: this.getCurrentUserId(),
        amount: paymentData.amount || 0,
        paymentMethod: 'RAZORPAY',
        status: 'SUCCESS',
        razorpayOrderId: paymentData.razorpayOrderId || 'order_mock',
        createdDate: new Date().toISOString()
      };
      // Store in local history
      const current = this.transactionHistory.value;
      this.saveTransactions([mockTxn, ...current]);
      return of(mockTxn).pipe(delay(1000));
    }

    // Call the webhook endpoint to manually confirm the saga payment
    return this.http.post<any>(
      `${this.apiUrl}/webhook/confirm/${paymentData.transactionId}?razorpayPaymentId=${paymentData.razorpayPaymentId}&razorpaySignature=${paymentData.razorpaySignature}`,
      {}
    ).pipe(
      map((txn: any) => {
        // Store in local history
        const current = this.transactionHistory.value;
        this.saveTransactions([txn, ...current]);
        return txn;
      })
    );
  }

  /** Record a failed transaction (saga compensation) */
  recordFailedTransaction(rechargeId: number, amount: number, orderId: string): void {
    if (environment.useMockApi) {
      const failedTxn: Transaction = {
        id: Math.floor(Math.random() * 10000),
        transactionId: 'TXN-FAIL-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        rechargeId: String(rechargeId),
        userId: this.getCurrentUserId(),
        amount,
        paymentMethod: 'RAZORPAY',
        status: 'FAILED',
        razorpayOrderId: orderId,
        createdDate: new Date().toISOString()
      };
      const current = this.transactionHistory.value;
      this.saveTransactions([failedTxn, ...current]);
    }
    // In real mode, failures are recorded server-side when the saga produces failure events
  }

  getTransactionHistory(): Observable<Transaction[]> {
    if (environment.useMockApi) {
      return this.transactionHistory$;
    }
    return this.http.get<Transaction[]>(`${this.apiUrl}/history`);
  }

  getAllTransactions(): Observable<Transaction[]> {
    if (environment.useMockApi) {
      return this.transactionHistory$;
    }
    return this.http.get<Transaction[]>(`${environment.apiUrl}/api/admin/payments`);
  }

  private getCurrentUserId(): number {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr).id || 0;
      }
    } catch { /* ignore */ }
    return 0;
  }
}
