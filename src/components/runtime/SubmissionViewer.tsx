'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FormField } from '../../types/form';
import { shouldShowField } from '../../lib/formUtils';
import { applyFieldVisibility, collectVisibleFields } from '../../lib/formStepStructure';
import { getNestedValue } from '../../hooks/useDynamicOptions';
import { buildDynamicDataSourceRequest } from '../../lib/dynamicDataSourceRequest';
import { useLocalizedFields } from '../../hooks/useLocalizedField';
import { cn } from '../../lib/utils';
import { FormKitRoot } from '../FormKitRoot';
import { DisplayFieldRenderer } from '../display-fields/DisplayFieldRenderer';
import {
  extractSchemaFields,
  expandNestedOptionSubmission,
  extractSubmissionValues,
} from '../../lib/submissionUtils';

type Values = Record<string, any>;

function isDynamicField(field: FormField): boolean {
  return Boolean(field.isDynamic && field.dataSource);
}

async function fetchDynamicOptionsForField(
  field: FormField,
  parentValue: any,
): Promise<Array<{ value: string; label: string }>> {
  const ds = field.dataSource;
  if (!ds) return [];
  if (ds.dependsOn && !parentValue) return [];

  const { url, init: requestOptions } = buildDynamicDataSourceRequest(
    ds,
    parentValue,
  );

  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const extractedData = getNestedValue(data, ds.path);
  if (!Array.isArray(extractedData)) {
    throw new Error('Extracted data is not an array');
  }

  return extractedData.map((item: any) => ({
    value: String(getNestedValue(item, ds.valueField) ?? ''),
    label: String(getNestedValue(item, ds.labelField) ?? ''),
  }));
}

export interface SubmissionViewerProps {
  form: unknown;
  submission: unknown;
  className?: string;
  fieldsClassName?: string;
  compact?: boolean;
  /** When true, hides all fields marked `hideable` in the form schema. */
  hide?: boolean;
}

export function SubmissionViewer({
  form,
  submission,
  className,
  fieldsClassName,
  compact,
  hide,
}: SubmissionViewerProps): React.ReactElement {
  const rawFields = useMemo(() => extractSchemaFields(form), [form]);
  const localizedFields = useLocalizedFields(rawFields);
  const fields = useMemo(
    () => applyFieldVisibility(localizedFields, hide),
    [localizedFields, hide],
  );
  const values = useMemo(() => {
    const extracted = extractSubmissionValues(submission) as Values;
    return expandNestedOptionSubmission(fields, extracted);
  }, [submission, fields]);
  const valuesRef = useRef<Values>(values);

  const [dynamicOptions, setDynamicOptions] = React.useState<
    Record<string, Array<{ value: string; label: string }>>
  >({});
  const [loadingFields, setLoadingFields] = React.useState<Record<string, boolean>>({});
  const [errorFields, setErrorFields] = React.useState<Record<string, string>>({});
  const lastParentValuesRef = useRef<Record<string, any>>({});

  useEffect(() => {
    valuesRef.current = values;
    lastParentValuesRef.current = {};
  }, [values]);

  const visibleFields = useMemo(() => collectVisibleFields(fields, values), [fields, values]);

  useEffect(() => {
    const dynamicVisible = visibleFields.filter(isDynamicField);
    if (dynamicVisible.length === 0) return;

    let cancelled = false;
    const run = async () => {
      await Promise.all(
        dynamicVisible.map(async (field) => {
          const ds = field.dataSource;
          if (!ds) return;

          const parentId = ds.dependsOn;
          const parentValue = parentId ? valuesRef.current[parentId] : undefined;
          const parentKey = parentId
            ? `${field.id}:${String(parentValue ?? '')}`
            : `${field.id}:__no_parent__`;

          if (parentId && !parentValue) {
            setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
            return;
          }

          if (lastParentValuesRef.current[field.id] === parentKey) return;
          lastParentValuesRef.current[field.id] = parentKey;

          setLoadingFields((prev) => ({ ...prev, [field.id]: true }));
          setErrorFields((prev) => ({ ...prev, [field.id]: '' }));
          try {
            const opts = await fetchDynamicOptionsForField(field, parentValue);
            if (!cancelled) {
              setDynamicOptions((prev) => ({ ...prev, [field.id]: opts }));
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load options';
            if (!cancelled) {
              setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
              setErrorFields((prev) => ({ ...prev, [field.id]: msg }));
            }
          } finally {
            if (!cancelled) {
              setLoadingFields((prev) => ({ ...prev, [field.id]: false }));
            }
          }
        }),
      );
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [visibleFields]);

  const retryDynamicField = useCallback(async (field: FormField) => {
    const ds = field.dataSource;
    if (!ds) return;
    const parentValue = ds.dependsOn ? valuesRef.current[ds.dependsOn] : undefined;
    setLoadingFields((prev) => ({ ...prev, [field.id]: true }));
    setErrorFields((prev) => ({ ...prev, [field.id]: '' }));
    try {
      const opts = await fetchDynamicOptionsForField(field, parentValue);
      setDynamicOptions((prev) => ({ ...prev, [field.id]: opts }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load options';
      setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
      setErrorFields((prev) => ({ ...prev, [field.id]: msg }));
    } finally {
      setLoadingFields((prev) => ({ ...prev, [field.id]: false }));
    }
  }, []);

  const renderField = useCallback(
    (field: FormField): React.ReactNode => {
      if (field.isHidden) return null;
      if (!shouldShowField(field, values)) return null;

      return (
        <DisplayFieldRenderer
          key={field.id}
          field={field}
          value={values[field.id]}
          formValues={values}
          renderField={renderField}
          compact={compact}
          dynamicOptions={dynamicOptions[field.id] ?? []}
          isLoading={Boolean(loadingFields[field.id])}
          loadError={errorFields[field.id] || undefined}
          onRetry={() => retryDynamicField(field)}
        />
      );
    },
    [compact, dynamicOptions, loadingFields, errorFields, retryDynamicField, values],
  );

  return (
    <FormKitRoot>
      <div className={cn('space-y-4', className)}>
        <div className={cn('grid gap-4', fieldsClassName)}>
          {fields.map((field) => (
            <div key={field.id}>{renderField(field)}</div>
          ))}
        </div>
      </div>
    </FormKitRoot>
  );
}
