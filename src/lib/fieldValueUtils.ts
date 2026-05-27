import type { FormField } from '../types/form';

/**
 * Collect valid option values for choice fields (static configs or simple options).
 */
export function getChoiceOptionValues(field: FormField): string[] {
  if (field.isDynamic) return [];
  if (field.optionConfigs?.length) {
    return field.optionConfigs
      .map((c) => c.value)
      .filter((v) => v !== undefined && v !== '');
  }
  return (field.options ?? []).filter((o) => o !== '');
}

/**
 * Returns true when the value is a valid, non-empty option for this field.
 */
export function isValidChoiceValue(field: FormField, value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  const valid = getChoiceOptionValues(field);
  if (valid.length === 0) return true;
  return valid.includes(String(value));
}

/**
 * Normalize a select/radio value so Radix never receives a stale or invalid value.
 */
export function sanitizeChoiceFieldValue(
  field: FormField,
  value: unknown,
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const str = String(value);
  if (!isValidChoiceValue(field, str)) return undefined;
  return str;
}

/**
 * Normalize multi-select / checkbox values by dropping stale option ids.
 */
export function sanitizeMultiChoiceFieldValue(
  field: FormField,
  value: unknown,
): string[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set(getChoiceOptionValues(field));
  if (valid.size === 0) return value.map(String);
  return value.map(String).filter((v) => valid.has(v));
}
