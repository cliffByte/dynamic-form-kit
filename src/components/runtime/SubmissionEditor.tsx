'use client';

import React from 'react';
import { FormRenderer, type FormRendererProps } from './FormRenderer';

export type SubmissionEditorProps = Omit<FormRendererProps, 'mode'> & {
  submissionId: string;
};

export function SubmissionEditor(props: SubmissionEditorProps) {
  return <FormRenderer {...props} mode='edit' />;
}

