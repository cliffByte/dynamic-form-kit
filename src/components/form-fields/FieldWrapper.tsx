'use client';

import React from 'react';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';

interface FieldWrapperProps {
  /** Field ID for accessibility */
  fieldId: string;
  /** Field label */
  label: string;
  /** Whether field is required */
  required?: boolean;
  /** Instruction/help text */
  instruction?: string;
  /** Whether to show error state */
  showError?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Additional elements to show in label row */
  labelExtra?: React.ReactNode;
  /** Children content */
  children: React.ReactNode;
  /** Custom class name */
  className?: string;
}

/**
 * Wrapper component for form fields providing consistent layout
 * with label, instruction, error display, and proper spacing
 */
export function FieldWrapper({
  fieldId,
  label,
  required,
  instruction,
  showError,
  errorMessage,
  labelExtra,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div id={`field-${fieldId}`} className={cn('min-w-0 space-y-1', className)}>
      {/* Label row */}
      <div className='flex items-center'>
        <Label
          htmlFor={fieldId}
          className='text-sm font-medium'
          required={required}>
          {label}
        </Label>
        {labelExtra}
      </div>

      {/* Instruction/help text */}
      {instruction && (
        <p className='text-xs text-muted-foreground'>{instruction}</p>
      )}

      {/* Field content */}
      {children}

      {/* Error message */}
      {showError && errorMessage && (
        <p className='text-sm text-red-600 mt-1 flex items-center gap-1'>
          <span className='inline-block w-1 h-1 bg-red-600 rounded-full' />
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * Loading placeholder for fields with dynamic options
 */
export function FieldLoading({
  message = 'Loading options...',
}: {
  message?: string;
}) {
  return (
    <div className='p-4 text-center text-muted-foreground border rounded-md bg-muted/30'>
      <div className='inline-flex items-center gap-2'>
        <div className='w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin' />
        <p className='text-sm'>{message}</p>
      </div>
    </div>
  );
}

/**
 * Error state for fields with dynamic options
 */
export function FieldError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className='p-4 bg-red-50 border border-red-200 rounded-md'>
      <p className='text-sm text-red-800 mb-2'>
        <span className='font-medium'>Error:</span> {message}
      </p>
      {onRetry && (
        <button
          type='button'
          onClick={onRetry}
          className='text-sm text-red-700 underline hover:text-red-900'>
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Empty state when no options are available
 */
export function FieldEmpty({
  message = 'No options available',
}: {
  message?: string;
}) {
  return (
    <div className='p-4 text-center text-muted-foreground border rounded-md bg-muted/20'>
      <p className='text-sm'>{message}</p>
    </div>
  );
}

/**
 * Parent field required notice for dependent fields
 */
export function ParentFieldRequired({
  parentFieldName,
}: {
  parentFieldName?: string;
}) {
  return (
    <div className='p-4 bg-amber-50 border-2 border-amber-200 rounded-md text-center'>
      <p className='text-sm text-amber-800 font-medium'>
        Please select the parent field first
      </p>
      {parentFieldName && (
        <p className='text-xs text-amber-600 mt-1'>
          This field depends on: <strong>{parentFieldName}</strong>
        </p>
      )}
    </div>
  );
}
