'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';

/**
 * Star rating field
 */
export function RatingField({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
}: BaseFieldProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const ratingValue = typeof value === 'number' ? value : 0;
  const maxRating = field.ratingMax || 5;

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage}
      className={className}>
      <div className='flex items-center gap-1 p-2'>
        {Array.from({ length: maxRating }, (_, i) => {
          const starValue = i + 1;
          const isFilled = hoverRating
            ? starValue <= hoverRating
            : starValue <= ratingValue;
          const isHovered = hoverRating >= starValue;

          return (
            <button
              key={i}
              type='button'
              disabled={disabled}
              onClick={() => {
                onChange(starValue);
                onBlur?.();
              }}
              onMouseEnter={() => !disabled && setHoverRating(starValue)}
              onMouseLeave={() => setHoverRating(0)}
              className={cn(
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-transform duration-150',
                isHovered && 'scale-110',
                disabled && 'cursor-not-allowed opacity-50',
              )}
              aria-label={`Rate ${starValue} out of ${maxRating}`}>
              <Star
                className={cn(
                  'w-8 h-8 transition-colors duration-150',
                  isFilled
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-muted-foreground/30',
                  isHovered && !isFilled && 'text-yellow-300',
                )}
              />
            </button>
          );
        })}

        {/* Rating display */}
        {ratingValue > 0 && (
          <span className='ml-3 text-sm font-medium text-muted-foreground'>
            {ratingValue} / {maxRating}
          </span>
        )}

        {/* Clear button */}
        {ratingValue > 0 && !disabled && (
          <button
            type='button'
            onClick={() => {
              onChange(0);
              onBlur?.();
            }}
            className='ml-2 text-xs text-muted-foreground hover:text-foreground underline'>
            Clear
          </button>
        )}
      </div>
    </FieldWrapper>
  );
}
