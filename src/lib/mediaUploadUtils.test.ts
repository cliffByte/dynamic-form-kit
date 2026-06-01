import { describe, expect, it } from 'vitest';
import type { FormField } from '../types/form';
import {
  getMediaMaxFiles,
  isMediaMultipleField,
  normalizeMediaFieldValue,
  parseMediaMaxFiles,
  toMediaFieldValue,
} from './mediaUploadUtils';

const mediaField = (overrides: Partial<FormField> = {}): FormField =>
  ({
    id: 'f1',
    type: 'media',
    label: 'Photos',
    required: false,
    ...overrides,
  }) as FormField;

describe('media field multi-upload helpers', () => {
  it('treats maxFiles > 1 as multiple even when multiple is false', () => {
    const field = mediaField({ maxFiles: 5, multiple: false });
    expect(isMediaMultipleField(field)).toBe(true);
    expect(getMediaMaxFiles(field)).toBe(5);
  });

  it('parses string maxFiles from JSON', () => {
    const field = mediaField({ maxFiles: '3' as unknown as number });
    expect(parseMediaMaxFiles(field)).toBe(3);
    expect(isMediaMultipleField(field)).toBe(true);
  });

  it('single file when maxFiles is 1 and multiple unset', () => {
    const field = mediaField({ maxFiles: 1 });
    expect(isMediaMultipleField(field)).toBe(false);
    expect(getMediaMaxFiles(field)).toBe(1);
  });

  it('legacy multiple:true without maxFiles defaults cap to 10', () => {
    const field = mediaField({ multiple: true });
    expect(isMediaMultipleField(field)).toBe(true);
    expect(getMediaMaxFiles(field)).toBe(10);
  });

  it('reads max_files snake_case from API payloads', () => {
    const field = mediaField({ max_files: 4 } as Partial<FormField>);
    expect(parseMediaMaxFiles(field)).toBe(4);
    expect(isMediaMultipleField(field)).toBe(true);
  });

  it('normalizes single object to array and writes array when multi', () => {
    const item = { name: 'a.png', size: 1, type: 'image/png' };
    expect(normalizeMediaFieldValue(item)).toEqual([item]);
    expect(toMediaFieldValue([item, { name: 'b.png', size: 2, type: 'image/png' }], true)).toHaveLength(2);
    expect(toMediaFieldValue([item], false)).toEqual(item);
  });
});
