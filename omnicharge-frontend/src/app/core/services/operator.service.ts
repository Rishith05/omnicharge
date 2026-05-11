import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay, timeout, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Operator, Plan, OperatorDetectionResponse } from '../models/operator.model';
import { MOCK_OPERATORS, MOCK_PLANS, detectMockOperator } from './mock-data';
import { CacheService } from './cache.service';

@Injectable({ providedIn: 'root' })
export class OperatorService {
  private apiUrl = environment.apiUrl;

  // Local mock state for CRUD operations
  private mockOperators: Operator[] = [];
  private mockPlans: Record<number, Plan[]> = {};

  constructor(
    private http: HttpClient,
    private cacheService: CacheService,
  ) {
    this.loadMockState();
  }

  private loadMockState(): void {
    try {
      const storedOps = localStorage.getItem('omni_operators');
      if (storedOps) {
        this.mockOperators = JSON.parse(storedOps);
      } else {
        this.mockOperators = [...MOCK_OPERATORS];
        this.saveOperators();
      }

      const storedPlans = localStorage.getItem('omni_plans');
      if (storedPlans) {
        this.mockPlans = JSON.parse(storedPlans);
      } else {
        Object.keys(MOCK_PLANS).forEach((key) => {
          this.mockPlans[+key] = [...MOCK_PLANS[+key]];
        });
        this.savePlans();
      }
    } catch {
      this.mockOperators = [...MOCK_OPERATORS];
      Object.keys(MOCK_PLANS).forEach((key) => {
        this.mockPlans[+key] = [...MOCK_PLANS[+key]];
      });
    }
  }

  private saveOperators(): void {
    localStorage.setItem('omni_operators', JSON.stringify(this.mockOperators));
  }

  private savePlans(): void {
    localStorage.setItem('omni_plans', JSON.stringify(this.mockPlans));
  }

  detectOperator(mobileNumber: string): Observable<OperatorDetectionResponse> {
    if (environment.useMockApi) {
      if (this.mockOperators.length > 0) {
        // Return first active mock operator for any number
        const op = this.mockOperators.find((o) => o.isActive) || this.mockOperators[0];
        return of({
          mobileNumber,
          operator: op,
          detectionMethod: 'MOCK_DETECTION',
        }).pipe(delay(600));
      }
      return of(detectMockOperator(mobileNumber)).pipe(delay(600));
    }
    const params = new HttpParams().set('mobileNumber', mobileNumber);
    return this.http.get<any>(`${this.apiUrl}/api/operators/detect`, { params }).pipe(
      timeout(10000),
      map((res) => {
        // Map backend response (operatorId, operatorName) to frontend Operator object
        return {
          mobileNumber: mobileNumber,
          operator: {
            id: res.operatorId,
            name: res.operatorName,
            code: res.operatorCode,
            isActive: true,
            createdAt: '',
            updatedAt: '',
          },
          detectionMethod: 'REAL_API',
        } as OperatorDetectionResponse;
      }),
    );
  }

  getPlansByOperator(operatorId: number, forceRefresh = false): Observable<Plan[]> {
    const cacheKey = `plans_operator_${operatorId}`;
    if (!forceRefresh) {
      const cached = this.cacheService.get<Plan[]>(cacheKey);
      if (cached) {
        return of(cached);
      }
    }

    if (environment.useMockApi) {
      return of(this.mockPlans[operatorId] ?? []).pipe(
        delay(400),
        tap((plans) => this.cacheService.set(cacheKey, plans)),
      );
    }
    const params = new HttpParams().set('operatorId', operatorId.toString()).set('size', '50'); // get enough plans for UI
    return this.http.get<any[]>(`${this.apiUrl}/api/plans/search`, { params }).pipe(
      map((plans: any[]) => {
        // The robust responseInterceptor already unwraps Page<T> into a raw array.
        if (!Array.isArray(plans)) return [];
        return plans.map(
          (p) =>
            ({
              id: p.id,
              operatorId: p.operatorId,
              operatorName: p.operatorName,
              name: p.planName || p.name, // Spring sends planName
              price: p.price,
              validity: p.validityDays || p.validity, // Spring sends validityDays
              data: p.dataLimit || p.data, // Spring sends dataLimit
              description:
                p.description ||
                [p.callBenefit, p.smsBenefit, p.additionalBenefits].filter(Boolean).join(' • '),
              category: p.category,
              isActive: p.isActive,
              createdAt: p.createdAt || '',
              updatedAt: p.updatedAt || '',
            }) as Plan,
        );
      }),
      tap((plans) => this.cacheService.set(cacheKey, plans)),
    );
  }

  getPlanById(planId: number): Observable<Plan> {
    if (environment.useMockApi) {
      const allPlans = Object.values(this.mockPlans).flat();
      const plan = allPlans.find((p) => p.id === planId);
      return of(plan!).pipe(delay(200));
    }
    return this.http.get<Plan>(`${this.apiUrl}/api/plans/${planId}`);
  }

  getAllOperators(forceRefresh = false): Observable<Operator[]> {
    const cacheKey = 'all_operators';
    if (!forceRefresh) {
      const cached = this.cacheService.get<Operator[]>(cacheKey);
      if (cached) {
        return of(cached);
      }
    }

    if (environment.useMockApi) {
      return of([...this.mockOperators]).pipe(
        delay(300),
        tap((ops) => this.cacheService.set(cacheKey, ops)),
      );
    }
    return this.http
      .get<Operator[]>(`${this.apiUrl}/api/operators/active`)
      .pipe(tap((ops) => this.cacheService.set(cacheKey, ops)));
  }

  // Admin CRUD — with mock support
  createOperator(operator: Partial<Operator>): Observable<Operator> {
    if (environment.useMockApi) {
      const newOp: Operator = {
        id: Math.floor(Math.random() * 10000),
        name: operator.name || '',
        code: operator.code || '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.mockOperators.push(newOp);
      this.mockPlans[newOp.id] = [];
      this.saveOperators();
      this.savePlans();
      this.cacheService.invalidate('all_operators');
      return of(newOp).pipe(delay(300));
    }
    const payload = {
      name: operator.name,
      code: operator.code,
      category: 'PREPAID', // Defaulting to PREPAID as it's required by backend
    };
    return this.http.post<Operator>(`${this.apiUrl}/api/admin/operators`, payload);
  }

  updateOperator(id: number, operator: Partial<Operator>): Observable<Operator> {
    this.cacheService.invalidate('all_operators');
    if (environment.useMockApi) {
      const idx = this.mockOperators.findIndex((o) => o.id === id);
      if (idx >= 0) {
        this.mockOperators[idx] = {
          ...this.mockOperators[idx],
          ...operator,
          updatedAt: new Date().toISOString(),
        };
        this.saveOperators();
      }
      return of(this.mockOperators[idx]).pipe(delay(300));
    }
    const payload = {
      name: operator.name,
      code: operator.code,
      category: 'PREPAID', // Defaulting to PREPAID as it's required by backend
    };
    return this.http.put<Operator>(`${this.apiUrl}/api/admin/operators/${id}`, payload);
  }

  deleteOperator(id: number): Observable<void> {
    this.cacheService.invalidate('all_operators');
    this.cacheService.invalidateByPrefix('plans_operator_');
    if (environment.useMockApi) {
      this.mockOperators = this.mockOperators.filter((o) => o.id !== id);
      delete this.mockPlans[id];
      this.saveOperators();
      this.savePlans();
      return of(undefined).pipe(delay(300));
    }
    return this.http.delete<void>(`${this.apiUrl}/api/admin/operators/${id}`);
  }

  createPlan(operatorId: number, plan: Partial<Plan>): Observable<Plan> {
    if (environment.useMockApi) {
      const opName = this.mockOperators.find((o) => o.id === operatorId)?.name || '';
      const newPlan: Plan = {
        id: Math.floor(Math.random() * 10000),
        operatorId,
        operatorName: opName,
        name: plan.name || '',
        price: plan.price || 0,
        validity: plan.validity || 0,
        data: plan.data || '',
        description: plan.description || '',
        category: plan.category || 'Recommended',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!this.mockPlans[operatorId]) this.mockPlans[operatorId] = [];
      this.mockPlans[operatorId].push(newPlan);
      this.savePlans();
      return of(newPlan).pipe(delay(300));
    }
    const payload = {
      planName: plan.name,
      price: plan.price,
      validityDays: plan.validity,
      dataLimit: plan.data,
      additionalBenefits: plan.description,
      category: plan.category?.toUpperCase() || 'RECOMMENDED',
    };
    return this.http.post<Plan>(`${this.apiUrl}/api/admin/operators/${operatorId}/plans`, payload);
  }

  updatePlan(operatorId: number, planId: number, plan: Partial<Plan>): Observable<Plan> {
    if (environment.useMockApi) {
      const plans = this.mockPlans[operatorId] || [];
      const idx = plans.findIndex((p) => p.id === planId);
      if (idx >= 0) {
        plans[idx] = { ...plans[idx], ...plan, updatedAt: new Date().toISOString() };
        this.savePlans();
      }
      return of(plans[idx]).pipe(delay(300));
    }
    const payload = {
      planName: plan.name,
      price: plan.price,
      validityDays: plan.validity,
      dataLimit: plan.data,
      additionalBenefits: plan.description,
      category: plan.category?.toUpperCase() || 'RECOMMENDED',
    };
    return this.http.put<Plan>(`${this.apiUrl}/api/admin/operators/plans/${planId}`, payload);
  }

  deletePlan(operatorId: number, planId: number): Observable<void> {
    if (environment.useMockApi) {
      if (this.mockPlans[operatorId]) {
        this.mockPlans[operatorId] = this.mockPlans[operatorId].filter((p) => p.id !== planId);
        this.savePlans();
      }
      return of(undefined).pipe(delay(300));
    }
    return this.http.delete<void>(`${this.apiUrl}/api/admin/operators/plans/${planId}`);
  }

  toggleOperatorStatus(id: number, activate: boolean): Observable<Operator> {
    if (environment.useMockApi) {
      const idx = this.mockOperators.findIndex((o) => o.id === id);
      if (idx >= 0) {
        this.mockOperators[idx].isActive = activate;
        this.mockOperators[idx].updatedAt = new Date().toISOString();
        this.saveOperators();
        return of(this.mockOperators[idx]).pipe(delay(300));
      }
      return of({} as Operator);
    }
    const action = activate ? 'activate' : 'deactivate';
    return this.http.patch<Operator>(`${this.apiUrl}/api/admin/operators/${id}/${action}`, {});
  }

  togglePlanStatus(operatorId: number, planId: number, activate: boolean): Observable<Plan> {
    if (environment.useMockApi) {
      const plans = this.mockPlans[operatorId] || [];
      const idx = plans.findIndex((p) => p.id === planId);
      if (idx >= 0) {
        plans[idx].isActive = activate;
        plans[idx].updatedAt = new Date().toISOString();
        this.savePlans();
        return of(plans[idx]).pipe(delay(300));
      }
      return of({} as Plan);
    }
    const action = activate ? 'activate' : 'deactivate';
    return this.http.patch<Plan>(
      `${this.apiUrl}/api/admin/operators/plans/${planId}/${action}`,
      {},
    );
  }
}
