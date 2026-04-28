/**
 * Common types for form field components
 */

import { FormField } from '../../types/form';
export * from '../../types/field-props';

/**
 * Helper to get field label with required indicator
 */
export const getFieldLabel = (
  field: FormField,
): { label: string; isRequired: boolean } => ({
  label: field.label || '',
  isRequired: !!field.required,
});
