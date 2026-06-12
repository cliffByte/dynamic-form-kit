import type { DynamicDataSource, FormField } from '../types/form';
import { getNestedValue } from '../hooks/useDynamicOptions';
import { buildDynamicDataSourceRequest } from './dynamicDataSourceRequest';
import { getLocalizedValue } from './utils';

export type DynamicOption = { value: string; label: string | Record<string, string> };

function extractLabelAtPath(item: unknown, path?: string): string | undefined {
  if (!path) return undefined;
  const value = getNestedValue(item, path);
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function mapItemToOptionLabel(
  item: unknown,
  ds: DynamicDataSource,
): string | Record<string, string> {
  const enLabel =
    extractLabelAtPath(item, ds.labelField) ??
    (ds.labelField ? undefined : String(item));

  const translations = ds.labelFieldTranslations;
  if (!translations || Object.keys(translations).length === 0) {
    return enLabel ?? String(item);
  }

  const localized: Record<string, string> = {};
  if (enLabel !== undefined) {
    localized.en = enLabel;
  }

  for (const [locale, path] of Object.entries(translations)) {
    const translated = extractLabelAtPath(item, path);
    if (translated !== undefined) {
      localized[locale] = translated;
    }
  }

  if (Object.keys(localized).length === 0) {
    return enLabel ?? String(item);
  }

  return localized;
}

export function getDynamicOptionLabel(
  option: DynamicOption,
  locale: string,
): string {
  return getLocalizedValue(option.label, locale, option.value);
}

export function isDynamicField(field: FormField): boolean {
  return Boolean(field.isDynamic && field.dataSource);
}

export function getDynamicParentFieldId(
  ds: DynamicDataSource,
): string | undefined {
  return ds.dependsOn && ds.dependsOn !== 'none' ? ds.dependsOn : undefined;
}

export function getDynamicFieldFetchKey(
  field: FormField,
  values: Record<string, unknown>,
): string {
  const ds = field.dataSource;
  if (!ds) return field.id;
  const parentId = getDynamicParentFieldId(ds);
  const parentValue = parentId ? values[parentId] : undefined;
  return parentId
    ? `${field.id}:${String(parentValue ?? '')}`
    : `${field.id}:__no_parent__`;
}

export function buildDynamicFieldsFetchSignature(
  fields: FormField[],
  values: Record<string, unknown>,
): string {
  return fields
    .filter(isDynamicField)
    .map((f) => getDynamicFieldFetchKey(f, values))
    .sort()
    .join('|');
}

/** Match FormPreviewModal: skip path traversal when path is empty. */
export function extractDataAtPath(data: unknown, path?: string): unknown {
  if (!path?.trim()) {
    return data;
  }
  return getNestedValue(data, path);
}

/** Map API JSON to select options (same rules as FormPreviewModal). */
export function mapResponseToDynamicOptions(
  data: unknown,
  ds: DynamicDataSource,
): DynamicOption[] {
  const extractedData = extractDataAtPath(data, ds.path);
  if (!Array.isArray(extractedData)) {
    throw new Error('Extracted data is not an array');
  }

  return extractedData.map((item: unknown) => ({
    value: ds.valueField
      ? String(getNestedValue(item, ds.valueField) ?? item)
      : String(item),
    label: mapItemToOptionLabel(item, ds),
  }));
}

export async function fetchDynamicOptionsForField(
  field: FormField,
  parentValue: unknown,
): Promise<DynamicOption[]> {
  const ds = field.dataSource;
  if (!ds?.url) return [];

  const parentId = getDynamicParentFieldId(ds);
  if (parentId && !parentValue) return [];

  const { url, init: requestOptions } = buildDynamicDataSourceRequest(
    ds,
    parentValue,
  );

  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return mapResponseToDynamicOptions(data, ds);
}
