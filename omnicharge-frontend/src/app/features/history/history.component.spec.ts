import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HistoryComponent } from './history.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RechargeService } from '../../core/services/recharge.service';
import { PaymentService } from '../../core/services/payment.service';
import { of, throwError } from 'rxjs';

describe('HistoryComponent', () => {
  let component: HistoryComponent;
  let fixture: ComponentFixture<HistoryComponent>;
  let rechargeService: jasmine.SpyObj<RechargeService>;
  let paymentService: jasmine.SpyObj<PaymentService>;

  const mockRecharges: any[] = [
    {
      id: 1,
      mobileNumber: '9876543210',
      operatorName: 'Jio',
      planName: 'Basic',
      amount: 199,
      status: 'SUCCESS',
      createdDate: new Date().toISOString(),
    },
  ];
  const mockTxns: any[] = [
    {
      id: 1,
      amount: 199,
      paymentMethod: 'RAZORPAY',
      transactionId: 'TXN1',
      status: 'SUCCESS',
      createdDate: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    rechargeService = jasmine.createSpyObj('RechargeService', ['getRechargeHistory']);
    paymentService = jasmine.createSpyObj('PaymentService', ['getTransactionHistory']);

    rechargeService.getRechargeHistory.and.returnValue(of(mockRecharges));
    paymentService.getTransactionHistory.and.returnValue(of(mockTxns));

    await TestBed.configureTestingModule({
      imports: [HistoryComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RechargeService, useValue: rechargeService },
        { provide: PaymentService, useValue: paymentService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load history on init', fakeAsync(() => {
    expect(rechargeService.getRechargeHistory).toHaveBeenCalled();
    expect(paymentService.getTransactionHistory).toHaveBeenCalled();
    tick();
    expect(component.rechargeDataSource.data.length).toBe(1);
    expect(component.txnDataSource.data.length).toBe(1);
  }));

  it('should refresh data', () => {
    component.refreshData();
    expect(rechargeService.getRechargeHistory).toHaveBeenCalledTimes(2);
  });

  it('should handle empty states', () => {
    rechargeService.getRechargeHistory.and.returnValue(of([]));
    paymentService.getTransactionHistory.and.returnValue(of([]));
    component.loadData();
    expect(component.rechargeDataSource.data.length).toBe(0);
    expect(component.txnDataSource.data.length).toBe(0);
  });

  it('should handle errors gracefully', () => {
    rechargeService.getRechargeHistory.and.returnValue(throwError(() => new Error('Err')));
    paymentService.getTransactionHistory.and.returnValue(throwError(() => new Error('Err')));
    component.rechargeDataSource.data = [...mockRecharges];
    component.loadData();
    expect(component.rechargeDataSource.data.length).toBe(0);
  });
});
