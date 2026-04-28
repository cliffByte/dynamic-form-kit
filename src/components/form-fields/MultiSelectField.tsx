'use client';

import React from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
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
 * Multi-select field with card-based selection UI
 * Supports both static and dynamic options
 */
export function MultiSelectField({
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
  const selectedValues: string[] = Array.isArray(value) ? value : [];

  // Get options from field config or dynamic options
  const options: DynamicOption[] = field.isDynamic
    ? dynamicOptions
    : field.optionConfigs?.map((c) => ({ label: c.label, value: c.value })) ||
      field.options?.map((o) => ({ label: o, value: o })) ||
      [];

  const shouldShowParentRequired = isDependent && !parentHasValue;

  const toggleOption = (optionValue: string) => {
    const isSelected = selectedValues.includes(optionValue);
    const newValues = isSelected
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue];
    onChange(newValues);
  };

  const removeOption = (optionValue: string) => {
    onChange(selectedValues.filter((v) => v !== optionValue));
  };

  // Get nested forms for all selected options
  const selectedNestedForms =
    field.optionConfigs
      ?.filter((c) => selectedValues.includes(c.value) && c.nestedForm)
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
            <Badge variant='secondary' className='text-xs'>
              {selectedValues.length} selected
            </Badge>
          )}
        </>
      }>
      {/* Selected items display */}
      {selectedValues.length > 0 && (
        <div className='flex flex-wrap gap-2 p-3 bg-muted/50 border rounded-lg mb-2'>
          {selectedValues.map((selectedValue) => {
            const option = options.find((o) => o.value === selectedValue);
            return (
              <Badge
                key={selectedValue}
                variant='default'
                className='flex items-center gap-1 pl-2 pr-1 py-1'>
                <span className='text-sm'>
                  {option?.label || selectedValue}
                </span>
                <button
                  type='button'
                  onClick={() => removeOption(selectedValue)}
                  disabled={disabled}
                  className='ml-1 rounded-full p-0.5 hover:bg-white/20 transition-colors'
                  aria-label={`Remove ${option?.label || selectedValue}`}>
                  <X className='w-3 h-3' />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Options display */}
      {loadError ? (
        <FieldError message={loadError} onRetry={onRetry} />
      ) : shouldShowParentRequired ? (
        <ParentFieldRequired parentFieldName={parentFieldName} />
      ) : isLoading ? (
        <FieldLoading />
      ) : options.length === 0 ? (
        <FieldEmpty />
      ) : (
        <Card className='p-3 border hover:border-muted-foreground/30 transition-colors'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto'>
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type='button'
                  onClick={() => toggleOption(option.value)}
                  disabled={disabled}
                  className={cn(
                    'flex items-center justify-between p-2 border rounded-md cursor-pointer transition-all duration-200',
                    'hover:shadow-sm',
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-background border-muted hover:bg-muted/50 hover:border-muted-foreground/30',
                    disabled && 'opacity-50 cursor-not-allowed',
                  )}>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isSelected && 'text-primary',
                    )}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <div className='bg-primary text-primary-foreground rounded-full p-0.5'>
                      <Check className='w-3 h-3' />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Render nested form fields for all selected options that have nested forms */}
      {selectedNestedForms.length > 0 && renderField && (
        <div className='space-y-4 mt-4'>
          {selectedNestedForms.map(({ optionLabel, nestedForm }) => (
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
    </FieldWrapper>
  );
}
