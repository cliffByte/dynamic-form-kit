/**
 * Form Field Components
 *
 * Reusable, user-friendly form field components for rendering dynamic forms.
 * These components can be used in FormPreviewModal, public form views, or anywhere
 * form fields need to be rendered.
 */

// Types
export * from './types';

// Wrapper component
export {
  FieldWrapper,
  FieldLoading,
  FieldError,
  FieldEmpty,
  ParentFieldRequired,
} from './FieldWrapper';

// Basic input fields
export { TextField } from './TextField';
export { NepaliUnicodeField } from './NepaliUnicodeField';
export { PhoneField } from './PhoneField';
export { NumberField } from './NumberField';
export { TextareaField } from './TextareaField';

// Selection fields
export { SelectField } from './SelectField';
export { MultiSelectField } from './MultiSelectField';
export { RadioField } from './RadioField';
export { CheckboxField } from './CheckboxField';

// Date and time fields
export { DateField } from './DateField';

// Rating and range fields
export { RatingField } from './RatingField';
export { RangeField } from './RangeField';

// Complex fields
export { MatrixField } from './MatrixField';
export { ArrayField } from './ArrayField';
export { TableField } from './TableField';
export { SectionField, gridColsMap } from './SectionField';

// Rich content fields
export { RichTextField } from './RichTextField';
export { RichTextInputField } from './RichTextInputField';

// Media and map fields
export { MediaField } from './MediaField';
export { MapFieldComponent } from './MapFieldComponent';

// Calculated field
export { CalculatedField } from './CalculatedField';

// Universal renderer
export { FormFieldRenderer, useFieldRenderer } from './FormFieldRenderer';
export type { FormFieldRendererProps } from './FormFieldRenderer';

// Type exports for convenience
export type { FormField } from '../../types/form';
