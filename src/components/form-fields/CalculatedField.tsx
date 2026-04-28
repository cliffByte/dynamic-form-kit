'use client';

import React, { useEffect, useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import { Input } from '../ui/input';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';

/**
 * Calculated field that derives value from formula
 */
export function CalculatedField({
  field,
  value,
  onChange,
  showError,
  errorMessage,
  className,
  formValues,
}: BaseFieldProps & { formValues?: Record<string, any> }) {
  const [calculatedValue, setCalculatedValue] = useState<string | number>('');
  const [error, setError] = useState<string | null>(null);

  const formula = field.formula || '';
  const displayFormat = 'number';
  const precision = 2;

  // Calculate value based on formula
  useEffect(() => {
    if (!formula || !formValues) {
      setCalculatedValue('');
      return;
    }

    try {
      // Replace field references with actual values
      let expression = formula;

      // Match patterns like {fieldId} or ${fieldId}
      const fieldPattern = /\{([^}]+)\}|\$\{([^}]+)\}/g;
      let match;

      while ((match = fieldPattern.exec(formula)) !== null) {
        const fieldId = match[1] || match[2];
        const fieldValue = formValues[fieldId];

        if (
          fieldValue === undefined ||
          fieldValue === null ||
          fieldValue === ''
        ) {
          setCalculatedValue('');
          setError(null);
          return;
        }

        const numValue = Number(fieldValue);
        if (isNaN(numValue)) {
          setError(`Field "${fieldId}" is not a number`);
          setCalculatedValue('');
          return;
        }

        expression = expression.replace(match[0], String(numValue));
      }

      // Safely evaluate the expression
      // Only allow basic math operations
      if (!/^[\d\s+\-*/().]+$/.test(expression)) {
        setError('Invalid formula expression');
        setCalculatedValue('');
        return;
      }

      // Evaluate
      const result = Function(`"use strict"; return (${expression})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        setError('Calculation resulted in invalid value');
        setCalculatedValue('');
        return;
      }

      const formattedResult = formatValue(result, displayFormat, precision);
      setCalculatedValue(formattedResult);
      setError(null);

      // Update parent value
      if (onChange && result !== value) {
        onChange(result);
      }
    } catch (err) {
      console.error('Calculation error:', err);
      setError('Error calculating value');
      setCalculatedValue('');
    }
  }, [formula, formValues, displayFormat, precision]);

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage || error || undefined}
      className={className}
      labelExtra={
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <Calculator className='w-3 h-3' />
        </div>
      }>
      <div className='relative'>
        <Input
          id={field.id}
          type='text'
          value={calculatedValue}
          readOnly
          disabled
          className='bg-muted/30 font-mono text-right'
        />

        {/* Formula info */}
        {/* {formula && (
          <div className='mt-2 flex items-start gap-2 text-xs text-muted-foreground'>
            <Info className='w-3 h-3 mt-0.5 flex-shrink-0' />
            <span>
              Formula:{' '}
              <code className='bg-muted px-1 py-0.5 rounded'>{formula}</code>
            </span>
          </div>
        )} */}
      </div>
    </FieldWrapper>
  );
}

// Format value based on display format
function formatValue(value: number, format: string, precision: number): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(value);

    case 'percentage':
      return `${(value * 100).toFixed(precision)}%`;

    case 'integer':
      return Math.round(value).toString();

    case 'number':
    default:
      return value.toFixed(precision);
  }
}
