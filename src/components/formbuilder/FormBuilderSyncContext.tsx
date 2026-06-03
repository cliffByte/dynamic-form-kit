'use client';

import { createContext, useContext } from 'react';

export interface FormBuilderSyncContextValue {
  flushSchemaToExternal: () => void;
  selectFieldWithFlush: (fieldId: string) => void;
}

export const FormBuilderSyncContext =
  createContext<FormBuilderSyncContextValue | null>(null);

export function useFormBuilderSync(): FormBuilderSyncContextValue | null {
  return useContext(FormBuilderSyncContext);
}
