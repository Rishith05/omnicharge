import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { CacheService } from './cache.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let cacheService: jasmine.SpyObj<CacheService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'updateLocalUser']);
    cacheService = jasmine.createSpyObj('CacheService', ['get', 'set', 'invalidate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserService,
        { provide: AuthService, useValue: authService },
        { provide: CacheService, useValue: cacheService },
      ],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should get profile', () => {
    environment.useMockApi = false;
    service.getProfile().subscribe();
    httpMock.expectOne((req) => req.url.includes('/profile')).flush({ id: 1, createdDate: '2023' });
    expect(authService.updateLocalUser).toHaveBeenCalled();
  });

  it('should update profile', () => {
    environment.useMockApi = false;
    service.updateProfile({ fullName: 'New', mobileNumber: '123' }).subscribe((res) => {
      expect(res).toBeDefined();
    });
    httpMock.expectOne((req) => req.method === 'PUT').flush({ id: 1 });
  });

  it('should toggle status', () => {
    environment.useMockApi = false;
    service.toggleUserStatus(1, true).subscribe();
    httpMock.expectOne((req) => req.url.includes('status?active=true')).flush({});
    expect(cacheService.invalidate).toHaveBeenCalledWith('all_users');
  });

  it('should change password via API', () => {
    environment.useMockApi = false;
    service.changePassword({ currentPassword: '1', newPassword: '2' }).subscribe();
    httpMock.expectOne((req) => req.url.includes('/change-password')).flush({});
  });

  it('should get all users via API', () => {
    environment.useMockApi = false;
    service.getAllUsers(true).subscribe();
    httpMock.expectOne((req) => req.url.includes('/api/admin/users')).flush([]);
  });

  it('should get user by id via API', () => {
    environment.useMockApi = false;
    service.getUserById(1).subscribe();
    httpMock.expectOne((req) => req.url.includes('/api/admin/users/1')).flush({});
  });

  describe('Mock', () => {
    beforeEach(() => (environment.useMockApi = true));

    it('should handle mock profile', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue({
        id: 1,
        fullName: 'M',
        mobileNumber: '1',
      } as any);
      let res: any;
      service.getProfile().subscribe((u) => (res = u));
      tick(500);
      expect(res.id).toBe(1);
    }));

    it('should update profile via mock', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue({ id: 1, fullName: 'M' } as any);
      let res: any;
      service
        .updateProfile({ fullName: 'Updated', mobileNumber: '1234567890' })
        .subscribe((u) => (res = u));
      tick(500);
      expect(res.fullName).toBe('Updated');
    }));

    it('should change password via mock', fakeAsync(() => {
      let res: any;
      service
        .changePassword({ currentPassword: '1', newPassword: '2' })
        .subscribe((r) => (res = r));
      tick(500);
      expect(res).toBeDefined();
    }));

    it('should get all users via mock', fakeAsync(() => {
      let res: any;
      service.getAllUsers(true).subscribe((r) => (res = r));
      tick(500);
      expect(res.length).toBeGreaterThan(0);
    }));

    it('should get user by id via mock', fakeAsync(() => {
      let res: any;
      service.getUserById(1).subscribe((r) => (res = r));
      tick(500);
      expect(res).toBeDefined();
    }));

    it('should toggle user status via mock', fakeAsync(() => {
      let res: any;
      service.toggleUserStatus(1, true).subscribe((r) => (res = r));
      tick(500);
      expect(res).toBeDefined();
    }));
  });

  describe('Caching', () => {
    it('should return cached profile if available', () => {
      cacheService.get.and.returnValue({ id: 2, fullName: 'Cache' } as any);
      service.getProfile().subscribe((res) => {
        expect(res.id).toBe(2);
      });
    });

    it('should return cached all users if available', () => {
      cacheService.get.and.returnValue([{ id: 2, fullName: 'Cache' }] as any[]);
      service.getAllUsers().subscribe((res) => {
        expect(res[0].id).toBe(2);
      });
    });
  });
});
