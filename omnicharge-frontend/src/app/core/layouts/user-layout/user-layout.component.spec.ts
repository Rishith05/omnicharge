import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserLayoutComponent } from './user-layout.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../services/auth.service';
import { BehaviorSubject, of } from 'rxjs';

describe('UserLayoutComponent', () => {
  let component: UserLayoutComponent;
  let fixture: ComponentFixture<UserLayoutComponent>;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isLoggedIn', 'isAdmin', 'logout'], {
      currentUser$: new BehaviorSubject(null)
    });
    authSpy.getCurrentUser.and.returnValue({ fullName: 'User' });
    authSpy.isLoggedIn.and.returnValue(true);
    authSpy.isAdmin.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [UserLayoutComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UserLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });
});
