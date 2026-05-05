import type { FormField } from '../types/form';
import { flattenFields } from './formUtils';

export type FormKitValues = Record<string, any>;

/**
 * Merge keys in `defaultValues` onto field ids. Keys may be field `id` or
 * `uniqueIdentifier` (stable human-readable key). Explicit ids win when a key
 * matches a field id; otherwise `uniqueIdentifier` is resolved to `id`.
 * Unknown keys are passed through unchanged.
 */
export function mapDefaultValuesToFieldIds(
  fields: FormField[],
  defaultValues: Record<string, any> | undefined,
): Record<string, any> {
  if (!defaultValues || Object.keys(defaultValues).length === 0) return {};

  const flat = flattenFields(fields);
  const idSet = new Set(flat.map((f) => f.id));
  const uniqueIdToFieldId = new Map<string, string>();
  for (const f of flat) {
    const uid = f.uniqueIdentifier?.trim();
    if (uid) uniqueIdToFieldId.set(uid, f.id);
  }

  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(defaultValues)) {
    if (idSet.has(key)) {
      out[key] = val;
    } else if (uniqueIdToFieldId.has(key)) {
      out[uniqueIdToFieldId.get(key)!] = val;
    } else {
      out[key] = val;
    }
  }
  return out;
}

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

