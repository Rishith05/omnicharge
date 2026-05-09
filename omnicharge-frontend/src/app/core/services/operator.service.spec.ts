import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OperatorService } from './operator.service';
import { CacheService } from './cache.service';

describe('OperatorService', () => {
  let service: OperatorService;
  let httpMock: HttpTestingController;
  let cacheServiceSpy: jasmine.SpyObj<CacheService>;

  beforeEach(() => {
    localStorage.clear();
    cacheServiceSpy = jasmine.createSpyObj('CacheService', ['get', 'set', 'invalidate', 'invalidateByPrefix']);
    cacheServiceSpy.get.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CacheService, useValue: cacheServiceSpy },
      ],
    });

    service = TestBed.inject(OperatorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect operator via API', () => {
    service.detectOperator('9876543210').subscribe(res => {
      expect(res.operator.name).toBe('Airtel');
      expect(res.detectionMethod).toBe('REAL_API');
    });

    const req = httpMock.expectOne(r => r.url.includes('/operators/detect'));
    expect(req.request.method).toBe('GET');
    req.flush({ operatorId: 1, operatorName: 'Airtel', operatorCode: 'AIRTEL' });
  });

  it('should get plans by operator via API', () => {
    service.getPlansByOperator(1).subscribe(plans => {
      expect(plans.length).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.includes('/plans/search'));
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, operatorId: 1, planName: 'Plan 1', price: 299, validityDays: 28, dataLimit: '2GB/day' }]);
  });

  it('should return cached plans when available', () => {
    cacheServiceSpy.get.and.returnValue([{ id: 1, name: 'Cached Plan' }]);

    service.getPlansByOperator(1).subscribe(plans => {
      expect(plans.length).toBe(1);
      expect(plans[0].name).toBe('Cached Plan');
    });
  });

  it('should get plan by id via API', () => {
    service.getPlanById(1).subscribe(plan => {
      expect(plan.id).toBe(1);
    });

    const req = httpMock.expectOne(r => r.url.includes('/plans/1'));
    req.flush({ id: 1, name: 'Test Plan', price: 199 });
  });

  it('should get all operators via API', () => {
    service.getAllOperators().subscribe(ops => {
      expect(ops.length).toBe(2);
    });

    const req = httpMock.expectOne(r => r.url.includes('/operators/active'));
    req.flush([{ id: 1, name: 'Airtel' }, { id: 2, name: 'Jio' }]);
  });

  it('should return cached operators when available', () => {
    cacheServiceSpy.get.and.returnValue([{ id: 1, name: 'Cached Op' }]);

    service.getAllOperators().subscribe(ops => {
      expect(ops.length).toBe(1);
    });
  });

  it('should create operator via API', () => {
    service.createOperator({ name: 'NewOp', code: 'NEW' }).subscribe(op => {
      expect(op).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/admin/operators'));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 100, name: 'NewOp', code: 'NEW', isActive: true });
  });

  it('should update operator via API', () => {
    service.updateOperator(1, { name: 'Updated' }).subscribe(op => {
      expect(op).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/admin/operators/1'));
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 1, name: 'Updated' });
  });

  it('should delete operator via API', () => {
    service.deleteOperator(1).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/admin/operators/1'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should create plan via API', () => {
    service.createPlan(1, { name: 'New Plan', price: 199 }).subscribe(plan => {
      expect(plan).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/admin/operators/1/plans'));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10, name: 'New Plan', price: 199 });
  });

  it('should update plan via API', () => {
    service.updatePlan(1, 10, { name: 'Updated Plan' }).subscribe(plan => {
      expect(plan).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/admin/operators/plans/10'));
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 10, name: 'Updated Plan' });
  });

  it('should delete plan via API', () => {
    service.deletePlan(1, 10).subscribe();

    const req = httpMock.expectOne(r => r.url.includes('/admin/operators/plans/10'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should toggle operator status via API', () => {
    service.toggleOperatorStatus(1, false).subscribe(op => {
      expect(op).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/admin/operators/1/deactivate'));
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 1, isActive: false });
  });

  it('should toggle plan status via API', () => {
    service.togglePlanStatus(1, 10, true).subscribe(plan => {
      expect(plan).toBeTruthy();
    });

    const req = httpMock.expectOne(r => r.url.includes('/admin/operators/plans/10/activate'));
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 10, isActive: true });
  });

  it('should handle corrupt localStorage gracefully', () => {
    localStorage.setItem('omni_operators', 'corrupt{json');
    localStorage.setItem('omni_plans', 'corrupt{json');
    const newService = TestBed.inject(OperatorService);
    expect(newService).toBeTruthy();
  });

  it('should handle plans for non-array response', () => {
    service.getPlansByOperator(1).subscribe(plans => {
      expect(plans).toEqual([]);
    });

    const req = httpMock.expectOne(r => r.url.includes('/plans/search'));
    req.flush('not-an-array'); // non-array response
  });
});
