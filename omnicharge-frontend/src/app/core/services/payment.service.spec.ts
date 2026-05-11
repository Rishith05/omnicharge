import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { environment } from '../../../environments/environment';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PaymentService],
    });
    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);

    // Better Razorpay mock with proper on method
    (window as any).Razorpay = function (options: any) {
      return {
        open: jasmine.createSpy('open').and.callFake(() => {
          if (options && options.handler) {
            options.handler({
              razorpay_payment_id: 'mock_payment',
              razorpay_order_id: 'mock_order',
              razorpay_signature: 'mock_sig',
            });
          }
        }),
        on: jasmine.createSpy('on'),
      };
    };
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Real API', () => {
    beforeEach(() => (environment.useMockApi = false));

    it('should create order', () => {
      service.createOrder({ amount: 100, currency: 'INR', receipt: 'r' }).subscribe();
      const req = httpMock.expectOne('/api/payments/process');
      req.flush({ id: 'ORD1' });
    });

    it('should verify payment', () => {
      service
        .verifyPayment({ transactionId: '1', razorpayPaymentId: '2', razorpaySignature: '3' })
        .subscribe();
      const req = httpMock.expectOne((req) =>
        req.url.includes('/api/payments/webhook/confirm/1?razorpayPaymentId=2&razorpaySignature=3'),
      );
      req.flush({ status: 'SUCCESS' });
    });

    it('should get transaction history', () => {
      service.getTransactionHistory().subscribe();
      const req = httpMock.expectOne('/api/payments/history');
      req.flush([]);
    });

    it('should get all transactions', () => {
      service.getAllTransactions().subscribe();
      const req = httpMock.expectOne((req) => req.url.includes('/api/admin/payments'));
      req.flush([]);
    });
  });

  describe('Mock', () => {
    beforeEach(() => {
      environment.useMockApi = true;
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
    });

    it('should open mock checkout', fakeAsync(() => {
      let result: any;
      service.openRazorpayCheckout({ amount: 1, orderId: '1' }).then((res) => (result = res));
      tick();
      expect(result.razorpayPaymentId).toBe('mock_payment');
    }));

    it('should handle payment failure in openRazorpayCheckout', fakeAsync(() => {
      (window as any).Razorpay = function () {
        return {
          open: jasmine.createSpy('open'),
          on: jasmine.createSpy('on').and.callFake((event: string, handler: any) => {
            if (event === 'payment.failed') handler({ error: { description: 'Bank error' } });
          }),
        };
      };
      let error: Error | undefined;
      service.openRazorpayCheckout({ amount: 1, orderId: '1' }).catch((e) => (error = e));
      tick();
      expect(error?.message).toBe('Bank error');
    }));

    it('should handle undefined Razorpay SDK', fakeAsync(() => {
      delete (window as any).Razorpay;
      let error: Error | undefined;
      service.openRazorpayCheckout({ amount: 1, orderId: '1' }).catch((e) => (error = e));
      tick();
      expect(error?.message).toContain('Razorpay SDK not loaded');
    }));

    it('should mock createOrder', fakeAsync(() => {
      let result: any;
      service.createOrder({ amount: 100, rechargeId: 1 }).subscribe((res) => (result = res));
      tick(1000);
      expect(result.razorpayOrderId).toContain('order_');
    }));

    it('should mock verifyPayment', fakeAsync(() => {
      let result: any;
      service.verifyPayment({ amount: 100 }).subscribe((res) => (result = res));
      tick(1000);
      expect(result.status).toBe('SUCCESS');
    }));

    it('should mock recordFailedTransaction', () => {
      service.recordFailedTransaction(1, 100, 'mock_order');
      service.transactionHistory$.subscribe((history) => {
        expect(history.length).toBeGreaterThan(0);
        expect(history[0].status).toBe('FAILED');
      });
    });

    it('should mock getTransactionHistory', () => {
      let result: any;
      service.getTransactionHistory().subscribe((res) => (result = res));
      expect(result).toBeDefined();
    });

    it('should mock getAllTransactions', () => {
      let result: any;
      service.getAllTransactions().subscribe((res) => (result = res));
      expect(result).toBeDefined();
    });
  });
});
