import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServerErrorComponent } from './server-error.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

describe('ServerErrorComponent', () => {
  let component: ServerErrorComponent;
  let fixture: ComponentFixture<ServerErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServerErrorComponent, NoopAnimationsModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ServerErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display 500 error code', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('500');
    expect(compiled.textContent).toContain('Internal Server Error');
  });

  it('should call history.back on retry', () => {
    spyOn(window.history, 'back');
    component.retry();
    expect(window.history.back).toHaveBeenCalled();
  });
});
