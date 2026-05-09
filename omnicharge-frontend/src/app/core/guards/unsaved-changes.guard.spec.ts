import { unsavedChangesGuard, HasUnsavedChanges } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  it('should allow navigation when component has no unsaved changes', () => {
    const component: HasUnsavedChanges = {
      hasUnsavedChanges: () => false,
    };

    const result = unsavedChangesGuard(component, {} as any, {} as any, {} as any);
    expect(result).toBeTrue();
  });

  it('should prompt user when component has unsaved changes', () => {
    const component: HasUnsavedChanges = {
      hasUnsavedChanges: () => true,
    };

    spyOn(window, 'confirm').and.returnValue(true);
    const result = unsavedChangesGuard(component, {} as any, {} as any, {} as any);
    expect(result).toBeTrue();
    expect(window.confirm).toHaveBeenCalled();
  });

  it('should block navigation when user cancels prompt', () => {
    const component: HasUnsavedChanges = {
      hasUnsavedChanges: () => true,
    };

    spyOn(window, 'confirm').and.returnValue(false);
    const result = unsavedChangesGuard(component, {} as any, {} as any, {} as any);
    expect(result).toBeFalse();
  });

  it('should allow navigation when hasUnsavedChanges is undefined', () => {
    const component = {} as HasUnsavedChanges;
    const result = unsavedChangesGuard(component, {} as any, {} as any, {} as any);
    expect(result).toBeTrue();
  });
});
