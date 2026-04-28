'use client';

import React from 'react';
import { DisplayFieldProps } from './types';
import { DisplayFieldWrapper } from './DisplayFieldWrapper';
import { Badge } from '../ui/badge';

export function DisplayRangeField({
  field,
  value,
  className,
}: DisplayFieldProps) {
  const rangeValue = typeof value === 'number' ? value : (field.rangeMin ?? 0);
  const min = field.rangeMin ?? 0;
  const max = field.rangeMax ?? 100;
  const percentage = ((rangeValue - min) / (max - min)) * 100;

  return (
    <DisplayFieldWrapper
      label={field.label}
      fieldId={field.id}
      instruction={field.instruction}
      className={className}>
      <div className='w-full space-y-2 pt-1'>
        <div className='flex items-center gap-3'>
          <Badge
            variant='outline'
            className='h-8 px-3 font-bold text-lg border-primary/20 text-primary'>
            {rangeValue}
          </Badge>
          <div className='flex-1 h-2 bg-muted rounded-full overflow-hidden'>
            <div
              className='h-full bg-primary/60'
              style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
            />
          </div>
        </div>
        <div className='flex justify-between text-[10px] text-muted-foreground uppercase font-medium'>
          <span>{field.rangeMinLabel || min}</span>
          <span>{field.rangeMaxLabel || max}</span>
        </div>
      </div>
    </DisplayFieldWrapper>
  );
}
