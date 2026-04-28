'use client';

import React from 'react';
import { FormField } from '../../types/form';
import { DisplayContainerProps } from './types';
import { DisplayTextField } from './DisplayTextField';
import { DisplaySelectField } from './DisplaySelectField';
import { DisplayMapField } from './DisplayMapField';
import { DisplayMediaField } from './DisplayMediaField';
import { DisplayMatrixField } from './DisplayMatrixField';
import { DisplayTableField } from './DisplayTableField';
import { DisplayRatingField } from './DisplayRatingField';
import { DisplayRangeField } from './DisplayRangeField';
import { DisplayArrayField } from './DisplayArrayField';
import { DisplayRichTextInputField } from './DisplayRichTextInputField';
import { cn } from '../../lib/utils';

export interface DisplayFieldRendererProps extends DisplayContainerProps {}

export function DisplayFieldRenderer({
  field,
  value,
  className,
  dynamicOptions,
  renderField,
  formValues,
  compact,
  isLoading,
  loadError,
  onRetry,
}: DisplayFieldRendererProps) {
  // Common props
  const commonProps = {
    field,
    value,
    className,
    dynamicOptions,
    compact,
    isLoading,
    loadError,
    onRetry,
  };

  // Handle hidden fields - usually they shouldn't be here but safety first
  if (field.isHidden) return null;

  // Dispatch based on type
  switch (field.type) {
    case 'text':
    case 'nepali_unicode':
    case 'email':
    case 'number':
    case 'phone':
    case 'textarea':
    case 'calculated':
      return <DisplayTextField {...commonProps} />;

    case 'rich_text_input':
      return <DisplayRichTextInputField {...commonProps} />;

    case 'select':
    case 'multi_select':
    case 'radio':
    case 'checkbox':
      return (
        <DisplaySelectField
          {...commonProps}
          renderField={renderField}
          formValues={formValues}
        />
      );

    case 'map':
      return <DisplayMapField {...commonProps} />;

    case 'media':
      return <DisplayMediaField {...commonProps} />;

    case 'matrix':
      return <DisplayMatrixField {...commonProps} />;

    case 'table':
      return <DisplayTableField {...commonProps} />;

    case 'rating':
      return <DisplayRatingField {...commonProps} />;

    case 'range':
      return <DisplayRangeField {...commonProps} />;

    case 'array':
      return (
        <DisplayArrayField
          {...commonProps}
          renderField={renderField}
          formValues={formValues}
        />
      );

    case 'ui_section':
    case 'step_section':
      return (
        <div className={cn('space-y-4 py-4', className)}>
          <div className='border-b pb-2'>
            <h3 className='text-lg font-bold tracking-tight'>{field.label}</h3>
            {field.stepDescription && (
              <p className='text-sm text-muted-foreground'>
                {field.stepDescription}
              </p>
            )}
          </div>
          <div
            className='grid gap-x-6 gap-y-2'
            style={
              field.layoutType === 'grid'
                ? {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${field.gridColumns || 2}, minmax(0, 1fr))`,
                  }
                : undefined
            }>
            {field.fields?.map((nestedField) => (
              <div key={nestedField.id} className='w-full'>
                {renderField ? renderField(nestedField) : null}
              </div>
            ))}
          </div>
        </div>
      );

    case 'rich_text':
      return (
        <div
          className={cn(
            'prose prose-sm max-w-none py-4 dark:prose-invert',
            className,
          )}
          dangerouslySetInnerHTML={{ __html: field.content || '' }}
        />
      );

    default:
      return <DisplayTextField {...commonProps} />;
  }
}
