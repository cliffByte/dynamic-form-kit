'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { Label } from '../ui/label';

interface DisplayFieldWrapperProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  fieldId: string;
  instruction?: string;
}

export function DisplayFieldWrapper({
  label,
  children,
  className,
  fieldId,
  instruction,
}: DisplayFieldWrapperProps) {
  return (
    <div
      className={cn('space-y-1.5 py-2', className)}
      id={`display-field-${fieldId}`}>
      <div className='flex flex-col gap-1'>
        <Label className='text-sm font-semibold text-muted-foreground tracking-tight'>
          {label}
        </Label>
        {instruction && (
          <p className='text-xs text-muted-foreground/70 leading-relaxed italic'>
            {instruction}
          </p>
        )}
      </div>
      <div className='min-h-[1.5rem] flex items-center'>{children}</div>
    </div>
  );
}
