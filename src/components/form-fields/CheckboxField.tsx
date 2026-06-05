'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { sanitizeMultiChoiceFieldValue } from '../../lib/fieldValueUtils';
import { Checkbox } from '../ui/checkbox';
import {
  FieldWrapper,
  FieldLoading,
  FieldError,
  FieldEmpty,
  ParentFieldRequired,
} from './FieldWrapper';
import { DynamicFieldProps, DynamicOption } from './types';
import { cn } from '../../lib/utils';
import { hasRenderableNestedFormFields } from '../../lib/formStepStructure';

/**
 * Checkbox group field for multiple selections
 * Supports both static and dynamic options, including nested forms
 */
export function CheckboxField({
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
  formValues = {},
}: DynamicFieldProps) {
  const selectedValues: string[] = sanitizeMultiChoiceFieldValue(field, value);

  useEffect(() => {
    if (field.isDynamic) return;
    const raw = Array.isArray(value) ? value.map(String) : [];
    if (
      raw.length !== selectedValues.length ||
      raw.some((v, i) => v !== selectedValues[i])
    ) {
      onChange(selectedValues);
    }
  }, [field, value, selectedValues, onChange]);

  // Get options from field config or dynamic options
  const options: DynamicOption[] = field.isDynamic
    ? dynamicOptions
    : field.optionConfigs
        ?.filter((c) => c.value !== '')
        .map((c) => ({ label: c.label, value: c.value })) ||
      field.options?.map((o) => ({ label: o, value: o })) ||
      [];

  const shouldShowParentRequired = isDependent && !parentHasValue;

  const toggleOption = (optionValue: string, checked: boolean) => {
    const newValues = checked
      ? [...selectedValues, optionValue]
      : selectedValues.filter((v) => v !== optionValue);
    onChange(newValues);
    onBlur?.();
  };

  const visibleNestedForms =
    field.optionConfigs
      ?.filter(
        (c) =>
          selectedValues.includes(c.value) &&
          c.nestedForm?.fields?.length &&
          hasRenderableNestedFormFields(c.nestedForm.fields, formValues),
      )
      .map((c) => ({ optionLabel: c.label, nestedForm: c.nestedForm! })) || [];

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
        <>
          {field.isDynamic && isLoading && (
            <Loader2 className='w-3 h-3 animate-spin text-primary' />
          )}
          {selectedValues.length > 0 && (
            <span className='text-xs text-muted-foreground'>
              ({selectedValues.length} selected)
            </span>
          )}
        </>
      }>
      {loadError ? (
        <FieldError message={loadError} onRetry={onRetry} />
      ) : shouldShowParentRequired ? (
        <ParentFieldRequired />
      ) : isLoading ? (
        <FieldLoading />
      ) : options.length === 0 ? (
        <FieldEmpty />
      ) : (
        <div className='space-y-3'>
          <div className='grid gap-3'>
            {options.map((option) => {
              const isChecked = selectedValues.includes(option.value);
              return (
                <label
                  key={option.value}
                  htmlFor={`${field.id}-${option.value}`}
                  className={cn(
                    'flex items-center gap-3 p-2 border rounded-md cursor-pointer transition-all duration-200',
                    'hover:shadow-sm hover:border-muted-foreground/30',

                    disabled && 'opacity-50 cursor-not-allowed',
                  )}>
                  <Checkbox
                    id={`${field.id}-${option.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      toggleOption(option.value, !!checked)
                    }
                    disabled={disabled}
                    className={cn(
                      
                      isChecked &&
                        'border-primary data-[state=checked]:bg-primary',
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-medium flex-1',
                      isChecked && 'text-primary',
                    )}>
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>

          {visibleNestedForms.length > 0 && renderField && (
            <div className='space-y-4'>
              {visibleNestedForms.map(({ optionLabel, nestedForm }) => (
                <div
                  key={nestedForm.id}
                  className='ml-4 pl-4 border-l-2 border-primary/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300'>
                  <div className='text-sm font-medium text-muted-foreground'>
                    {nestedForm.name || optionLabel || 'Additional Information'}
                  </div>
                  {nestedForm.fields.map((nestedField) => (
                    <div key={nestedField.id}>{renderField(nestedField)}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </FieldWrapper>
  );
}
