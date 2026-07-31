import { describe, expect, it } from 'vitest';
import type { FormField } from '../types/form';
import { remapSimpleOptionValuesForLocale } from './localeValueRemap';

function choiceField(overrides: Partial<FormField>): FormField {
  return {
    id: 'choice',
    type: 'select',
    label: 'Choice',
    options: ['Red', 'Blue', 'Green'],
    translations: {
      options: {
        en: ['Red', 'Blue', 'Green'],
        ne: ['रातो', 'नीलो', 'हरियो'],
      },
    },
    ...overrides,
  } as FormField;
}

describe('remapSimpleOptionValuesForLocale', () => {
  it('remaps a single value by option index (en -> ne)', () => {
    const fields = [choiceField({})];
    const result = remapSimpleOptionValuesForLocale(
      fields,
      { choice: 'Blue' },
      'en',
      'ne',
    );
    expect(result.choice).toBe('नीलो');
  });

  it('remaps back on a round trip (ne -> en)', () => {
    const fields = [choiceField({})];
    const result = remapSimpleOptionValuesForLocale(
      fields,
      { choice: 'नीलो' },
      'ne',
      'en',
    );
    expect(result.choice).toBe('Blue');
  });

  it('remaps array values (multi-select / checkbox)', () => {
    const fields = [choiceField({ id: 'multi', type: 'checkbox' })];
    const result = remapSimpleOptionValuesForLocale(
      fields,
      { multi: ['Red', 'Green'] },
      'en',
      'ne',
    );
    expect(result.multi).toEqual(['रातो', 'हरियो']);
  });

  it('leaves values that match no option untouched', () => {
    const fields = [choiceField({})];
    const result = remapSimpleOptionValuesForLocale(
      fields,
      { choice: 'Custom answer' },
      'en',
      'ne',
    );
    expect(result.choice).toBe('Custom answer');
  });

  it('falls back to field.options when the source locale has no translation', () => {
    const fields = [
      choiceField({
        translations: { options: { ne: ['रातो', 'नीलो', 'हरियो'] } },
      }),
    ];
    const result = remapSimpleOptionValuesForLocale(
      fields,
      { choice: 'Red' },
      'en',
      'ne',
    );
    expect(result.choice).toBe('रातो');
  });

  it('skips dynamic fields and optionConfigs-based fields', () => {
    const fields: FormField[] = [
      choiceField({ id: 'dynamic', isDynamic: true }),
      choiceField({
        id: 'configured',
        optionConfigs: [
          { value: 'opt-1', label: 'Red' },
          { value: 'opt-2', label: 'Blue' },
        ],
      }),
    ];
    const values = { dynamic: 'Red', configured: 'opt-1' };
    const result = remapSimpleOptionValuesForLocale(fields, values, 'en', 'ne');
    expect(result).toBe(values);
  });

  it('walks nested section fields and optionConfigs nested forms', () => {
    const fields: FormField[] = [
      {
        id: 'section',
        type: 'step_section',
        label: 'Section',
        fields: [choiceField({ id: 'inner' })],
      } as FormField,
      {
        id: 'parent',
        type: 'select',
        label: 'Parent',
        optionConfigs: [
          {
            value: 'opt-1',
            label: 'Option 1',
            nestedForm: {
              id: 'nf',
              name: 'Nested',
              fields: [choiceField({ id: 'nested' })],
            },
          },
        ],
      } as FormField,
    ];
    const result = remapSimpleOptionValuesForLocale(
      fields,
      { inner: 'Red', nested: 'Green', parent: 'opt-1' },
      'en',
      'ne',
    );
    expect(result.inner).toBe('रातो');
    expect(result.nested).toBe('हरियो');
    expect(result.parent).toBe('opt-1');
  });

  it('returns the same reference when nothing changes', () => {
    const fields = [choiceField({})];
    const values = { choice: '' };
    expect(remapSimpleOptionValuesForLocale(fields, values, 'en', 'ne')).toBe(
      values,
    );
    expect(remapSimpleOptionValuesForLocale(fields, values, 'en', 'en')).toBe(
      values,
    );
  });
});
