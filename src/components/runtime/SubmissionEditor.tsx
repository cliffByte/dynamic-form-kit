'use client';

import React from 'react';
import { FormRenderer, type FormRendererProps } from './FormRenderer';

export type SubmissionEditorProps = Omit<FormRendererProps, 'mode'> & {
  submission: unknown;
};

export function SubmissionEditor(props: SubmissionEditorProps): React.ReactElement {
  return <FormRenderer {...props} mode='edit' />;
}
