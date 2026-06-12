'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { sanitizeChoiceFieldValue } from '../../lib/fieldValueUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { FieldWrapper, FieldError } from './FieldWrapper';
import { DynamicFieldProps, DynamicOption } from './types';
import { cn } from '../../lib/utils';
import { getDynamicOptionLabel } from '../../lib/dynamicFieldUtils';
import { hasRenderableNestedFormFields } from '../../lib/formStepStructure';
import { useFormKit } from '../../context/FormKitContext';

/**
 * Select dropdown field with support for static and dynamic options, including nested forms
 */
export function SelectField({
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
  renderField,
  formValues = {},
}: DynamicFieldProps) {
  const { locale } = useFormKit();

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

  const isWaitingForParent = isDependent && !parentHasValue;

  const placeholder =
    isWaitingForParent
      ? 'Select the parent field first'
      : isLoading
        ? 'Loading options...'
        : options.length === 0 && field.isDynamic
          ? 'No options available'
          : field.placeholder || 'Select an option...';

  // Find the selected option's nested form (if any)
  const selectedOptionConfig = field.optionConfigs?.find(
    (c) => c.value === sanitizedValue,
  );
  const nestedForm = selectedOptionConfig?.nestedForm;
  const showNestedForm =
    nestedForm?.fields?.length &&
    hasRenderableNestedFormFields(nestedForm.fields, formValues);

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
      ) : (
        <div className='space-y-3'>
          <Select
            value={sanitizedValue}
            onValueChange={(val) => {
              onChange(val);
              onBlur?.();
            }}
            disabled={
              disabled ||
              isLoading ||
              isWaitingForParent ||
              (options.length === 0 && field.isDynamic)
            }>
            <SelectTrigger
              id={field.id}
              className={cn(
                'w-full transition-all duration-200',
                'hover:border-muted-foreground/50',
                showError && 'border-red-500 focus:ring-red-500',
              )}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className='cursor-pointer'>
                  {getDynamicOptionLabel(option, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {showNestedForm && renderField && (
            <div className='ml-4 pl-4 border-l-2 border-primary/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300'>
              <div className='text-sm font-medium text-muted-foreground'>
                {nestedForm!.name || 'Additional Information'}
              </div>
              {nestedForm!.fields.map((nestedField) => (
                <div key={nestedField.id}>{renderField(nestedField)}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </FieldWrapper>
  );
}
