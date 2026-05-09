import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { CacheService } from './cache.service';
import { Router } from '@angular/router';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let cacheServiceSpy: jasmine.SpyObj<CacheService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'updateLocalUser', 'isLoggedIn', 'isAdmin', 'getToken'], {
      currentUser$: { subscribe: () => {} }
    });
    cacheServiceSpy = jasmine.createSpyObj('CacheService', ['get', 'set', 'invalidate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CacheService, useValue: cacheServiceSpy },
        { provide: Router, useValue: { navigate: jasmine.createSpy() } },
      ],
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return cached profile when available', () => {
    const mockUser = { id: 1, fullName: 'Test', email: 'test@test.com' };
    cacheServiceSpy.get.and.returnValue(mockUser);

    service.getProfile().subscribe(user => {
      expect(user).toEqual(mockUser as any);
    });
  });

  it('should fetch profile from API when no cache', () => {
    cacheServiceSpy.get.and.returnValue(null);

    service.getProfile().subscribe(user => {
      expect(user).toBeTruthy();
    });

    const req = httpMock.expectOne(req => req.url.includes('/profile'));
    req.flush({ id: 1, fullName: 'API User', email: 'api@test.com', createdDate: '2026-01-01' });
  });

  it('should force refresh profile', () => {
    cacheServiceSpy.get.and.returnValue({ id: 1 });

    service.getProfile(true).subscribe();

    const req = httpMock.expectOne(req => req.url.includes('/profile'));
    req.flush({ id: 1, fullName: 'Fresh User', email: 'fresh@test.com', createdDate: '2026-01-01' });
  });

  it('should update profile', () => {
    service.updateProfile({ fullName: 'Updated Name' } as any).subscribe(user => {
      expect(user).toBeTruthy();
    });

    const req = httpMock.expectOne(req => req.url.includes('/profile'));
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 1, fullName: 'Updated Name', email: 'test@test.com', createdDate: '2026-01-01' });
  });

  it('should change password', () => {
    service.changePassword({ currentPassword: 'old', newPassword: 'new' } as any).subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(req => req.url.includes('/change-password'));
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'Password changed successfully' });
  });

  it('should get all users', () => {
    cacheServiceSpy.get.and.returnValue(null);

    service.getAllUsers().subscribe(users => {
      expect(users.length).toBe(1);
    });

    const req = httpMock.expectOne(req => req.url.includes('/admin/users'));
    req.flush([{ id: 1, fullName: 'Admin' }]);
  });

  it('should return cached users when available', () => {
    const mockUsers = [{ id: 1, fullName: 'Cached' }];
    cacheServiceSpy.get.and.returnValue(mockUsers);

    service.getAllUsers().subscribe(users => {
      expect(users).toEqual(mockUsers as any);
    });
  });

  it('should get user by id', () => {
    service.getUserById(1).subscribe(user => {
      expect(user.id).toBe(1);
    });

    const req = httpMock.expectOne(req => req.url.includes('/admin/users/1'));
    req.flush({ id: 1, fullName: 'User 1' });
  });

  it('should toggle user status', () => {
    service.toggleUserStatus(1, false).subscribe();

    const req = httpMock.expectOne(req => req.url.includes('/admin/users/1/status'));
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'Status updated' });
  });
});
