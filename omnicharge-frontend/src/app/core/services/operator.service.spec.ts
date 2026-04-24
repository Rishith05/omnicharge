import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OperatorService } from './operator.service';
import { environment } from '../../../environments/environment';
import { of } from 'rxjs';

describe('OperatorService', () => {
  let service: OperatorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OperatorService]
    });
    service = TestBed.inject(OperatorService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect operator via API when mock is disabled', (done) => {
    const originalUseMock = environment.useMockApi;
    (environment as any).useMockApi = false;
    
    const mockResponse = { operatorId: 1, operatorName: 'Airtel', operatorCode: 'AIRTEL' };
    const mobileNumber = '9876543210';

    service.detectOperator(mobileNumber).subscribe(res => {
      expect(res.operator.name).toBe('Airtel');
      expect(res.operator.code).toBe('AIRTEL');
      expect(res.detectionMethod).toBe('REAL_API');
      (environment as any).useMockApi = originalUseMock;
      done();
    });

    const req = httpMock.expectOne(req => req.url.includes('/api/operators/detect'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('mobileNumber')).toBe(mobileNumber);
    req.flush(mockResponse);
  });

  it('should get all active operators', (done) => {
    const originalUseMock = environment.useMockApi;
    (environment as any).useMockApi = false;
    
    const mockOperators = [
      { id: 1, name: 'Airtel', code: 'AIRTEL', isActive: true },
      { id: 2, name: 'Jio', code: 'JIO', isActive: true }
    ];

    service.getAllOperators().subscribe(ops => {
      expect(ops.length).toBe(2);
      expect(ops[0].name).toBe('Airtel');
      (environment as any).useMockApi = originalUseMock;
      done();
    });

    const req = httpMock.expectOne(req => req.url.includes('/api/operators/active'));
    expect(req.request.method).toBe('GET');
    req.flush(mockOperators);
  });
});
