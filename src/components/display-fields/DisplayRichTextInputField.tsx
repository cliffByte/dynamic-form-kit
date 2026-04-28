'use client';

import React from 'react';
import { DisplayFieldProps } from './types';
import { DisplayFieldWrapper } from './DisplayFieldWrapper';
import { cn } from '../../lib/utils';

export function DisplayRichTextInputField({
  field,
  value,
  className,
}: DisplayFieldProps) {
  const hasContent =
    value &&
    typeof value === 'string' &&
    value.trim() !== '' &&
    value !== '<p></p>';

  return (
    <DisplayFieldWrapper
      label={field.label}
      fieldId={field.id}
      instruction={field.instruction}
      className={className}>
      {hasContent ? (
        <div
          className={cn(
            'prose prose-sm max-w-none p-3 border rounded-md bg-muted/10 dark:prose-invert',
            'text-base font-medium text-foreground',
          )}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <span className='text-muted-foreground/50 italic text-sm'>
          No content provided
        </span>
      )}
    </DisplayFieldWrapper>
  );
}
