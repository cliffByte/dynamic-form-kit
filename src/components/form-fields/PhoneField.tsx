'use client';

import React from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';

/**
 * Phone number input field with international format support
 * Styled to match shadcn/ui design system
 */
export function PhoneField({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
}: BaseFieldProps) {
  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage}
      className={className}>
      <PhoneInput
        international
        defaultCountry={(field.defaultCountry as any) || 'NP'}
        placeholder={field.placeholder || 'Enter phone number'}
        value={value || ''}
        onChange={(phoneValue) => onChange(phoneValue || '')}
        onBlur={onBlur}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:border-none',
          'md:text-sm',
          showError && 'border-destructive focus-within:ring-destructive',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      />
    </FieldWrapper>
  );
}
