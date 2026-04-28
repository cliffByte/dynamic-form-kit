'use client';

import React from 'react';
import { Slider } from '../ui/slider';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';

/**
 * Range slider field
 * Supports both single value and range (two handles) modes
 */
export function RangeField({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
}: BaseFieldProps) {
  const rangeMin = field.rangeMin ?? 0;
  const rangeMax = field.rangeMax ?? 100;
  const rangeStep = field.rangeStep ?? 1;
  const rangeMode = field.rangeMode || 'single';

  // Handle both single value and range array
  let rangeValue: number[];
  if (rangeMode === 'range') {
    rangeValue = Array.isArray(value) && value.length === 2 
      ? value 
      : [rangeMin, rangeMax];
  } else {
    rangeValue = [typeof value === 'number' ? value : rangeMin];
  }

  // Calculate percentage for visual feedback
  const percentage = rangeMode === 'single'
    ? ((rangeValue[0] - rangeMin) / (rangeMax - rangeMin)) * 100
    : ((rangeValue[1] - rangeValue[0]) / (rangeMax - rangeMin)) * 100;

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage}
      className={className}>
      <div className='space-y-2 border p-4 rounded-md'>
        {/* Current value display */}
        <div className='flex '>
          <div className='bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow-sm'>
            {rangeMode === 'range' ? (
              <span className='text-lg font-semibold'>
                {rangeValue[0]} - {rangeValue[1]}
              </span>
            ) : (
              <span className='text-lg font-semibold'>{rangeValue[0]}</span>
            )}
          </div>
        </div>

        {/* Slider */}
        <div className='px-1'>
          <Slider
            id={field.id}
            value={rangeValue}
            onValueChange={(val) => onChange(rangeMode === 'range' ? val : val[0])}
            onValueCommit={() => onBlur?.()}
            min={rangeMin}
            max={rangeMax}
            step={rangeStep}
            disabled={disabled}
            className={cn(
              'w-full',
              showError && '[&_[role=slider]]:border-red-500',
            )}
          />
        </div>

        {/* Labels */}
        <div className='flex justify-between items-center text-sm'>
          <div className='text-muted-foreground'>
            <span className='font-medium'>
              {field.rangeMinLabel || rangeMin}
            </span>
          </div>
          {/* <div className='text-xs text-muted-foreground/70'>
            {percentage.toFixed(0)}%
          </div> */}
          <div className='text-muted-foreground'>
            <span className='font-medium'>
              {field.rangeMaxLabel || rangeMax}
            </span>
          </div>
        </div>
      </div>
    </FieldWrapper>
  );
}
