import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const mockUser: any = {
    id: 1,
    fullName: 'Test User',
    email: 'test@test.com',
    mobileNumber: '123',
    role: 'ROLE_USER',
  };

  beforeEach(async () => {
    userService = jasmine.createSpyObj('UserService', [
      'getProfile',
      'updateProfile',
      'changePassword',
    ]);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    userService.getProfile.and.returnValue(of(mockUser));
    userService.updateProfile.and.returnValue(of(mockUser));
    userService.changePassword.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: userService },
        { provide: AuthService, useValue: { getCurrentUser: () => mockUser } },
      ],
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load profile on init', () => {
    expect(userService.getProfile).toHaveBeenCalled();
    expect(component.user?.fullName).toBe('Test User');
  });

  it('should update profile', () => {
    userService.updateProfile.and.returnValue(of({ ...mockUser, fullName: 'New' }));
    component.profileForm.patchValue({ fullName: 'New', mobileNumber: '123' });
    component.updateProfile();
    expect(userService.updateProfile).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Profile updated!', 'Close', jasmine.any(Object));
  });

  it('should change password', () => {
    component.passwordForm.patchValue({ currentPassword: 'old', newPassword: 'newpassword' });
    component.changePassword();
    expect(userService.changePassword).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Password changed!', 'Close', jasmine.any(Object));
  });

  it('should handle update error', () => {
    userService.updateProfile.and.returnValue(throwError(() => ({ error: { message: 'Err' } })));
    component.profileForm.patchValue({ fullName: 'New' });
    component.updateProfile();
    expect(snackBar.open).toHaveBeenCalledWith('Err', 'Close', jasmine.any(Object));
  });

  it('should handle unsaved changes guard', () => {
    expect(component.hasUnsavedChanges()).toBeFalse();
    component.profileForm.markAsDirty();
    expect(component.hasUnsavedChanges()).toBeTrue();
  });

  it('should handle password change error', () => {
    userService.changePassword.and.returnValue(
      throwError(() => ({ error: { message: 'Pass Error' } })),
    );
    component.passwordForm.patchValue({ currentPassword: 'old', newPassword: 'newpassword' });
    component.changePassword();
    expect(snackBar.open).toHaveBeenCalledWith('Pass Error', 'Close', jasmine.any(Object));
  });
});
