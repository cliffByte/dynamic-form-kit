import { useMemo } from 'react';
import { FormField } from '../types/form';
import { getLocalizedField } from '../lib/fieldLocalization';
import { resolveFormKitLocale } from '../lib/locales';
import { useFormKit } from '../context/FormKitContext';

/**
 * Hook to automatically localize a form field based on site locale
 */
export function useLocalizedField(
  field: FormField | undefined,
): FormField | undefined {
  const { locale: localeFromKit } = useFormKit();
  const locale = resolveFormKitLocale(localeFromKit);

  return useMemo(() => {
    if (!field) return undefined;
    return getLocalizedField(field, locale);
  }, [field, locale]);
}

/**
 * Hook to automatically localize an array of form fields
 */
export function useLocalizedFields(fields: FormField[]): FormField[] {
  const { locale: localeFromKit } = useFormKit();
  const locale = resolveFormKitLocale(localeFromKit);

  return useMemo(() => {
    return fields.map((field) => getLocalizedField(field, locale));
  }, [fields, locale]);
}
