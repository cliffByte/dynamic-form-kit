'use client';

import React from 'react';
import { Input } from '../ui/input';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';

/**
 * Number input field with min/max validation
 */
export function NumberField({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
}: BaseFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(null);
    } else {
      onChange(Number(val));
    }
  };

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage}
      className={className}>
      <Input
        id={field.id}
        type='number'
        value={value ?? ''}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={field.placeholder}
        min={field.validation?.min}
        max={field.validation?.max}
        step='any'
        disabled={disabled}
        className={cn(
          'transition-all duration-200',
          // `Input` already styles focus state with `border-primary`; this
          // component should not override it with `focus:border-none`.
          showError &&
            'border-red-500 focus-visible:ring-red-500 focus:border-red-500',
        )}
      />
      {/* Show min/max hint if configured */}
      {(field.validation?.min !== undefined ||
        field.validation?.max !== undefined) && (
        <p className='text-xs text-muted-foreground mt-1'>
          {field.validation?.min !== undefined &&
            `Min: ${field.validation.min}`}
          {field.validation?.min !== undefined &&
            field.validation?.max !== undefined &&
            ' • '}
          {field.validation?.max !== undefined &&
            `Max: ${field.validation.max}`}
        </p>
      )}
    </FieldWrapper>
  );
}
