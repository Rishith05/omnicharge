import { CanDeactivateFn } from '@angular/router';

/**
 * Interface that components implement to signal unsaved changes.
 * Components returning true from hasUnsavedChanges() will trigger a browser prompt
 * asking the user to confirm navigation (save/discard).
 */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * CanDeactivate routing guard for components with unsaved form data.
 * Shows a confirmation dialog when the user tries to navigate away from a dirty form.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (component.hasUnsavedChanges && component.hasUnsavedChanges()) {
    return confirm(
      'You have unsaved changes!\n\nDo you want to discard your changes and leave this page?',
    );
  }
  return true;
};
