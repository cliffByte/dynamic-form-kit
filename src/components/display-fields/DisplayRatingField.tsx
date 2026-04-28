'use client';

import React from 'react';
import { DisplayFieldProps } from './types';
import { DisplayFieldWrapper } from './DisplayFieldWrapper';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

export function DisplayRatingField({
  field,
  value,
  className,
}: DisplayFieldProps) {
  const ratingValue = typeof value === 'number' ? value : 0;
  const maxRating = field.ratingMax || 5;

  return (
    <DisplayFieldWrapper
      label={field.label}
      fieldId={field.id}
      instruction={field.instruction}
      className={className}>
      <div className='flex items-center gap-1 py-1'>
        {Array.from({ length: maxRating }, (_, i) => {
          const starValue = i + 1;
          const isFilled = starValue <= ratingValue;

          return (
            <Star
              key={i}
              className={cn(
                'w-5 h-5 transition-colors duration-150',
                isFilled
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-muted-foreground/20',
              )}
            />
          );
        })}
        {ratingValue > 0 && (
          <span className='ml-2 text-sm font-semibold text-muted-foreground'>
            {ratingValue} / {maxRating}
          </span>
        )}
      </div>
    </DisplayFieldWrapper>
  );
}
