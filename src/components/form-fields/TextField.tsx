'use client';

import React from 'react';
import { Input } from '../ui/input';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';

/**
 * Text input field component
 * Supports text and email types with validation
 */
export function TextField({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
}: BaseFieldProps) {
  const inputType = field.type === 'email' ? 'email' : 'text';

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
        type={inputType}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={field.placeholder}
        disabled={disabled}
        className={cn(
          'transition-all duration-200',
          // `Input` already styles focus state with `border-primary`; this component
          // used to override it with `focus-visible:border-none`, which hides the border.
          showError &&
            'border-red-500 focus-visible:ring-red-500 focus:border-red-500',
        )}
      />
    </FieldWrapper>
  );
}

/**
 * Email input field component
 * Same as TextField but explicitly for email type
 */
export function EmailField(props: BaseFieldProps) {
  return <TextField {...props} />;
}
