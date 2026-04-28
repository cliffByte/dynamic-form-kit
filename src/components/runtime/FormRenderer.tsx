'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormField } from '../../types/form';
import { createEnhancedSubmission, shouldShowField } from '../../lib/formUtils';
import { cleanSubmissionData } from '../../lib/formUtils';
import { validateFormWithZod } from '../../lib/validationUtils';
import { getNestedValue } from '../../hooks/useDynamicOptions';
import { useFormKit } from '../../context/FormKitContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { FormFieldRenderer } from '../form-fields/FormFieldRenderer';
import {
  extractSchemaFields,
  extractSubmissionValues,
} from '../../lib/submissionUtils';

type Values = Record<string, any>;

function isDynamicField(field: FormField): boolean {
  return Boolean(field.isDynamic && field.dataSource);
}

function collectVisibleFields(fields: FormField[], values: Values): FormField[] {
  const out: FormField[] = [];

  const walk = (list: FormField[]) => {
    for (const field of list) {
      if (field.isHidden) continue;
      if (!shouldShowField(field, values)) continue;

      out.push(field);

      if (Array.isArray(field.fields) && field.fields.length > 0) {
        walk(field.fields);
      }

      if (field.optionConfigs && field.optionConfigs.length > 0) {
        const val = values[field.id];
        for (const opt of field.optionConfigs) {
          const isSelected = Array.isArray(val)
            ? val.includes(opt.value)
            : val === opt.value;
          if (isSelected && opt.nestedForm?.fields?.length) {
            walk(opt.nestedForm.fields);
          }
        }
      }
    }
  };

  walk(fields);
  return out;
}

async function fetchDynamicOptionsForField(
  field: FormField,
  parentValue: any,
): Promise<Array<{ value: string; label: string }>> {
  const ds = field.dataSource;
  if (!ds) return [];

  // If depends on parent and no parent value, don't fetch
  if (ds.dependsOn && !parentValue) return [];

  let url = ds.url;
  if (ds.parentValuePath && parentValue) {
    url = url.replace(ds.parentValuePath, encodeURIComponent(String(parentValue)));
  }

  const requestOptions: RequestInit = {
    method: ds.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(ds.headers ?? {}),
    },
  };

  if (ds.dependsOn && ds.parentValueParam && parentValue) {
    const urlObj = new URL(url);
    urlObj.searchParams.append(ds.parentValueParam, String(parentValue));
    url = urlObj.toString();
  }

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

export interface FormRendererProps {
  /** Fetch schema by id (preferred). */
  formId?: string;
  /** Escape hatch for direct schema rendering. */
  fields?: FormField[];

  mode?: 'create' | 'edit';
  /** Required when mode="edit". */
  submissionId?: string;

  className?: string;
  fieldsClassName?: string;

  submitLabel?: string;
  disabled?: boolean;

  onSubmitSuccess?: (result: any) => void;
  onSubmitError?: (error: Error) => void;
}

export function FormRenderer({
  formId,
  fields: fieldsProp,
  mode = 'create',
  submissionId,
  className,
  fieldsClassName,
  submitLabel = mode === 'edit' ? 'Save' : 'Submit',
  disabled,
  onSubmitSuccess,
  onSubmitError,
}: FormRendererProps) {
  const { locale, getForm, getSubmission, createSubmission, updateSubmission } =
    useFormKit();

  const [loading, setLoading] = useState<boolean>(Boolean(formId) || Boolean(submissionId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [fields, setFields] = useState<FormField[]>(fieldsProp ?? []);
  const [values, setValues] = useState<Values>({});
  const valuesRef = useRef<Values>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, Array<{ value: string; label: string }>>
  >({});
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({});
  const [errorFields, setErrorFields] = useState<Record<string, string>>({});

  // Keep ref in sync with state to avoid stale closures in callbacks
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  // Load schema + optionally submission values
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(Boolean(formId) || Boolean(submissionId));
        setError(null);

        let loadedFields: FormField[] = fieldsProp ?? [];
        let nextValues: Values | null = null;

        if (formId) {
          const form = await getForm(formId);
          loadedFields = extractSchemaFields(form?.schema ?? form);
        }

        if (mode === 'edit') {
          if (!submissionId) {
            throw new Error('FormRenderer: submissionId is required for edit mode');
          }
          const submission = await getSubmission(submissionId);
          const submissionFields = extractSchemaFields(
            submission?.form?.schema ?? submission?.form,
          );
          if (submissionFields.length > 0) {
            loadedFields = submissionFields;
          }
          nextValues = extractSubmissionValues(submission) as Values;
        }

        if (!cancelled) {
          setFields(loadedFields);
          if (nextValues) {
            setValues(nextValues);
          } else {
            setValues(createEnhancedSubmission(loadedFields).submissionData as Values);
          }
          setTouched({});
          setValidationErrors({});
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load form';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [formId, submissionId, mode, getForm, getSubmission, fieldsProp]);

  const visibleFields = useMemo(() => collectVisibleFields(fields, values), [fields, values]);

  // Dynamic options: fetch for visible dynamic fields.
  // Dependency-aware: refetch when parent value changes.
  const lastParentValuesRef = useRef<Record<string, any>>({});
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
          const parentKey = parentId ? `${field.id}:${String(parentValue ?? '')}` : `${field.id}:__no_parent__`;

          // Skip if parent-dependent and parent is empty
          if (parentId && !parentValue) {
            setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
            return;
          }

          // Avoid refetching for same parent value
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
      if (!shouldShowField(field, valuesRef.current)) return null;

      const ds = field.dataSource;
      const dependsOn = ds?.dependsOn;
      const parentValue = dependsOn ? valuesRef.current[dependsOn] : undefined;
      const isDependent = Boolean(dependsOn);
      const parentHasValue = isDependent
        ? parentValue !== '' && parentValue !== null && parentValue !== undefined
        : true;
      const parentFieldName = dependsOn
        ? fields.find((f) => f.id === dependsOn)?.label ?? dependsOn
        : undefined;

      return (
        <FormFieldRenderer
          key={field.id}
          field={field}
          value={valuesRef.current[field.id]}
          onChange={(nextValue) => {
            setValues((prev) => ({ ...prev, [field.id]: nextValue }));
            setTouched((prev) => ({ ...prev, [field.id]: true }));
          }}
          onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
          showError={Boolean(touched[field.id]) && Boolean(validationErrors[field.id])}
          errorMessage={validationErrors[field.id]}
          disabled={disabled || saving}
          dynamicOptions={dynamicOptions[field.id] ?? []}
          isLoading={Boolean(loadingFields[field.id])}
          loadError={errorFields[field.id] || undefined}
          onRetry={() => retryDynamicField(field)}
          isDependent={isDependent}
          parentHasValue={parentHasValue}
          parentFieldName={parentFieldName}
          renderField={renderField}
          formValues={valuesRef.current}
        />
      );
    },
    [
      disabled,
      saving,
      touched,
      validationErrors,
      dynamicOptions,
      loadingFields,
      errorFields,
      retryDynamicField,
      fields,
    ],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (saving) return;
      setSaving(true);
      setError(null);

      try {
        const cleaned = cleanSubmissionData(valuesRef.current, fields);
        const validation = validateFormWithZod(fields, cleaned, locale);
        setValidationErrors(validation.errors || {});

        if (!validation.isValid) {
          // mark everything as touched so errors show
          const nextTouched: Record<string, boolean> = {};
          collectVisibleFields(fields, valuesRef.current).forEach((f) => {
            nextTouched[f.id] = true;
          });
          setTouched(nextTouched);
          throw new Error('Validation failed');
        }

        const result =
          mode === 'edit'
            ? await updateSubmission(String(submissionId), { data: cleaned })
            : await createSubmission({ formId: String(formId), data: cleaned });

        onSubmitSuccess?.(result);
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Submit failed');
        if (err.message !== 'Validation failed') {
          setError(err.message);
        }
        onSubmitError?.(err);
      } finally {
        setSaving(false);
      }
    },
    [
      saving,
      fields,
      locale,
      mode,
      submissionId,
      formId,
      createSubmission,
      updateSubmission,
      onSubmitSuccess,
      onSubmitError,
    ],
  );

  if (loading) {
    return (
      <div className={cn('p-6 text-sm text-muted-foreground', className)}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-6 text-sm text-destructive', className)}>
        {error}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      <div className={cn('grid gap-4', fieldsClassName)}>
        {fields.map((field) => (
          <div key={field.id}>{renderField(field)}</div>
        ))}
      </div>

      <div className='flex items-center gap-3'>
        <Button type='submit' disabled={disabled || saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
        {error && <span className='text-sm text-destructive'>{error}</span>}
      </div>
    </form>
  );
}

