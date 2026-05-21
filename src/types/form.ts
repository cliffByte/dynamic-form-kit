export interface ConditionalRule {
  fieldId: string; // The field that triggers the condition
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains';
  value: string; // The value to compare against
}

// Simplified logic structure (alternative to conditionalRules)
export interface FieldLogic {
  depends_on?: string; // Field ID this field depends on
  show_if_value?: string; // Value to show if (conditional visibility)
}

// Analytics configuration
export interface FieldAnalytics {
  metric_key?: string; // Analytics metric key
  weight?: number; // How much this field impacts the total score (default 1.0)
}

// Dynamic data source configuration for select/multi-select fields
export interface DynamicDataSource {
  url: string; // API endpoint to fetch data from
  method?: 'GET' | 'POST'; // HTTP method (default: GET)
  path: string; // JSONPath to extract data from response (e.g., "data.list", "items")
  valueField: string; // Field name to use as option value (e.g., "id")
  labelField: string; // Field name to use as option label (e.g., "name")
  headers?: Record<string, string>; // Optional custom headers
  body?: Record<string, any>; // Request body for POST requests
  dependsOn?: string; // Parent field ID for cascading selects
  parentValueParam?: string; // Parameter name to send parent value in POST body (e.g., "categoryId")
  parentValuePath?: string; // URL placeholder to replace with parent value (e.g., "{parentValue}")
}

export interface NestedForm {
  id: string;
  name: string;
  fields: FormField[];
}

export interface OptionConfig {
  value: string;
  label: string;
  nestedForm?: NestedForm; // Optional nested form for this option
  translations?: {
    label?: Record<string, string>; // Translations for label: { en: "Option", ne: "विकल्प" }
  };
}

// Table column group configuration for grouping multiple columns under a single header
export interface TableColumnGroup {
  id: string;
  label: string; // Group header label (e.g., "Dimension", "Money")
  columnIds: string[]; // IDs of columns that belong to this group
  parentGroupId?: string; // Optional parent group ID for nested grouping
  translations?: {
    label?: Record<string, string>; // Translations for label
  };
}

// Table column configuration
export interface TableColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multi_select' | 'calculated'; // Supported column types
  placeholder?: string;
  options?: string[]; // For select/multi_select columns
  formula?: string; // For calculated columns
  width?: number; // Optional column width in pixels
  required?: boolean;
  isHidden?: boolean;
  showSum?: boolean; // Show sum in footer for number/calculated columns (default: true for number/calculated, false for others)
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  translations?: {
    label?: Record<string, string>; // Translations for label
    placeholder?: Record<string, string>; // Translations for placeholder
    message?: Record<string, string>; // Translations for validation message
    options?: Record<string, string[]>; // Translations for options array: { en: ["Option 1"], ne: ["विकल्प १"] }
  };
}

export interface TableRowConfig {
  id: string;
  label: string; // Display label (e.g., "1", "1.1", "1.2")
  name?: string; // User-defined row name (e.g., "Assets", "Cash")
  parentRowId?: string; // Parent row reference for hierarchical rows
}

// Default values for table cells (matrix mode)
// Supports both rowIndex (legacy) and rowId (stable hierarchical rows)
export interface TableCellDefault {
  rowIndex: number; // Row index (0-based)
  rowId?: string; // Row id for stable mapping when row hierarchy is used
  columnId: string;
  value: any; // Default value for this cell
}

export interface FormField {
  useGrid?: any;
  id: string;
  uniqueIdentifier?: string;
  type:
    | 'text'
    | 'nepali_unicode'
    | 'email'
    | 'phone' // Phone number input with country code selection
    | 'number'
    | 'textarea'
    | 'select'
    | 'multi_select' // New: multiple selection dropdown
    | 'checkbox'
    | 'radio'
    | 'matrix' // New: matrix/rating grid
    | 'range' // New: range/rating range
    | 'rating' // Star rating field
    | 'date'
    | 'rich_text' // Combined header and paragraph with rich text editor (static admin content)
    | 'rich_text_input' // Rich text input field for users to fill
    | 'media'
    | 'step_section' // Section for displaying form steps/wizard
    | 'ui_section' // Section for configuring UI layout (grid/flex)
    | 'array' // Repeating group of fields
    | 'table' // Table field with grouped columns and footer calculations
    | 'calculated' // Calculated field with mathematical formula
    | 'map'; // Map field with multiple drawing modes (coordinate, polygon, circle, rectangle, line)
  label: string;
  instruction?: string; // Helpful hint or description (separate from placeholder)
  placeholder?: string;
  default_value?: any; // Default value for the field
  required: boolean;
  isHidden?: boolean; // Controls visibility in submission page
  isDisabled?: boolean; // Controls whether field is disabled in submission page
  defaultCountry?: string; // Default country code for phone input (e.g., 'NP', 'US')
  textareaRows?: number; // Number of rows for textarea fields (default: 4)
  textareaCols?: number; // Number of columns for textarea fields (default: undefined, uses auto width)
  options?: string[]; // For select, radio, checkbox, multi_select (static options)
  optionConfigs?: OptionConfig[]; // New: detailed option configuration with nested forms

  // Dynamic data source for select/multi-select fields
  isDynamic?: boolean; // Flag to indicate dynamic options
  dataSource?: DynamicDataSource; // Configuration for fetching dynamic options

  // Validation (min/max applicable to number type, pattern for text/email)
  validation?: {
    min?: number; // Min value (for number type only)
    max?: number; // Max value (for number type only)
    pattern?: string | string[]; // Regex pattern(s) - string for backward compatibility, string[] for multiple patterns (for text/email/textarea/rich_text_input)
    patternMessages?: string[]; // Custom error messages for each pattern (optional, matches pattern array index)
    message?: string; // Custom validation error message (fallback for single pattern or when patternMessages not provided)
    language?: 'en' | 'ne' | 'any'; // Language validation: 'en' (English only), 'ne' (Nepali only), 'any' (any language allowed)
    displayFormat?: 'auto' | 'english' | 'nepali'; // Number display format: 'auto' (based on locale), 'english' (always 0-9), 'nepali' (always ०-९)
  };

  conditionalRules?: ConditionalRule[]; // Rules for when this field should be shown
  logic?: FieldLogic; // Alternative simpler logic structure

  // Rich text specific properties
  content?: string; // Rich text HTML content for rich_text fields

  // Media upload specific properties
  mediaMode?: 'edit' | 'preview'; // 'edit' = full upload manager, 'preview' = static display (builder uploads once)
  previewMedia?: { url: string; name: string; size: number; type: string }; // Pre-uploaded file shown in preview mode
  multiple?: boolean; // Allow multiple file uploads
  maxFiles?: number; // Maximum number of files allowed (default 10)
  maxSize?: number; // Maximum size per file in bytes (e.g., 5242880 for 5MB)
  maxTotalSize?: number; // Maximum total size for all files combined in bytes (e.g., 10485760 for 10MB)
  acceptedTypes?: string[]; // Accepted file types (e.g., ['image/*', '.pdf'])
  fileTypes?: ('photo' | 'audio' | 'video' | 'barcode' | 'file' | 'xml')[]; // File type categories for uploads (multiple allowed)
  allowedExtensions?: string[]; // Explicitly allowed file extensions (e.g., ['.jpg', '.png', '.pdf']) - overrides acceptedTypes when set
  blockedExtensions?: string[]; // Blocked file extensions for security (e.g., ['.rar', '.zip', '.exe']) - always enforced

  // Matrix type specific properties (only for matrix type)
  matrixRows?: string[]; // Row labels for matrix fields
  matrixColumns?: string[]; // Column labels for matrix fields

  // Range type specific properties (only for range type)
  rangeMode?: 'single' | 'range'; // Single value slider or range slider with two handles
  rangeMin?: number; // Minimum range value (for range type only)
  rangeMax?: number; // Maximum range value (for range type only)
  rangeStep?: number; // Step/increment value for range input (default: 1)
  rangeMinLabel?: string; // Label for minimum value (e.g., "Not Satisfied")
  rangeMaxLabel?: string; // Label for maximum value (e.g., "Highly Satisfied")

  // Rating type specific properties (only for rating type)
  ratingMax?: number; // Maximum rating value (default: 5)

  // Date type specific properties (only for date type)
  dateMode?: 'single' | 'range'; // Single date picker or date range picker
  dateMin?: string; // Minimum selectable date (ISO date string, e.g., "2024-01-01") or "today"
  dateMax?: string; // Maximum selectable date (ISO date string, e.g., "2024-12-31") or "today"
  dateUseNepaliCalendar?: boolean; // Show this date field in Nepali (Bikram Sambat) calendar

  // Step Section specific properties (for step_section type)
  isExpanded?: boolean; // Controls whether section is expanded/collapsed
  fields?: FormField[]; // Nested fields within the section
  stepNumber?: number; // Step number for step_section type
  stepDescription?: string; // Description for the step

  // UI Section specific properties (for ui_section type)
  layoutType?: 'grid' | 'flex'; // Layout type: grid or flex
  gridColumns?: number; // Number of columns for grid layout (default: 2)
  gap?: number; // Gap between fields in pixels (default: 16)
  alignItems?: 'start' | 'center' | 'end' | 'stretch'; // Flex align items
  justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around'; // Flex justify content
  // fields?: FormField[]; // Nested fields within the UI section (reusing fields property)

  // Array specific properties
  minItems?: number; // Minimum number of array items (default 0)
  maxItems?: number; // Maximum number of array items (optional, no limit if undefined)
  // fields?: FormField[]; // Template fields for array items (reusing fields property from section)

  // Table specific properties (for table type)
  tableMode?: 'dynamic' | 'matrix'; // dynamic = unlimited rows until min/max set; matrix = fixed rows from tableRows
  tableExpandDirection?: 'rows' | 'columns'; // 'rows' = add rows (default); 'columns' = fixed rows, add columns to the right
  tableColumns?: TableColumn[]; // Column definitions for the table
  tableColumnGroups?: TableColumnGroup[]; // Column groupings (e.g., "Dimension" for length/breadth/height)
  tableRows?: TableRowConfig[]; // Hierarchical row definitions for matrix-style tables
  tableRowHeaderLabel?: string; // Header label for row-name column (default: "Row")
  tableCellDefaults?: TableCellDefault[]; // Default values for table cells (matrix mode) - uses rowIndex
  showTableFooter?: boolean; // Whether to show footer with column totals for number/calculated columns
  tableShowSerialNumber?: boolean; // Row-expand mode: show serial number column as first column
  tableSerialNumberLabel?: string; // Header label for SN column (default: "SN")

  // Calculated field specific properties (only for calculated type)
  formula?: string; // Mathematical formula expression with field IDs in curly braces (e.g., "{field1}*{field2}+{field3}")

  // Map field specific properties (only for map type)
  mapDrawingMode?: 'coordinate' | 'polygon' | 'circle' | 'rectangle' | 'line'; // Drawing mode for map field (default: 'coordinate')
  mapCoordinates?: [number, number][]; // Array of [latitude, longitude] pairs (for polygon/line vertices, or rectangle corners)
  mapCenter?: [number, number]; // Map center coordinates [latitude, longitude] (default: [27.7172, 85.324] - Kathmandu)
  mapZoom?: number; // Initial map zoom level (default: 13)
  mapMinZoom?: number; // Minimum zoom level
  mapMaxZoom?: number; // Maximum zoom level
  // For coordinate mode: single [lat, lng] in mapCoordinates[0]
  // For polygon mode: array of [lat, lng] pairs in mapCoordinates
  // For circle mode: center in mapCoordinates[0], radius in calculatedArea (meters)
  // For rectangle mode: two corners in mapCoordinates[0] and mapCoordinates[1]
  // For line mode: array of [lat, lng] pairs in mapCoordinates
  calculatedArea?: number; // Calculated area in square meters (for polygon, circle, rectangle)
  calculatedLength?: number; // Calculated length in meters (for line)
  areaUnit?: 'm²' | 'km²' | 'hectare' | 'acre'; // Unit for displaying area (default: 'm²')
  lengthUnit?: 'm' | 'km' | 'mi'; // Unit for displaying length (default: 'm')

  // Analytics
  analytics?: FieldAnalytics;
  metadata?: Record<string, any>;

  // Localization support - translations for field properties in different locales
  // Structure: { propertyName: { locale: value } }
  // Example: { label: { ne: "नाम" }, placeholder: { ne: "तपाईंको नाम" } }
  translations?: {
    label?: Record<string, string>; // Translations for label
    placeholder?: Record<string, string>; // Translations for placeholder
    instruction?: Record<string, string>; // Translations for instruction
    content?: Record<string, string>; // Translations for content (rich text)
    message?: Record<string, string>; // Translations for validation.message
    options?: Record<string, string[]>; // Translations for options array: { en: ["Option 1"], ne: ["विकल्प १"] }
    matrixRows?: Record<string, string[]>; // Translations for matrixRows
    matrixColumns?: Record<string, string[]>; // Translations for matrixColumns
    rangeMinLabel?: Record<string, string>; // Translations for rangeMinLabel
    rangeMaxLabel?: Record<string, string>; // Translations for rangeMaxLabel
    stepDescription?: Record<string, string>; // Translations for stepDescription
  };
}

export interface FormSchema {
  id: string;
  name: string;
  description?: string;
  category?: string; // Form category for grouping (e.g., "General Forms", "Student Forms")
  backgroundImage?: string; // Base64 encoded image or URL
  fields: FormField[];
  metadata?: {
    prefill?: Record<string, any>;
    copyRules?: Array<{
      triggerFieldUniqueIdentifier: string;
      triggerValue?: any;
      mappings: Array<{
        sourceUniqueIdentifier: string;
        targetUniqueIdentifier: string;
      }>;
      clearTargetsOnUncheck?: boolean;
    }>;
    [key: string]: any;
  };
  published: boolean; // Whether the form is published and can receive submissions
  publishedAt?: string; // When the form was published
  createdAt: string;
  updatedAt: string;
}

export interface FormTemplate {
  id: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  schema: FormField[];
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}
