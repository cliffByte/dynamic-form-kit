// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  getFieldErrorMessage,
  scrollToFirstFieldError,
} from './formStepStructure';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function addFieldElement(id: string): HTMLElement {
  const el = document.createElement('div');
  el.id = `field-${id}`;
  document.body.appendChild(el);
  return el;
}

describe('scrollToFirstFieldError with nested paths', () => {
  it('scrolls to the root table element for cell errors', () => {
    const tableEl = addFieldElement('table1');
    // No element exists for `field-table1.0.col_a`; only the table wrapper.
    scrollToFirstFieldError({ 'table1.0.col_a': 'Column A is required' });

    expect(tableEl.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('prefers the exact element when it exists', () => {
    const exactEl = addFieldElement('field_direct');
    scrollToFirstFieldError({ field_direct: 'Required' });

    expect(exactEl.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('does nothing when there are no errors', () => {
    expect(() => scrollToFirstFieldError({})).not.toThrow();
  });
});

describe('getFieldErrorMessage in jsdom', () => {
  it('resolves nested table errors', () => {
    expect(
      getFieldErrorMessage({ 't.0.c': 'C is required' }, 't'),
    ).toBe('C is required');
  });
});
