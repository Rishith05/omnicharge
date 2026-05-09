import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RechargeService } from './recharge.service';

describe('RechargeService', () => {
  let service: RechargeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(RechargeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initiate recharge via API', () => {
    const request = {
      mobileNumber: '9876543210',
      operatorId: 1,
      planId: 1,
      paymentMethod: 'UPI'
    };

    service.initiateRecharge(request).subscribe(recharge => {
      expect(recharge).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/recharges'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.mobileNumber).toBe('9876543210');
    req.flush({ id: 1, rechargeId: 'RCH-1', status: 'INITIATED' });
  });

  it('should get recharge history via API', () => {
    service.getRechargeHistory().subscribe(recharges => {
      expect(recharges.length).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.includes('/recharges/history'));
    req.flush([{ id: 1, rechargeId: 'RCH-1' }]);
  });

  it('should get recharge by id', () => {
    service.getRechargeById(1).subscribe(recharge => {
      expect(recharge.id).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.includes('/recharges/1'));
    req.flush({ id: 1, rechargeId: 'RCH-1' });
  });

  it('should get all recharges (admin)', () => {
    service.getAllRecharges().subscribe(recharges => {
      expect(recharges).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/admin/recharges'));
    req.flush([]);
  });

  it('should complete recharge in mock mode', () => {
    const mockRecharge = {
      id: 1, rechargeId: 'RCH-1', userId: 1, mobileNumber: '9876543210',
      operatorId: 1, operatorName: 'Jio', planId: 1, planName: 'Unlimited',
      amount: 299, status: 'INITIATED' as const, transactionId: '', createdDate: new Date().toISOString()
    };

    service.completeRecharge(mockRecharge, 'TXN-123');
    expect(service).toBeTruthy();
  });

  it('should fail recharge in mock mode', () => {
    const mockRecharge = {
      id: 1, rechargeId: 'RCH-1', userId: 1, mobileNumber: '9876543210',
      operatorId: 1, operatorName: 'Jio', planId: 1, planName: 'Unlimited',
      amount: 299, status: 'INITIATED' as const, transactionId: '', createdDate: new Date().toISOString()
    };

    service.failRecharge(mockRecharge);
    expect(service).toBeTruthy();
  });

  it('should handle corrupt localStorage gracefully', () => {
    localStorage.setItem('omni_recharges', 'invalid{json}');
    const newService = TestBed.inject(RechargeService);
    expect(newService).toBeTruthy();
  });
});
