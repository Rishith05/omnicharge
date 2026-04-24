import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of, delay, timeout, catchError, EMPTY } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  SendOtpRequest,
  VerifyPhoneOtpRequest,
  GoogleAuthRequest,
  ForgotPasswordRequest,
  VerifyOtpRequest,
  ResetPasswordRequest,
  User
} from '../models/user.model';
import { MOCK_AUTH_RESPONSE, MOCK_USER, MOCK_ADMIN } from './mock-data';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Token refresh timer
  private refreshTimerId: any = null;

  constructor(private http: HttpClient, private router: Router) {
    try {
      const stored = localStorage.getItem('user');
      if (stored && stored !== 'undefined' && stored !== 'null') {
        this.currentUserSubject.next(JSON.parse(stored));
        // Schedule auto-refresh if tokens exist
        this.scheduleTokenRefresh();
      }
    } catch (e) {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Phone OTP Authentication (primary login method)
  // ═══════════════════════════════════════════════════════════

  /** Step 1: Send OTP to phone number */
  sendOtp(request: SendOtpRequest): Observable<any> {
    if (environment.useMockApi) {
      return of({ message: 'OTP sent successfully' }).pipe(delay(500));
    }
    return this.http.post(`${this.apiUrl}/send-otp`, request).pipe(timeout(10000));
  }

  /** Dev-only: Fetch the actual OTP for display (no real SMS in dev) */
  fetchDevOtp(mobileNumber: string): Observable<string | null> {
    if (environment.useMockApi) {
      return of('123456').pipe(delay(200));
    }
    return this.http.get<string>(`${this.apiUrl}/dev-otp/${mobileNumber}`).pipe(
      timeout(5000),
      catchError(() => of(null))
    );
  }

  /** Step 2: Verify OTP and authenticate */
  verifyPhoneOtp(request: VerifyPhoneOtpRequest): Observable<AuthResponse> {
    if (environment.useMockApi) {
      const isAdmin = request.mobileNumber === '8688179553';
      const mockUser = isAdmin
        ? { ...MOCK_ADMIN, mobileNumber: request.mobileNumber }
        : { ...MOCK_USER, mobileNumber: request.mobileNumber, fullName: request.fullName || 'Demo User' };
      const mockRes: AuthResponse = {
        ...MOCK_AUTH_RESPONSE,
        user: mockUser,
        isNewUser: false
      };
      return of(mockRes).pipe(delay(500), tap(res => this.handleAuth(res)));
    }
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-phone-otp`, request).pipe(
      timeout(10000),
      tap(res => this.handleAuth(res))
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Google OAuth (retained)
  // ═══════════════════════════════════════════════════════════

  googleLogin(request: GoogleAuthRequest): Observable<AuthResponse> {
    if (environment.useMockApi) {
      return of(MOCK_AUTH_RESPONSE).pipe(delay(500), tap(res => this.handleAuth(res)));
    }
    return this.http.post<AuthResponse>(`${this.apiUrl}/google`, request).pipe(
      timeout(10000),
      tap(res => this.handleAuth(res))
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Password Reset (legacy, for LOCAL users)
  // ═══════════════════════════════════════════════════════════

  forgotPassword(request: ForgotPasswordRequest): Observable<any> {
    if (environment.useMockApi) {
      return of({ message: 'OTP sent to your email' }).pipe(delay(500));
    }
    return this.http.post(`${this.apiUrl}/forgot-password`, request);
  }

  verifyOtp(request: VerifyOtpRequest): Observable<any> {
    if (environment.useMockApi) {
      return of({ message: 'OTP verified successfully' }).pipe(delay(500));
    }
    return this.http.post(`${this.apiUrl}/verify-otp`, request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<any> {
    if (environment.useMockApi) {
      return of({ message: 'Password reset successfully' }).pipe(delay(500));
    }
    return this.http.post(`${this.apiUrl}/reset-password`, request);
  }

  // ═══════════════════════════════════════════════════════════
  // Token Management — refresh token in localStorage
  // ═══════════════════════════════════════════════════════════

  /** Refresh access token using refresh token from localStorage */
  refreshToken(): Observable<AuthResponse> {
    if (environment.useMockApi) {
      return of(MOCK_AUTH_RESPONSE).pipe(delay(200), tap(res => this.handleAuth(res)));
    }
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      this.logout();
      return EMPTY;
    }
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh-token`, { refreshToken }).pipe(
      tap(res => this.handleAuth(res)),
      catchError(() => {
        // Refresh token expired or invalid — force logout
        this.logout();
        return EMPTY;
      })
    );
  }

  /** Schedule automatic token refresh before access token expires */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      // Decode JWT to get expiry (access token is a JWT)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000; // convert to ms
      const now = Date.now();
      const refreshIn = expiresAt - now - 60000; // Refresh 1 minute before expiry

      if (refreshIn > 0) {
        this.refreshTimerId = setTimeout(() => {
          this.refreshToken().subscribe();
        }, refreshIn);
      } else {
        // Token already expired — try refresh immediately
        this.refreshToken().subscribe();
      }
    } catch (e) {
      // Can't decode token — ignore
    }
  }

  logout(): void {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    const token = localStorage.getItem('accessToken');
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }
    return token;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'ROLE_ADMIN';
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  updateLocalUser(updatedUser: User): void {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    this.currentUserSubject.next(updatedUser);
  }

  private handleAuth(res: any): void {
    const authData = res.data ? res.data : res;
    
    if (authData.accessToken) {
      localStorage.setItem('accessToken', authData.accessToken);
    }
    if (authData.refreshToken) {
      localStorage.setItem('refreshToken', authData.refreshToken);
    }
    
    let userData: User;
    if (authData.user) {
      userData = authData.user;
    } else {
      userData = {
        id: authData.id || 0,
        fullName: authData.fullName || '',
        email: authData.email || '',
        mobileNumber: authData.mobileNumber || '',
        role: authData.role?.startsWith('ROLE_') ? authData.role : `ROLE_${authData.role || 'USER'}`,
        authProvider: authData.authProvider || 'PHONE',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    localStorage.setItem('user', JSON.stringify(userData));
    this.currentUserSubject.next(userData);

    // Schedule token refresh
    this.scheduleTokenRefresh();
  }
}
