'use client';

import React from 'react';
import { Input } from '../ui/input';
import { BaseFieldProps } from './types';
import { FieldWrapper } from './FieldWrapper';
import { cn } from '../../lib/utils';
import { transliterateRomanizedNepali } from '../../lib/nepaliTransliteration';

export function NepaliUnicodeField({
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
      <Input
        id={field.id}
        type='text'
        value={value || ''}
        onChange={(e) => onChange(transliterateRomanizedNepali(e.target.value))}
        onBlur={onBlur}
        placeholder={field.placeholder || 'Type in Romanized Nepali...'}
        disabled={disabled}
        className={cn(
          'transition-all duration-200',
          'focus-visible:ring-2 focus-visible:ring-primary focus:border-none',
          showError && 'border-red-500 focus-visible:ring-red-500',
        )}
      />
    </FieldWrapper>
  );
}
