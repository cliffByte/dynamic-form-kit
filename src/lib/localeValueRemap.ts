import type { FormField } from '../types/form';
import { getLocalizedFieldArray } from './fieldLocalization';

/**
 * Remaps stored values of simple-options choice fields (plain `options: string[]`,
 * no `optionConfigs`, not dynamic) from one locale's option labels to another's.
 *
 * Simple-options fields store the LOCALIZED LABEL as the value, so after a locale
 * switch the stored value no longer matches the new locale's option list and would
 * otherwise be cleared by the choice-field sanitizers. Option arrays are
 * index-aligned across locales, so values are remapped by option index.
 *
 * Values that don't match any option in the previous locale are left untouched.
 * Returns the original `values` reference when nothing changed.
 */
export function remapSimpleOptionValuesForLocale(
  fields: FormField[],
  values: Record<string, any>,
  fromLocale: string,
  toLocale: string,
): Record<string, any> {
  if (fromLocale === toLocale) return values;

  let changed = false;
  const next: Record<string, any> = { ...values };

  const remapSingle = (
    value: unknown,
    prevOptions: string[],
    nextOptions: string[],
  ): unknown => {
    if (typeof value !== 'string' || value === '') return value;
    const index = prevOptions.indexOf(value);
    if (index === -1) return value;
    const mapped = nextOptions[index];
    return mapped === undefined ? value : mapped;
  };

  const walk = (list: FormField[]) => {
    for (const field of list) {
      if (field.fields?.length) walk(field.fields);

      if (field.optionConfigs?.length) {
        for (const config of field.optionConfigs) {
          if (config.nestedForm?.fields?.length) {
            walk(config.nestedForm.fields);
          }
        }
        // optionConfigs store locale-independent option values; no remap needed.
        continue;
      }

      if (field.isDynamic) continue;
      if (!Array.isArray(field.options) || field.options.length === 0) continue;

      const current = next[field.id];
      if (current === undefined || current === null || current === '') continue;

      // Same fallback order as getLocalizedFieldArray:
      // translations.options[locale] -> translations.options.en -> field.options
      const prevOptions = getLocalizedFieldArray(
        field,
        'options',
        fromLocale,
        field.options,
      );
      const nextOptions = getLocalizedFieldArray(
        field,
        'options',
        toLocale,
        field.options,
      );
      if (prevOptions === nextOptions) continue;

      if (Array.isArray(current)) {
        const remapped = current.map((v) =>
          remapSingle(v, prevOptions, nextOptions),
        );
        if (remapped.some((v, i) => v !== current[i])) {
          next[field.id] = remapped;
          changed = true;
        }
      } else {
        const remapped = remapSingle(current, prevOptions, nextOptions);
        if (remapped !== current) {
          next[field.id] = remapped;
          changed = true;
        }
      }
    }
  };

  walk(fields);
  return changed ? next : values;
}
