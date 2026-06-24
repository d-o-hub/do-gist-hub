import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllFieldErrors, clearFieldError, showFieldError } from '../../src/utils/form-error';

describe('form-error additional coverage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('showFieldError', () => {
    it('returns early when no .form-group parent', () => {
      const input = document.createElement('input');
      input.id = 'orphan-input';
      document.body.appendChild(input);

      showFieldError(input, 'Error');

      expect(input.getAttribute('aria-invalid')).toBeNull();
      document.body.removeChild(input);
    });

    it('creates error element for textarea', () => {
      const group = document.createElement('div');
      group.className = 'form-group';
      const textarea = document.createElement('textarea');
      textarea.id = 'my-textarea';
      group.appendChild(textarea);
      document.body.appendChild(group);

      showFieldError(textarea, 'Required');

      expect(textarea.getAttribute('aria-invalid')).toBe('true');
      expect(textarea.getAttribute('aria-describedby')).toBe('my-textarea-error');
      const errorEl = group.querySelector('.form-error');
      expect(errorEl?.textContent).toBe('Required');

      document.body.removeChild(group);
    });

    it('reuses existing error element', () => {
      const group = document.createElement('div');
      group.className = 'form-group';
      const input = document.createElement('input');
      input.id = 'reuse';
      group.appendChild(input);
      const existingError = document.createElement('p');
      existingError.className = 'form-error';
      group.appendChild(existingError);
      document.body.appendChild(group);

      showFieldError(input, 'First error');
      showFieldError(input, 'Second error');

      const errors = group.querySelectorAll('.form-error');
      expect(errors.length).toBe(1);
      expect(errors[0]?.textContent).toBe('Second error');

      document.body.removeChild(group);
    });

    it('uses fallback id when input has no id', () => {
      const group = document.createElement('div');
      group.className = 'form-group';
      const input = document.createElement('input');
      group.appendChild(input);
      document.body.appendChild(group);

      showFieldError(input, 'Error');

      const errorEl = group.querySelector('.form-error');
      expect(errorEl?.id).toBe('field-error');

      document.body.removeChild(group);
    });

    it('announces error via live region after timeout', () => {
      const group = document.createElement('div');
      group.className = 'form-group';
      const input = document.createElement('input');
      input.id = 'live-test';
      group.appendChild(input);
      document.body.appendChild(group);

      showFieldError(input, 'Please fix');

      const region = document.getElementById('form-error-live-region');
      expect(region).not.toBeNull();
      expect(region?.textContent).toBe('');

      vi.advanceTimersByTime(1);

      expect(region?.textContent).toBe('Please fix');

      document.body.removeChild(group);
    });
  });

  describe('clearFieldError', () => {
    it('returns early when no .form-group parent', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      clearFieldError(input);

      expect(input.getAttribute('aria-invalid')).toBeNull();
      document.body.removeChild(input);
    });

    it('handles textarea when clearing', () => {
      const group = document.createElement('div');
      group.className = 'form-group';
      const textarea = document.createElement('textarea');
      textarea.id = 'ta';
      group.appendChild(textarea);
      document.body.appendChild(group);

      showFieldError(textarea, 'Error');
      expect(textarea.getAttribute('aria-invalid')).toBe('true');

      clearFieldError(textarea);
      expect(textarea.getAttribute('aria-invalid')).toBeNull();
      expect(textarea.getAttribute('aria-describedby')).toBeNull();
      expect(group.querySelector('.form-error')).toBeNull();

      document.body.removeChild(group);
    });

    it('does nothing when no error element exists', () => {
      const group = document.createElement('div');
      group.className = 'form-group';
      const input = document.createElement('input');
      input.id = 'clean';
      group.appendChild(input);
      document.body.appendChild(group);

      expect(() => clearFieldError(input)).not.toThrow();

      document.body.removeChild(group);
    });
  });

  describe('clearAllFieldErrors', () => {
    it('removes all error elements and resets ARIA', () => {
      const container = document.createElement('div');

      const group1 = document.createElement('div');
      group1.className = 'form-group';
      const input1 = document.createElement('input');
      input1.id = 'f1';
      input1.setAttribute('aria-invalid', 'true');
      input1.setAttribute('aria-describedby', 'f1-error');
      group1.appendChild(input1);
      const err1 = document.createElement('p');
      err1.className = 'form-error';
      group1.appendChild(err1);

      const group2 = document.createElement('div');
      group2.className = 'form-group';
      const input2 = document.createElement('input');
      input2.id = 'f2';
      input2.setAttribute('aria-invalid', 'true');
      group2.appendChild(input2);
      const err2 = document.createElement('p');
      err2.className = 'form-error';
      group2.appendChild(err2);

      container.appendChild(group1);
      container.appendChild(group2);
      document.body.appendChild(container);

      clearAllFieldErrors(container);

      expect(container.querySelectorAll('.form-error').length).toBe(0);
      expect(input1.getAttribute('aria-invalid')).toBeNull();
      expect(input1.getAttribute('aria-describedby')).toBeNull();
      expect(input2.getAttribute('aria-invalid')).toBeNull();

      document.body.removeChild(container);
    });

    it('does nothing when container has no errors', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      expect(() => clearAllFieldErrors(container)).not.toThrow();

      document.body.removeChild(container);
    });
  });
});
