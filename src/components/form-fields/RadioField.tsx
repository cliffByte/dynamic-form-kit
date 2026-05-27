'use client';

import React, { useEffect } from 'react';
import { sanitizeChoiceFieldValue } from '../../lib/fieldValueUtils';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import {
  FieldWrapper,
  FieldLoading,
  FieldError,
  FieldEmpty,
  ParentFieldRequired,
} from './FieldWrapper';
import { DynamicFieldProps, DynamicOption } from './types';
import { cn } from '../../lib/utils';

/**
 * Radio button group field
 * Supports both static and dynamic options, including nested forms
 */
export function RadioField({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
  dynamicOptions = [],
  isLoading,
  loadError,
  onRetry,
  isDependent,
  parentHasValue,
  parentFieldName,
  renderField,
}: DynamicFieldProps) {
  // Get options from field config or dynamic options
  const options: DynamicOption[] = field.isDynamic
    ? dynamicOptions
    : field.optionConfigs
        ?.filter((c) => c.value !== '')
        .map((c) => ({ label: c.label, value: c.value })) ||
      field.options?.map((o) => ({ label: o, value: o })) ||
      [];

  const sanitizedValue = sanitizeChoiceFieldValue(field, value);

  useEffect(() => {
    if (field.isDynamic) return;
    if (value && sanitizedValue === undefined) {
      onChange('');
    }
  }, [field, value, sanitizedValue, onChange]);

  const shouldShowParentRequired = isDependent && !parentHasValue;

  // Find the selected option's nested form (if any)
  const selectedOptionConfig = field.optionConfigs?.find(
    (c) => c.value === sanitizedValue,
  );
  const nestedForm = selectedOptionConfig?.nestedForm;

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage}
      className={className}
      labelExtra={
        field.isDynamic &&
        isLoading && <Loader2 className='w-3 h-3 animate-spin text-primary' />
      }>
      {loadError ? (
        <FieldError message={loadError} onRetry={onRetry} />
      ) : shouldShowParentRequired ? (
        <ParentFieldRequired parentFieldName={parentFieldName} />
      ) : isLoading ? (
        <FieldLoading />
      ) : options.length === 0 ? (
        <FieldEmpty />
      ) : (
        <div className='space-y-3'>
          <RadioGroup
            value={sanitizedValue}
            onValueChange={(val) => {
              onChange(val);
              onBlur?.();
            }}
            disabled={disabled}
            className='grid gap-3'>
            {options.map((option) => {
              const isSelected = sanitizedValue === option.value;
              return (
                <label
                  key={option.value}
                  htmlFor={`${field.id}-${option.value}`}
                  className={cn(
                    'flex items-center gap-3 p-2 border rounded-md cursor-pointer transition-all duration-200',
                    'hover:shadow-sm hover:border-muted-foreground/30',
                    disabled && 'opacity-50 cursor-not-allowed',
                  )}>
                  <RadioGroupItem
                    value={option.value}
                    id={`${field.id}-${option.value}`}
                    className={cn(
                      'border-2',
                      isSelected && 'border-primary text-primary',
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-medium flex-1',
                      isSelected && 'text-primary',
                    )}>
                    {option.label}
                  </span>
                </label>
              );
            })}
          </RadioGroup>

          {/* Render nested form fields if the selected option has a nested form */}
          {nestedForm &&
            nestedForm.fields &&
            nestedForm.fields.length > 0 &&
            renderField && (
              <div className='ml-4 pl-4 border-l-2 border-primary/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300'>
                <div className='text-sm font-medium text-muted-foreground'>
                  {nestedForm.name || 'Additional Information'}
                </div>
                {nestedForm.fields.map((nestedField) => (
                  <div key={nestedField.id}>{renderField(nestedField)}</div>
                ))}
              </div>
            )}
        </div>
      )}
    </FieldWrapper>
  );
}
