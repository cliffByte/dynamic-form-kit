import { FormField } from '../../types/form';

export interface DisplayFieldProps {
  /** The field configuration */
  field: FormField;
  /** Current value of the field */
  value: any;
  /** Custom class name */
  className?: string;
  /** Dynamic options loaded from API (for select fields) */
  dynamicOptions?: { label: string | Record<string, string>; value: string }[];
  /** Whether the field should be rendered in a dense/compact mode */
  compact?: boolean;
  /** Whether options are loading */
  isLoading?: boolean;
  /** Error message when loading options fails */
  loadError?: string;
  /** Callback to retry loading options */
  onRetry?: () => void;
  /** Callback to render nested fields (for select fields with nested forms) */
  renderField?: (field: FormField) => React.ReactNode;
  /** All form values (needed for nested form display) */
  formValues?: Record<string, any>;
}

export interface DisplayContainerProps extends DisplayFieldProps {
  /** Callback to render nested fields */
  renderField?: (field: FormField) => React.ReactNode;
  /** All form values (needed for calculated fields or logic) */
  formValues?: Record<string, any>;
}
