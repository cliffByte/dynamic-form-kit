export {
  FormKitProvider,
  useFormKit,
  type FormKitContextValue,
  type FormKitMediaUploadResult,
  type FormKitProviderProps,
} from './context/FormKitContext';

export {
  FormKitRoot,
  FORM_KIT_ROOT_CLASS,
  type FormKitRootProps,
} from './components/FormKitRoot';

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

export type {
  FormField,
  FormSchema,
  FormTemplate,
  TableColumn,
  TableColumnGroup,
  TableRowConfig,
  OptionConfig,
  ConditionalRule,
  DynamicDataSource,
} from './types/form';
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
export {
  validateFieldWithZod,
  validateFormWithZod,
  buildFormSchema,
  buildFieldSchema,
  getZodSchemaForForm,
  validateFieldValue,
  validateFormSubmission,
} from './lib/validationUtils';
export { passwordValidation } from './lib/zodValidation';
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
  mapDefaultValuesToFieldIds,
  type FormKitValues,
} from './lib/submissionUtils';

export {
  uploadPendingMediaInValues,
  mediaValueIsComplete,
} from './lib/mediaUploadUtils';

export {
  applyFieldVisibility,
  applyStepVisibility,
  groupStepSections,
  isMultiStepWizard,
  markFieldsTouched,
  scrollToFirstFieldError,
  findStepIndexForFieldId,
  collectVisibleFields,
  pickSubmissionValuesForFields,
  getStepVisibleFieldIds,
  validateStepSection,
  validateWizardSteps,
  validateVisibleFields,
  mergeStepValidationErrors,
  type StepGroup,
  type FormStructure,
  type WizardValidationOptions,
} from './lib/formStepStructure';

export { useDynamicOptions, getNestedValue } from './hooks/useDynamicOptions';
export { useLocalizedField, useLocalizedFields } from './hooks/useLocalizedField';
export {
  FORM_KIT_DEFAULT_LOCALE,
  FORM_KIT_SUPPORTED_LOCALES,
  resolveFormKitLocale,
  type FormKitLocale,
} from './lib/locales';
export {
  getLocalizedField,
  getLocalizedFieldValue,
  getLocalizedFields,
} from './lib/fieldLocalization';
