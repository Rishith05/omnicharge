import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UpdateProfileRequest, ChangePasswordRequest } from '../models/user.model';
import { MOCK_ALL_USERS } from './mock-data';
import { AuthService } from './auth.service';
import { CacheService } from './cache.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = `${environment.apiUrl}/api/users`;
  private readonly CACHE_KEYS = {
    PROFILE: 'user_profile',
    ALL_USERS: 'all_users',
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cacheService: CacheService
  ) {}

  getProfile(forceRefresh = false): Observable<User> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.cacheService.get<User>(this.CACHE_KEYS.PROFILE);
      if (cached) {
        return of(cached);
      }
    }

    if (environment.useMockApi) {
      const currentUser = this.authService.getCurrentUser() || MOCK_ALL_USERS[1];
      return of(currentUser).pipe(
        delay(300),
        tap(user => this.cacheService.set(this.CACHE_KEYS.PROFILE, user))
      );
    }
    return this.http.get<any>(`${this.apiUrl}/profile`).pipe(
      tap(user => {
        const normalized = this.normalizeUser(user);
        this.authService.updateLocalUser(normalized);
        this.cacheService.set(this.CACHE_KEYS.PROFILE, normalized);
      })
    );
  }

  updateProfile(request: UpdateProfileRequest): Observable<User> {
    if (environment.useMockApi) {
      const currentUser = this.authService.getCurrentUser() || MOCK_ALL_USERS[1];
      const updatedUser = { ...currentUser, ...request };
      this.authService.updateLocalUser(updatedUser);
      this.cacheService.invalidate(this.CACHE_KEYS.PROFILE);
      return of(updatedUser).pipe(delay(300));
    }
    return this.http.put<any>(`${this.apiUrl}/profile`, request).pipe(
      tap(user => {
        const normalized = this.normalizeUser(user);
        this.authService.updateLocalUser(normalized);
        this.cacheService.invalidate(this.CACHE_KEYS.PROFILE);
      })
    );
  }

  private normalizeUser(user: any): User {
    // Java backend may return 'createdDate' instead of 'createdAt'
    return {
      ...user,
      createdAt: user.createdAt || user.createdDate,
      updatedAt: user.updatedAt || user.createdDate // Fallback if missing
    } as User;
  }

  changePassword(request: ChangePasswordRequest): Observable<any> {
    if (environment.useMockApi) {
      return of({ message: 'Password changed successfully' }).pipe(delay(300));
    }
    return this.http.put(`${this.apiUrl}/change-password`, request);
  }

  // Admin endpoints
  getAllUsers(forceRefresh = false): Observable<User[]> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.cacheService.get<User[]>(this.CACHE_KEYS.ALL_USERS);
      if (cached) {
        return of(cached);
      }
    }

    if (environment.useMockApi) {
      return of([...MOCK_ALL_USERS]).pipe(
        delay(400),
        tap(users => this.cacheService.set(this.CACHE_KEYS.ALL_USERS, users))
      );
    }
    return this.http.get<User[]>(`${environment.apiUrl}/api/admin/users`).pipe(
      tap(users => this.cacheService.set(this.CACHE_KEYS.ALL_USERS, users))
    );
  }

  getUserById(id: number): Observable<User> {
    if (environment.useMockApi) {
      return of(MOCK_ALL_USERS.find(u => u.id === id) || MOCK_ALL_USERS[0]).pipe(delay(200));
    }
    return this.http.get<User>(`${environment.apiUrl}/api/admin/users/${id}`);
  }

  toggleUserStatus(id: number, active: boolean): Observable<any> {
    // Invalidate users cache on status change
    this.cacheService.invalidate(this.CACHE_KEYS.ALL_USERS);
    if (environment.useMockApi) {
      return of({ message: 'Status updated' }).pipe(delay(300));
    }
    return this.http.put(`${environment.apiUrl}/api/admin/users/${id}/status?active=${active}`, {});
  }
}
