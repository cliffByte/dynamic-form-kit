'use client';

import React from 'react';
import { Textarea } from '../ui/textarea';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';

/**
 * Textarea field for multi-line text input
 */
export function TextareaField({
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
      <Textarea
        id={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={field.placeholder}
        rows={field.textareaRows || 4}
        cols={field.textareaCols}
        disabled={disabled}
        className={cn(
          'resize-y transition-all h-fit duration-200',
          // `Textarea` already styles focus state with `border-primary`; don't
          // hide it with `focus-visible:border-none`.
          showError &&
            'border-red-500 focus-visible:ring-red-500 focus:border-red-500',
        )}
      />
    </FieldWrapper>
  );
}
