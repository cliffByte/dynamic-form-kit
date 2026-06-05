import { describe, expect, it } from 'vitest';
import type { FormField } from '../types/form';
import {
  getMediaMaxFiles,
  getMediaMaxSize,
  getMediaMaxTotalSize,
  isMediaMultipleField,
  normalizeMediaFieldValue,
  parseMediaMaxFiles,
  toMediaFieldValue,
  validateMediaUploadSelection,
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

describe('validateMediaUploadSelection', () => {
  const mb = 1024 * 1024;

  const file = (name: string, sizeMb: number) =>
    new File([new ArrayBuffer(sizeMb * mb)], name, { type: 'image/png' });

  it('rejects files larger than max size per file', () => {
    const result = validateMediaUploadSelection(
      [file('big.png', 6)],
      [],
      { allowMultiple: false, maxFiles: 1, maxSize: 5 * mb },
    );
    expect(result.accepted).toHaveLength(0);
    expect(result.errors[0]).toContain('big.png');
    expect(result.errors[0]).toContain('5.00 MB');
  });

  it('rejects when file count exceeds remaining slots', () => {
    const result = validateMediaUploadSelection(
      [file('a.png', 1), file('b.png', 1)],
      [{ name: 'existing.png', size: mb, type: 'image/png' }],
      { allowMultiple: true, maxFiles: 2, maxSize: 10 * mb },
    );
    expect(result.accepted).toHaveLength(0);
    expect(result.errors[0]).toContain('Maximum 2 files allowed');
  });

  it('rejects when total size would exceed limit', () => {
    const result = validateMediaUploadSelection(
      [file('new.png', 4)],
      [{ name: 'existing.png', size: 7 * mb, type: 'image/png' }],
      {
        allowMultiple: true,
        maxFiles: 5,
        maxSize: 10 * mb,
        maxTotalSize: 10 * mb,
      },
    );
    expect(result.accepted).toHaveLength(0);
    expect(result.errors[0]).toContain('Total file size exceeds');
  });

  it('accepts valid files and reports only invalid ones', () => {
    const result = validateMediaUploadSelection(
      [file('ok.png', 1), file('bad.png', 8)],
      [],
      { allowMultiple: true, maxFiles: 3, maxSize: 5 * mb },
    );
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0].name).toBe('ok.png');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('bad.png');
  });
});

describe('media size helpers', () => {
  it('reads max size and total size from field config', () => {
    const mb = 1024 * 1024;
    const field = mediaField({ maxSize: 3 * mb, maxTotalSize: 12 * mb });
    expect(getMediaMaxSize(field)).toBe(3 * mb);
    expect(getMediaMaxTotalSize(field)).toBe(12 * mb);
  });
});
