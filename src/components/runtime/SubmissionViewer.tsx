'use client';

import React, { useCallback, useMemo } from 'react';
import type { FormField } from '../../types/form';
import { shouldShowField } from '../../lib/formUtils';
import { applyFieldVisibility, collectVisibleFields } from '../../lib/formStepStructure';
import { useDynamicFormOptions } from '../../hooks/useDynamicFormOptions';
import { getDynamicParentFieldId } from '../../lib/dynamicFieldUtils';
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

  const visibleFields = useMemo(() => collectVisibleFields(fields, values), [fields, values]);

  const {
    dynamicOptions,
    loadingFields,
    errorFields,
    retryDynamicField,
  } = useDynamicFormOptions(visibleFields, values);

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
