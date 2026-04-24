import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, delay, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Recharge, RechargeRequest } from '../models/recharge.model';

@Injectable({ providedIn: 'root' })
export class RechargeService {
  private apiUrl = `${environment.apiUrl}/api/recharges`;

  // Local history stores for mock mode — retains recharges across navigations and reloads
  private rechargeHistory = new BehaviorSubject<Recharge[]>(this.loadStoredRecharges());
  public rechargeHistory$ = this.rechargeHistory.asObservable();

  constructor(private http: HttpClient) {}

  private loadStoredRecharges(): Recharge[] {
    try {
      const stored = localStorage.getItem('omni_recharges');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveRecharges(recharges: Recharge[]): void {
    localStorage.setItem('omni_recharges', JSON.stringify(recharges));
    this.rechargeHistory.next(recharges);
  }

  /** Called by the Saga orchestrator with full context */
  initiateRecharge(request: RechargeRequest & { operatorId?: number; operatorName?: string; planName?: string; amount?: number }): Observable<Recharge> {
    if (environment.useMockApi) {
      const mockRecharge: Recharge = {
        id: Math.floor(Math.random() * 10000),
        rechargeId: 'RCH-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        userId: this.getCurrentUserId(),
        mobileNumber: request.mobileNumber,
        operatorId: request.operatorId || 1,
        operatorName: request.operatorName || 'Unknown',
        planId: request.planId,
        planName: request.planName || 'Plan',
        amount: request.amount || 0,
        status: 'INITIATED',
        transactionId: '',
        createdDate: new Date().toISOString()
      };
      return of(mockRecharge).pipe(delay(400));
    }
    
    // Sanitize payload: Spring Boot backend strictly expects exactly these 4 fields.
    // Extra fields like 'amount' or 'operatorName' will trigger Jackson UnrecognizedPropertyException and return 400 Bad Request.
    const cleanRequest = {
      mobileNumber: request.mobileNumber,
      operatorId: request.operatorId || 1,
      planId: request.planId,
      paymentMethod: request.paymentMethod
    };
    
    return this.http.post<any>(this.apiUrl, cleanRequest);
  }

  /** Mark recharge as SUCCESS and add to history */
  completeRecharge(recharge: Recharge, transactionId: string): void {
    if (environment.useMockApi) {
      const completed: Recharge = {
        ...recharge,
        status: 'SUCCESS',
        transactionId,
        lastModifiedDate: new Date().toISOString()
      };
      const current = this.rechargeHistory.value;
      this.saveRecharges([completed, ...current]);
    }
    // In real mode, the backend updates status via the saga event pipeline
  }

  /** Mark recharge as FAILED (saga compensation) */
  failRecharge(recharge: Recharge): void {
    if (environment.useMockApi) {
      const failed: Recharge = {
        ...recharge,
        status: 'FAILED',
        lastModifiedDate: new Date().toISOString()
      };
      const current = this.rechargeHistory.value;
      this.saveRecharges([failed, ...current]);
    }
    // In real mode, the backend handles failure status via saga events
  }

  getRechargeHistory(): Observable<Recharge[]> {
    if (environment.useMockApi) {
      return this.rechargeHistory$;
    }
    return this.http.get<Recharge[]>(`${this.apiUrl}/history`);
  }

  getRechargeById(id: number): Observable<Recharge> {
    return this.http.get<Recharge>(`${this.apiUrl}/${id}`);
  }

  // Admin
  getAllRecharges(): Observable<Recharge[]> {
    return this.http.get<Recharge[]>(`${environment.apiUrl}/api/admin/recharges`);
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
