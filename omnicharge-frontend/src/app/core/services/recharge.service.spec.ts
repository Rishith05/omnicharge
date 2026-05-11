import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RechargeService } from './recharge.service';
import { environment } from '../../../environments/environment';

describe('RechargeService', () => {
  let service: RechargeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RechargeService],
    });
    service = TestBed.inject(RechargeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Real API', () => {
    beforeEach(() => (environment.useMockApi = false));

    it('should initiate recharge', () => {
      service
        .initiateRecharge({
          mobileNumber: '123',
          operatorId: 1,
          planId: 1,
          paymentMethod: 'RAZORPAY',
        })
        .subscribe((res) => expect(res).toBeDefined());
      httpMock.expectOne((req) => req.method === 'POST').flush({ rechargeId: '1' });
    });

    it('should get history', () => {
      service.getRechargeHistory().subscribe((res) => {
        expect(res).toBeDefined();
        expect(Array.isArray(res)).toBeTrue();
      });
      httpMock.expectOne((req) => req.url.includes('/history')).flush([]);
    });
    it('should get recharge by id via API', () => {
      service.getRechargeById(1).subscribe();
      httpMock.expectOne((req) => req.url.includes('/api/recharges/1')).flush({});
    });

    it('should get all recharges via API', () => {
      service.getAllRecharges().subscribe();
      httpMock.expectOne((req) => req.url.includes('/api/admin/recharges')).flush([]);
    });
  });

  describe('Mock', () => {
    beforeEach(() => {
      environment.useMockApi = true;
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
    });

    it('should handle mock initiate', fakeAsync(() => {
      let res: any;
      service
        .initiateRecharge({
          mobileNumber: '1',
          operatorId: 1,
          planId: 1,
          paymentMethod: 'RAZORPAY',
        })
        .subscribe((r) => (res = r));
      tick(500);
      expect(res.rechargeId).toBeDefined();
    }));

    it('should complete recharge in mock mode', () => {
      const mockRecharge: any = { id: 1, status: 'INITIATED' };
      service.completeRecharge(mockRecharge, 'TXN1');
      service.rechargeHistory$.subscribe((history) => {
        expect(history.length).toBeGreaterThan(0);
        expect(history[0].status).toBe('SUCCESS');
        expect(history[0].transactionId).toBe('TXN1');
      });
    });

    it('should fail recharge in mock mode', () => {
      const mockRecharge: any = { id: 1, status: 'INITIATED' };
      service.failRecharge(mockRecharge);
      service.rechargeHistory$.subscribe((history) => {
        expect(history.length).toBeGreaterThan(0);
        expect(history[0].status).toBe('FAILED');
      });
    });

    it('should get recharge history in mock mode', () => {
      let res: any;
      service.getRechargeHistory().subscribe((history) => (res = history));
      expect(res).toBeDefined();
    });
  });
});
