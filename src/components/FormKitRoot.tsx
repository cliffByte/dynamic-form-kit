'use client';

import React, { type ReactNode } from 'react';
import { cn } from '../lib/utils';

export const FORM_KIT_ROOT_CLASS = 'form-kit-root';

export interface FormKitRootProps {
  children: ReactNode;
  className?: string;
}

/**
 * Scopes form-kit UI so bundled styles and fallbacks apply only inside this subtree.
 * In Tailwind host apps, import `@dynamic-core/form-kit/tailwind.css` in globals (not `styles.css`);
 * the host `:root` theme is inherited automatically.
 */
export function FormKitRoot({ children, className }: FormKitRootProps) {
  return (
    <div
      data-form-kit=''
      className={cn(
        FORM_KIT_ROOT_CLASS,
        /* Invisible to flex/grid; scopes component CSS without affecting page layout */
        'contents',
        className,
      )}>
      {children}
    </div>
  );
}
