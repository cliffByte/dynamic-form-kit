'use client';

import React from 'react';
import { BaseFieldProps } from './types';

/**
 * Rich text display field (static HTML content)
 */
export function RichTextField({ field }: BaseFieldProps) {
  if (!field.content) {
    return null;
  }

  return (
    <div
      className='prose prose-sm max-w-none dark:prose-invert'
      dangerouslySetInnerHTML={{ __html: field.content }}
    />
  );
}
