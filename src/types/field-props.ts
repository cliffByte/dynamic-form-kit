import { FormField } from './form';
import { ReactNode } from 'react';

/**
 * Base props for all field components
 */
export interface BaseFieldProps {
  /** The field configuration */
  field: FormField;
  /** Current value of the field */
  value: any;
  /** Callback when value changes */
  onChange: (value: any) => void;
  /** Callback when field loses focus */
  onBlur?: () => void;
  /** Whether to show validation error */
  showError?: boolean;
  /** Validation error message */
  errorMessage?: string;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Custom class name for the container */
  className?: string;
}

/**
 * Dynamic option structure
 */
export interface DynamicOption {
  label: string;
  value: string;
}

/**
 * Props for fields with dynamic options (select, multi_select, radio, checkbox)
 */
export interface DynamicFieldProps extends BaseFieldProps {
  /** Dynamic options loaded from API */
  dynamicOptions?: DynamicOption[];
  /** Whether options are loading */
  isLoading?: boolean;
  /** Error message when loading options fails */
  loadError?: string;
  /** Callback to retry loading options */
  onRetry?: () => void;
  /** Whether the field is dependent on a parent field */
  isDependent?: boolean;
  /** Whether the parent field has a value */
  parentHasValue?: boolean;
  /** Parent field name for display */
  parentFieldName?: string;
  /** Callback to render nested form fields */
  renderField?: (field: FormField) => ReactNode;
  /** All form values for nested form fields */
  formValues?: Record<string, any>;
  /** Callback to update nested form field values */
  onNestedFieldChange?: (fieldId: string, value: any) => void;
}

/**
 * Props for container fields (sections, arrays)
 */
export interface ContainerFieldProps extends BaseFieldProps {
  /** Callback to render child fields */
  renderField?: (field: FormField) => ReactNode;
  /** All form values for child fields */
  formValues?: Record<string, any>;
}
