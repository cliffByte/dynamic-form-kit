'use client';

import React from 'react';
import { format } from 'date-fns';
import { DisplayFieldProps } from './types';
import { DisplayFieldWrapper } from './DisplayFieldWrapper';
import { useFormKit } from '../../context/FormKitContext';
import { formatSubmissionDateValue } from '../../lib/nepaliCalendar';

export function DisplayDateField({
  field,
  value,
  className,
}: DisplayFieldProps) {
  const { locale } = useFormKit();
  const useNepaliCalendar =
    field.dateUseNepaliCalendar ?? (locale || 'en') === 'ne';

  const formatted = formatSubmissionDateValue(value, useNepaliCalendar, (date) =>
    format(date, 'PPP'),
  );

  const displayValue = formatted ? (
    <span className='text-foreground font-medium text-base'>{formatted}</span>
  ) : (
    <span className='text-muted-foreground/50 italic text-sm'>Not provided</span>
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
