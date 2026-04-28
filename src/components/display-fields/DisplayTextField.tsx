'use client';

import React from 'react';
import { DisplayFieldProps } from './types';
import { DisplayFieldWrapper } from './DisplayFieldWrapper';
import { getLocalizedValue } from '../../lib/utils';

export function DisplayTextField({
  field,
  value,
  className,
}: DisplayFieldProps) {
  const currentLocale = 'en';

  // Handle objects (localized values)
  let displayVal = value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    displayVal = getLocalizedValue(value, currentLocale);
  }

  const displayValue =
    displayVal === undefined || displayVal === null || displayVal === '' ? (
      <span className='text-muted-foreground/50 italic text-sm'>
        Not provided
      </span>
    ) : (
      <span className='text-foreground font-medium text-base'>
        {String(displayVal)}
      </span>
    );

  return (
    <DisplayFieldWrapper
      label={field.label}
      fieldId={field.id}
      instruction={field.instruction}
      className={className}>
      {displayValue}
    </DisplayFieldWrapper>
  );
}
