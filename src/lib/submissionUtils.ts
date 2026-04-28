import type { FormField } from '../types/form';

export type FormKitValues = Record<string, any>;

/**
 * Best-effort extraction of form values from common submission shapes.
 *
 * Supports:
 * - `{ data: Array<{id,value}> }` (backend style)
 * - `{ data: Record<string, any> }` (already mapped)
 * - `{ values: Record<string, any> }` (client-side storage)
 */
export function extractSubmissionValues(submission: any): FormKitValues {
  const data = submission?.data ?? submission?.values ?? submission?.submissionData;
  if (!data) return {};
  if (Array.isArray(data)) {
    return data.reduce((acc: FormKitValues, item: any) => {
      if (item && item.id !== undefined) acc[String(item.id)] = item.value;
      return acc;
    }, {});
  }
  if (typeof data === 'object') return data as FormKitValues;
  return {};
}

/**
 * Best-effort extraction of fields from common schema shapes.
 *
 * Supports:
 * - `FormField[]`
 * - `{ fields: FormField[] }`
 * - `{ schema: FormField[] | { fields: FormField[] } }`
 */
export function extractSchemaFields(schemaLike: any): FormField[] {
  if (!schemaLike) return [];
  if (Array.isArray(schemaLike)) return schemaLike;
  if (Array.isArray(schemaLike.fields)) return schemaLike.fields;
  if (schemaLike.schema) return extractSchemaFields(schemaLike.schema);
  if (schemaLike.data?.schema) return extractSchemaFields(schemaLike.data.schema);
  return [];
}

