'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import type { FormField, FormTemplate } from '../types/form';
import type { FormKitClient } from '../lib/client/createFormKitClient';

export interface FormKitMediaUploadResult {
  url: string;
  filename: string;
}

export interface FormKitContextValue {
  locale: string;
  t: (key: string) => string;
  /**
   * Optional API client created by `createFormKitClient()`.
   * Consumers may use it to fetch `form` / `submission` data before passing props to runtime components.
   */
  client?: FormKitClient;
  listFormTemplates: () => Promise<FormTemplate[]>;
  deleteFormTemplate: (id: string) => Promise<void>;
  saveFormTemplate: (payload: {
    name: Record<string, string>;
    description?: Record<string, string>;
    schema: FormField;
  }) => Promise<void>;
  uploadMedia: (formData: FormData) => Promise<FormKitMediaUploadResult>;

  // Runtime CRUD (delegates to client by default)
  getForm: (formId: string) => Promise<any>;
  getSubmission: (submissionId: string) => Promise<any>;
  createSubmission: (payload: {
    formId: string;
    data: Record<string, any>;
  }) => Promise<any>;
  updateSubmission: (
    submissionId: string,
    payload: { data: Record<string, any> },
  ) => Promise<any>;
}

const defaultContext: FormKitContextValue = {
  locale: 'en',
  t: (k) => k,
  client: undefined,
  listFormTemplates: async () => [],
  deleteFormTemplate: async () => {
    throw new Error('FormKit: deleteFormTemplate is not configured');
  },
  saveFormTemplate: async () => {
    throw new Error('FormKit: saveFormTemplate is not configured');
  },
  uploadMedia: async () => {
    throw new Error('FormKit: uploadMedia is not configured');
  },
  getForm: async () => {
    throw new Error('FormKit: client is not configured (getForm)');
  },
  getSubmission: async () => {
    throw new Error('FormKit: client is not configured (getSubmission)');
  },
  createSubmission: async () => {
    throw new Error('FormKit: client is not configured (createSubmission)');
  },
  updateSubmission: async () => {
    throw new Error('FormKit: client is not configured (updateSubmission)');
  },
};

const FormKitContext = createContext<FormKitContextValue>(defaultContext);

export interface FormKitProviderProps {
  children: ReactNode;
  /** Overrides; omitted keys use safe defaults (templates return [], locale "en"). */
  value: Partial<FormKitContextValue>;
}

export function FormKitProvider({
  children,
  value,
}: FormKitProviderProps): React.ReactElement {
  const merged = { ...defaultContext, ...value } as FormKitContextValue;

  // If a client is provided and the caller didn't explicitly override a method,
  // delegate runtime CRUD + upload to the client.
  if (merged.client) {
    if (value.getForm === undefined) merged.getForm = merged.client.getForm;
    if (value.getSubmission === undefined)
      merged.getSubmission = merged.client.getSubmission;
    if (value.createSubmission === undefined)
      merged.createSubmission = merged.client.createSubmission;
    if (value.updateSubmission === undefined)
      merged.updateSubmission = merged.client.updateSubmission;
    if (value.uploadMedia === undefined)
      merged.uploadMedia = merged.client.uploadMedia;
  }

  return (
    <FormKitContext.Provider value={merged}>
      {children}
    </FormKitContext.Provider>
  );
}

export function useFormKit(): FormKitContextValue {
  return useContext(FormKitContext);
}
