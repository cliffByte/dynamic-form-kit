export {
  FormKitProvider,
  useFormKit,
  type FormKitContextValue,
  type FormKitMediaUploadResult,
  type FormKitProviderProps,
} from './context/FormKitContext';

export { FormBuilder } from './components/formbuilder/FormBuilder';
export {
  useFormBuilderStore,
  type FormBuilderState,
} from './components/formbuilder/store/useFormBuilderStore';
export { FieldPalette } from './components/formbuilder/features/field-palette/FieldPalette';
export { FormCanvas } from './components/FormCanvas';
export { FieldEditor } from './components/formbuilder/features/field-editor/FieldEditor';

export * from './components/form-fields';
export * from './components/display-fields';

export { FormPreviewModal } from './components/FormPreviewModal';
export { SubmissionDataModal } from './components/SubmissionDataModal';
export * from './components/runtime';

export type { FormField, FormTemplate } from './types/form';
export type {
  EnhancedFormSubmission,
  FormSubmissionData,
} from './types/submission';
export {
  createFieldMap,
  shouldShowField,
  createEnhancedSubmission,
  cleanSubmissionData,
  evaluateFormula,
} from './lib/formUtils';
export { validateFormWithZod } from './lib/validationUtils';
export { canAddToRoot } from './lib/dragDropUtils';

export {
  createFormKitClient,
  type CreateFormKitClientOptions,
  type FormKitClient,
  type FormKitClientEndpoints,
} from './lib/client/createFormKitClient';

export {
  extractSchemaFields,
  extractSubmissionValues,
  type FormKitValues,
} from './lib/submissionUtils';

export { useDynamicOptions, getNestedValue } from './hooks/useDynamicOptions';
