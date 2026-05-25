'use client';

import React from 'react';
import { FormField } from '../../types/form';
import { ContainerFieldProps } from './types';
import { cn, formatNumberByLocale } from '../../lib/utils';
import { useFormKit } from '../../context/FormKitContext';

export const gridColsMap: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

/**
 * Section container field for grouping related fields
 * Supports both step sections (numbered) and UI sections (layout-based)
 */
export const SectionField = React.memo(function SectionField({
  field,
  renderField,
  className,
}: ContainerFieldProps) {
  const { locale: currentLocale } = useFormKit();
  const isStepSection = field.type === 'step_section';
  const nestedFields = field.fields || [];

  // Grid layout configuration for UI sections
  const isGrid = field.type === 'ui_section' && field.layoutType === 'grid';
  const gridColumns = field.gridColumns || 2;
  const gap = field.gap || 32;
  return (
    <div
      className={cn(
        'rounded-md border bg-card overflow-visible transition-all duration-200',
        'hover:shadow-sm',
        className,
      )}>
      {/* Section header */}
      <div className='border-b bg-muted/30 px-4 py-4'>
        <div className='flex items-center gap-3'>
          {/* Step number badge */}
          {isStepSection && field.stepNumber && (
            <div className='flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-sm'>
              {formatNumberByLocale(field.stepNumber, currentLocale)}
            </div>
          )}

          <div className='flex-1 min-w-0'>
            <h3 className='font-semibold text-lg truncate'>{field.label}</h3>
            {field.stepDescription && (
              <p className='text-sm text-muted-foreground mt-0.5'>
                {field.stepDescription}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section content */}
      {nestedFields.length > 0 && (
        <div
          className={cn(
            'p-4 overflow-visible',
            !isGrid
              ? 'flex flex-col gap-8'
              : cn(
                  'grid grid-cols-1',
                  gridColsMap[gridColumns] ?? 'lg:grid-cols-2',
                ),
          )}
          style={isGrid ? { gap: `${gap}px` } : undefined}>
          {nestedFields.map((nestedField) => (
            <div key={nestedField.id}>
              {renderField ? renderField(nestedField) : null}
            </div>
          ))}
        </div>
      )}

      {nestedFields.length === 0 && (
        <div className='p-8 text-center text-muted-foreground'>
          <p className='text-sm'>No fields in this section</p>
        </div>
      )}
    </div>
  );
});
