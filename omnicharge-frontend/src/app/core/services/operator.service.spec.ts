import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OperatorService } from './operator.service';
import { environment } from '../../../environments/environment';
import { CacheService } from './cache.service';

describe('OperatorService', () => {
  let service: OperatorService;
  let httpMock: HttpTestingController;
  let cacheService: jasmine.SpyObj<CacheService>;

  beforeEach(() => {
    cacheService = jasmine.createSpyObj('CacheService', [
      'get',
      'set',
      'invalidate',
      'invalidateByPrefix',
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OperatorService, { provide: CacheService, useValue: cacheService }],
    });
    service = TestBed.inject(OperatorService);
    httpMock = TestBed.inject(HttpTestingController);

    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Real API Paths', () => {
    beforeEach(() => {
      environment.useMockApi = false;
    });

    it('should detect operator via API', () => {
      const mockRes = { operatorId: 1, operatorName: 'Jio', operatorCode: 'JIO' };
      service.detectOperator('9876543210').subscribe((res) => {
        expect(res.operator.name).toBe('Jio');
        expect(res.detectionMethod).toBe('REAL_API');
      });

      const req = httpMock.expectOne((req) => req.url.includes('/api/operators/detect'));
      req.flush(mockRes);
    });

    it('should get plans via API and map fields correctly', () => {
      const mockPlans = [
        {
          id: 1,
          planName: 'Plan 1',
          price: 100,
          validityDays: 28,
          dataLimit: '1GB',
          category: 'Unlimited',
        },
      ];
      service.getPlansByOperator(1).subscribe((plans) => {
        expect(plans.length).toBe(1);
        expect(plans[0].name).toBe('Plan 1');
      });

      const req = httpMock.expectOne((req) => req.url.includes('/api/plans/search'));
      req.flush(mockPlans);
    });

    it('should create operator via API', () => {
      service.createOperator({ name: 'New' }).subscribe((res) => expect(res).toBeDefined());
      const req = httpMock.expectOne(
        (req) => req.method === 'POST' && req.url.includes('/api/admin/operators'),
      );
      req.flush({});
    });

    it('should update operator via API', () => {
      service.updateOperator(1, { name: 'Updated' }).subscribe((res) => expect(res).toBeDefined());
      const req = httpMock.expectOne(
        (req) => req.method === 'PUT' && req.url.includes('/api/admin/operators/1'),
      );
      req.flush({});
    });

    it('should delete operator via API', () => {
      service.deleteOperator(1).subscribe((res) => expect(res).toBeDefined());
      const req = httpMock.expectOne(
        (req) => req.method === 'DELETE' && req.url.includes('/api/admin/operators/1'),
      );
      req.flush(null);
    });

    it('should toggle operator status via API', () => {
      service.toggleOperatorStatus(1, true).subscribe((res) => expect(res).toBeDefined());
      const req = httpMock.expectOne(
        (req) => req.method === 'PATCH' && req.url.includes('/api/admin/operators/1/activate'),
      );
      req.flush({});
    });
    it('should create plan via API', () => {
      service.createPlan(1, { name: 'Plan 1' }).subscribe((res) => expect(res).toBeDefined());
      const req = httpMock.expectOne(
        (req) => req.method === 'POST' && req.url.includes('/api/admin/operators/1/plans'),
      );
      req.flush({});
    });

    it('should update plan via API', () => {
      service
        .updatePlan(1, 100, { name: 'Plan Updated' })
        .subscribe((res) => expect(res).toBeDefined());
      const req = httpMock.expectOne(
        (req) => req.method === 'PUT' && req.url.includes('/api/admin/operators/plans/100'),
      );
      req.flush({});
    });

    it('should delete plan via API', () => {
      service.deletePlan(1, 100).subscribe((res) => expect(res).toBeDefined());
      const req = httpMock.expectOne(
        (req) => req.method === 'DELETE' && req.url.includes('/api/admin/operators/plans/100'),
      );
      req.flush(null);
    });

    it('should toggle plan status via API', () => {
      service.togglePlanStatus(1, 100, false).subscribe((res) => expect(res).toBeDefined());
      const req = httpMock.expectOne(
        (req) =>
          req.method === 'PATCH' && req.url.includes('/api/admin/operators/plans/100/deactivate'),
      );
      req.flush({});
    });

    it('should get plan by id via API', () => {
      service.getPlanById(100).subscribe((res) => expect(res).toBeDefined());
      const req = httpMock.expectOne(
        (req) => req.method === 'GET' && req.url.includes('/api/plans/100'),
      );
      req.flush({});
    });

    it('should get all operators via API if cache missed', () => {
      cacheService.get.and.returnValue(null);
      service.getAllOperators(false).subscribe((res) => expect(res).toBeDefined());
      const req = httpMock.expectOne((req) => req.url.includes('/api/operators/active'));
      req.flush([]);
    });
  });

  describe('Mock API Paths', () => {
    beforeEach(() => {
      environment.useMockApi = true;
      // Re-init service so it loads mock state immediately
      service = new OperatorService({} as any, cacheService);
    });

    it('should detect operator via mock', fakeAsync(() => {
      let result: any;
      service.detectOperator('9876543210').subscribe((res) => (result = res));
      tick(1000);
      expect(result.detectionMethod).toBe('MOCK_DETECTION');
    }));

    it('should get all operators via mock', fakeAsync(() => {
      let result: any;
      cacheService.get.and.returnValue(null);
      service.getAllOperators().subscribe((res) => (result = res));
      tick(500);
      expect(result.length).toBeGreaterThan(0);
    }));

    it('should get plans by operator via mock', fakeAsync(() => {
      let result: any;
      cacheService.get.and.returnValue(null);
      service.getPlansByOperator(1).subscribe((res) => (result = res));
      tick(500);
      expect(result).toBeDefined();
    }));

    it('should get plan by id via mock', fakeAsync(() => {
      let result: any;
      service.getPlanById(101).subscribe((res) => (result = res));
      tick(500);
      expect(result).toBeDefined();
    }));

    it('should create operator via mock', fakeAsync(() => {
      let result: any;
      service.createOperator({ name: 'Test' }).subscribe((res) => (result = res));
      tick(500);
      expect(result.name).toBe('Test');
    }));

    it('should update operator via mock', fakeAsync(() => {
      let result: any;
      service.updateOperator(1, { name: 'TestUpdate' }).subscribe((res) => (result = res));
      tick(500);
      expect(result.name).toBe('TestUpdate');
    }));

    it('should delete operator via mock', fakeAsync(() => {
      let result = false;
      service.deleteOperator(1).subscribe(() => (result = true));
      tick(500);
      expect(result).toBeTrue();
    }));

    it('should toggle operator status via mock', fakeAsync(() => {
      let result: any;
      service.toggleOperatorStatus(2, false).subscribe((res) => (result = res));
      tick(500);
      expect(result.isActive).toBeFalse();
    }));

    it('should create plan via mock', fakeAsync(() => {
      let result: any;
      service.createPlan(1, { name: 'Test Plan' }).subscribe((res) => (result = res));
      tick(500);
      expect(result.name).toBe('Test Plan');
    }));

    it('should update plan via mock', fakeAsync(() => {
      let result: any;
      service.updatePlan(1, 101, { name: 'Updated Plan' }).subscribe((res) => (result = res));
      tick(500);
      expect(result.name).toBe('Updated Plan');
    }));

    it('should delete plan via mock', fakeAsync(() => {
      let result = false;
      service.deletePlan(1, 101).subscribe(() => (result = true));
      tick(500);
      expect(result).toBeTrue();
    }));

    it('should toggle plan status via mock', fakeAsync(() => {
      let result: any;
      service.togglePlanStatus(1, 101, false).subscribe((res) => (result = res));
      tick(500);
      expect(result.isActive).toBeFalse();
    }));
  });

  describe('Caching and State', () => {
    it('should return cached operators if available', () => {
      cacheService.get.and.returnValue([{ id: 1, name: 'Cached' }] as any);
      service.getAllOperators().subscribe((ops) => {
        expect(ops[0].name).toBe('Cached');
      });
    });
  });
});
