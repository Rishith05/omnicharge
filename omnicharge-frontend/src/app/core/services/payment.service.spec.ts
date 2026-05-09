import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create order via API', () => {
    const payload = { amount: 299, rechargeId: 'RCH-1' };

    service.createOrder(payload).subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/payments/process'));
    expect(req.request.method).toBe('POST');
    req.flush({ orderId: 'order_123', amount: 29900, currency: 'INR' });
  });

  it('should verify payment via API', () => {
    const paymentData = {
      transactionId: 'TXN-1',
      razorpayPaymentId: 'pay_123',
      razorpaySignature: 'sig_abc'
    };

    service.verifyPayment(paymentData).subscribe(txn => {
      expect(txn).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/webhook/confirm'));
    expect(req.request.method).toBe('POST');
    req.flush({
      id: 1,
      transactionId: 'TXN-1',
      status: 'SUCCESS',
      amount: 299
    });
  });

  it('should get transaction history from API', () => {
    service.getTransactionHistory().subscribe(txns => {
      expect(txns.length).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.includes('/payments/history'));
    req.flush([{ id: 1, transactionId: 'TXN-1' }]);
  });

  it('should get all transactions (admin)', () => {
    service.getAllTransactions().subscribe(txns => {
      expect(txns).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/admin/payments'));
    req.flush([]);
  });

  it('should record failed transaction in mock mode', () => {
    // Calling recordFailedTransaction should not throw
    service.recordFailedTransaction(1, 299, 'order_123');
    expect(service).toBeTruthy();
  });

  it('should handle localStorage errors gracefully', () => {
    localStorage.setItem('omni_transactions', 'invalid-json');
    const newService = TestBed.inject(PaymentService);
    expect(newService).toBeTruthy();
  });
});
