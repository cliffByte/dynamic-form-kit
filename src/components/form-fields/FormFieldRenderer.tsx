'use client';

import React from 'react';
import { FormField } from '../../types/form';
import {
  BaseFieldProps,
  DynamicFieldProps,
  ContainerFieldProps,
} from './types';
import { TextField } from './TextField';
import { PhoneField } from './PhoneField';
import { NumberField } from './NumberField';
import { TextareaField } from './TextareaField';
import { SelectField } from './SelectField';
import { MultiSelectField } from './MultiSelectField';
import { RadioField } from './RadioField';
import { CheckboxField } from './CheckboxField';
import { DateField } from './DateField';
import { RatingField } from './RatingField';
import { RangeField } from './RangeField';
import { MatrixField } from './MatrixField';
import { ArrayField } from './ArrayField';
import { TableField } from './TableField';
import { SectionField } from './SectionField';
import { RichTextField } from './RichTextField';
import { RichTextInputField } from './RichTextInputField';
import { MediaField } from './MediaField';
import { MapFieldComponent } from './MapFieldComponent';
import { CalculatedField } from './CalculatedField';
import { NepaliUnicodeField } from './NepaliUnicodeField';

export interface FormFieldRendererProps {
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
  /** Custom class name */
  className?: string;

  // Dynamic options props
  /** Dynamic options loaded from API */
  dynamicOptions?: { label: string; value: string }[];
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

  // Container props
  /** Callback to render nested fields */
  renderField?: (field: FormField) => React.ReactNode;

  // Calculated field props
  /** All form values for calculated fields */
  formValues?: Record<string, any>;
}

/**
 * Universal form field renderer
 *
 * Renders the appropriate field component based on field type.
 * This is the main component to use for rendering form fields.
 *
 * @example
 * ```tsx
 * <FormFieldRenderer
 *   field={field}
 *   value={values[field.id]}
 *   onChange={(val) => setValue(field.id, val)}
 *   showError={touched[field.id]}
 *   errorMessage={errors[field.id]}
 * />
 * ```
 */
function FormFieldRendererInner({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
  dynamicOptions,
  isLoading,
  loadError,
  onRetry,
  isDependent,
  parentHasValue,
  parentFieldName,
  renderField,
  formValues,
}: FormFieldRendererProps): JSX.Element | null {
  // Common props for all fields
  const baseProps: BaseFieldProps = {
    field,
    value,
    onChange,
    onBlur,
    showError,
    errorMessage,
    disabled,
    className,
  };

  // Props for fields with dynamic options (includes renderField for nested forms)
  const dynamicProps: DynamicFieldProps = {
    ...baseProps,
    dynamicOptions,
    isLoading,
    loadError,
    onRetry,
    isDependent,
    parentHasValue,
    parentFieldName,
    renderField,
    formValues,
  };

  // Props for container fields
  const containerProps: ContainerFieldProps = {
    ...baseProps,
    renderField,
    formValues,
  };

  switch (field.type) {
    // Basic text inputs
    case 'text':
    case 'email':
      return <TextField {...baseProps} />;
    case 'nepali_unicode':
      return <NepaliUnicodeField {...baseProps} />;

    case 'phone':
      return <PhoneField {...baseProps} />;

    case 'number':
      return <NumberField {...baseProps} />;

    case 'textarea':
      return <TextareaField {...baseProps} />;

    // Selection fields
    case 'select':
      return <SelectField {...dynamicProps} />;

    case 'multi_select':
      return <MultiSelectField {...dynamicProps} />;

    case 'radio':
      return <RadioField {...dynamicProps} />;

    case 'checkbox':
      return <CheckboxField {...dynamicProps} />;

    // Date fields
    case 'date':
      return <DateField {...baseProps} />;

    // Rating and range
    case 'rating':
      return <RatingField {...baseProps} />;

    case 'range':
      return <RangeField {...baseProps} />;

    // Matrix/grid
    case 'matrix':
      return <MatrixField {...baseProps} />;

    // Container fields
    case 'array':
      return <ArrayField {...containerProps} />;

    case 'table':
      return <TableField {...containerProps} />;

    case 'step_section':
    case 'ui_section':
      return <SectionField {...containerProps} />;

    // Rich content
    case 'rich_text':
      return <RichTextField {...baseProps} />;

    case 'rich_text_input':
      return <RichTextInputField {...baseProps} />;

    // Media and map
    case 'media':
      return <MediaField {...baseProps} />;

    case 'map':
      return <MapFieldComponent {...baseProps} />;

    // Calculated
    case 'calculated':
      return <CalculatedField {...baseProps} formValues={formValues} />;

    // Unknown field type - render as text
    default:
      console.warn(`Unknown field type: ${field.type}, rendering as text`);
      return <TextField {...baseProps} />;
  }
}

// Custom comparison to prevent unnecessary re-renders
function arePropsEqual(
  prevProps: FormFieldRendererProps,
  nextProps: FormFieldRendererProps,
): boolean {
  // Always re-render if value changes
  if (prevProps.value !== nextProps.value) return false;

  // Re-render if the render function or form values changed
  // This is critical for nested forms and conditional visibility
  if (prevProps.renderField !== nextProps.renderField) return false;
  if (prevProps.formValues !== nextProps.formValues) return false;

  // Re-render if error state changes
  if (prevProps.showError !== nextProps.showError) return false;
  if (prevProps.errorMessage !== nextProps.errorMessage) return false;

  // Re-render if loading state changes
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.loadError !== nextProps.loadError) return false;

  // Re-render if disabled state changes
  if (prevProps.disabled !== nextProps.disabled) return false;

  // Re-render if dynamic options change (compare by length for performance)
  if (prevProps.dynamicOptions?.length !== nextProps.dynamicOptions?.length)
    return false;

  // Re-render if parent has value changes (for dependent fields)
  if (prevProps.parentHasValue !== nextProps.parentHasValue) return false;

  // Re-render if field configuration changes (deep check or reference change)
  if (prevProps.field !== nextProps.field) return false;

  return true;
}

// Memoized component to prevent unnecessary re-renders
export const FormFieldRenderer = React.memo(
  FormFieldRendererInner,
  arePropsEqual,
);

/**
 * Hook-friendly wrapper for rendering fields
 */
export function useFieldRenderer() {
  const renderField = React.useCallback(
    (props: FormFieldRendererProps): JSX.Element => (
      <FormFieldRenderer {...props} />
    ),
    [],
  );

  return { renderField };
}
