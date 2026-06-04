import { FormField, ConditionalRule } from '../types/form';
import { FormSubmissionData, EnhancedFormSubmission } from '../types/submission';
import { validateFormula } from './validationUtils';

/**
 * Creates a field map for O(1) lookup of fields by ID
 * Single responsibility: Create a lookup map from field array
 */
export function createFieldMap(fields: FormField[]): Map<string, FormField> {
  const fieldMap = new Map<string, FormField>();

  function addFieldsToMap(fieldsToAdd: FormField[]) {
    for (const field of fieldsToAdd) {
      fieldMap.set(field.id, field);
      if (
        (field.type === 'step_section' ||
          field.type === 'ui_section' ||
          field.type === 'array' ||
          field.type === 'table') &&
        field.fields
      ) {
        addFieldsToMap(field.fields);
      }

      // Include nestedForm fields defined inside optionConfigs
      if (field.optionConfigs && field.optionConfigs.length > 0) {
        for (const opt of field.optionConfigs) {
          if (opt.nestedForm && opt.nestedForm.fields) {
            addFieldsToMap(opt.nestedForm.fields);
          }
        }
      }
    }
  }

  addFieldsToMap(fields);
  return fieldMap;
}

/**
 * Flattens form fields structure into a single array (includes nested section fields)
 * Single responsibility: Flatten nested field structure
 */
export function flattenFields(fields: FormField[]): FormField[] {
  const flattened: FormField[] = [];

  function addFields(fieldsToAdd: FormField[]) {
    for (const field of fieldsToAdd) {
      // Skip container fields from submission (they're containers)
      if (
        field.type !== 'step_section' &&
        field.type !== 'ui_section' &&
        field.type !== 'array' &&
        field.type !== 'table'
      ) {
        flattened.push(field);
      }
      if (
        (field.type === 'step_section' ||
          field.type === 'ui_section' ||
          field.type === 'array' ||
          field.type === 'table') &&
        field.fields
      ) {
        addFields(field.fields);
      }
      // Include nestedForm fields defined inside optionConfigs
      if (field.optionConfigs && field.optionConfigs.length > 0) {
        for (const opt of field.optionConfigs) {
          if (opt.nestedForm && opt.nestedForm.fields) {
            addFields(opt.nestedForm.fields);
          }
        }
      }
    }
  }

  addFields(fields);
  return flattened;
}

function normalizeMatrixValue(
  field: FormField,
  value: any,
): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const matrixRows = Array.isArray(field.matrixRows) ? field.matrixRows : [];
  const matrixColumns = Array.isArray(field.matrixColumns)
    ? field.matrixColumns
    : [];
  const rawValue = value as Record<string, any>;

  if (matrixRows.length === 0) {
    return Object.entries(rawValue).reduce(
      (acc, [key, selected]) => {
        if (typeof selected === 'string') {
          acc[key] = selected;
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  return matrixRows.reduce(
    (acc, rowLabel, rowIndex) => {
      const rowKey = `row_${rowIndex}`;
      const selected =
        rawValue[rowKey] ?? rawValue[rowLabel] ?? rawValue[rowIndex];

      if (
        typeof selected === 'string' &&
        (matrixColumns.length === 0 || matrixColumns.includes(selected))
      ) {
        acc[rowKey] = selected;
      }
      return acc;
    },
    {} as Record<string, string>,
  );
}

/**
 * Initializes submission data with default values for all fields
 * This follows the schema hierarchy: top-level fields and sections are flat,
 * while fields inside arrays are NOT initialized at the top level.
 * Single responsibility: Initialize default values
 */
function initializeSubmissionData(
  fields: FormField[],
  isInsideArray = false,
): FormSubmissionData {
  const submissionData: FormSubmissionData = {};

  fields.forEach((field) => {
    // Handle container fields
    if (field.type === 'step_section' || field.type === 'ui_section') {
      if (field.fields) {
        Object.assign(
          submissionData,
          initializeSubmissionData(field.fields, isInsideArray),
        );
      }
      return;
    }

    // Skip display-only fields
    if (field.type === 'rich_text') {
      return;
    }

    // If we're inside an array, don't add to the top-level submission data
    // (Nested fields will be managed by the ArrayField component)
    if (isInsideArray) {
      return;
    }

    // Initialize based on field type
    if (field.type === 'array' || field.type === 'table') {
      submissionData[field.id] = [];
    } else {
      // Use default_value if provided
      if (field.default_value !== undefined && field.default_value !== null) {
        submissionData[field.id] =
          field.type === 'matrix'
            ? normalizeMatrixValue(field, field.default_value)
            : field.default_value;
      } else {
        submissionData[field.id] = getDefaultValueForFieldType(field.type);
      }
    }

    // Nested option fields are stored under the parent choice at submit time
    // (see cleanSubmissionData), not flattened here — avoids defaults leaking
    // when the parent option is not selected.
  });

  return submissionData;
}

/**
 * Gets default value for a field type
 * Single responsibility: Determine default value by type
 */
function getDefaultValueForFieldType(fieldType: FormField['type']): any {
  switch (fieldType) {
    case 'checkbox':
    case 'multi_select':
    case 'media':
      return [];
    case 'matrix':
      return {};
    case 'range':
    case 'rating':
    case 'number':
    case 'date':
      return null;
    default:
      return '';
  }
}

/**
 * Creates an enhanced form submission with direct field ID mapping
 * Single responsibility: Create submission object with helpers
 */
export function createEnhancedSubmission(
  fields: FormField[],
): EnhancedFormSubmission {
  const fieldMap = createFieldMap(fields);
  const submissionData = initializeSubmissionData(fields);

  return {
    fields,
    submissionData,
    fieldMap,
  };
}

/**
 * Gets field value by ID (O(1) lookup)
 * Single responsibility: Get value from submission data
 */
export function getFieldValue(
  submissionData: FormSubmissionData,
  fieldId: string,
): any {
  return submissionData[fieldId];
}

/**
 * Sets field value by ID (O(1) operation)
 * Single responsibility: Set value in submission data
 */
export function setFieldValue(
  submissionData: FormSubmissionData,
  fieldId: string,
  value: any,
): void {
  submissionData[fieldId] = value;
}

/**
 * Gets field metadata by ID (O(1) lookup)
 * Single responsibility: Get field from map
 */
export function getFieldById(
  fieldMap: Map<string, FormField>,
  fieldId: string,
): FormField | undefined {
  return fieldMap.get(fieldId);
}

export function shouldShowField(
  field: FormField,
  submissionData: FormSubmissionData,
): boolean {
  // Check simplified logic structure first
  if (field.logic) {
    return evaluateSimpleLogic(field.logic, submissionData);
  }

  // Check conditionalRules (existing structure)
  if (field.conditionalRules && field.conditionalRules.length > 0) {
    return evaluateConditionalRules(field.conditionalRules, submissionData);
  }

  return true;
}

/**
 * Evaluates simple logic structure
 * Single responsibility: Process simple logic rules
 */
function evaluateSimpleLogic(
  logic: { depends_on?: string; show_if_value?: string },
  submissionData: FormSubmissionData,
): boolean {
  const { depends_on, show_if_value } = logic;

  if (!depends_on) {
    return true;
  }

  const dependentValue = submissionData[depends_on];

  if (show_if_value !== undefined) {
    return String(dependentValue) === String(show_if_value);
  }

  // If show_if_value is not specified, show if dependent field has any value
  return (
    dependentValue !== '' &&
    dependentValue !== null &&
    dependentValue !== undefined
  );
}

/**
 * Evaluates conditional rules
 * Single responsibility: Process conditional rules array
 */
function evaluateConditionalRules(
  rules: ConditionalRule[],
  submissionData: FormSubmissionData,
): boolean {
  return rules.every((rule) => evaluateSingleRule(rule, submissionData));
}

/**
 * Evaluates a single conditional rule
 * Single responsibility: Process one rule
 */
function evaluateSingleRule(
  rule: ConditionalRule,
  submissionData: FormSubmissionData,
): boolean {
  const dependentValue = submissionData[rule.fieldId];

  switch (rule.operator) {
    case 'equals':
      return String(dependentValue) === String(rule.value);
    case 'not_equals':
      return String(dependentValue) !== String(rule.value);
    case 'contains':
      return String(dependentValue).includes(String(rule.value));
    case 'not_contains':
      return !String(dependentValue).includes(String(rule.value));
    default:
      return true;
  }
}

/**
 * Evaluates a calculated field formula using BODMAS rules
 * Formula format: "{fieldId1}*{fieldId2}+{fieldId3}"
 * Supports: Brackets []{}(), Division /, Multiplication *, Addition +, Subtraction -
 * Single responsibility: Calculate formula result
 *
 * @param formula - The formula string with field IDs in curly braces
 * @param submissionData - The form submission data (can be full form data or array item data)
 * @param fieldMap - Map of all fields for looking up field definitions
 * @param evaluatedFields - Set of field IDs being evaluated (for circular dependency detection)
 */
export function evaluateFormula(
  formula: string,
  submissionData: FormSubmissionData,
  fieldMap: Map<string, FormField>,
  evaluatedFields: Set<string> = new Set(),
): number | null {
  if (!formula || !formula.trim()) {
    return null;
  }

  try {
    // Validate formula structure before evaluation
    const validation = validateFormula(formula);
    if (!validation.isValid) {
      return null;
    }

    const expression = replaceFieldIdsWithValues(
      formula,
      submissionData,
      fieldMap,
      evaluatedFields,
    );
    const sanitizedExpression = sanitizeExpression(expression);

    if (!isValidExpression(sanitizedExpression)) {
      throw new Error('Invalid characters in formula');
    }

    const result = calculateExpression(sanitizedExpression);
    return result;
  } catch (error) {
    return null;
  }
}

/**
 * Replaces field IDs in formula with their values
 * Single responsibility: Substitute field IDs
 * Handles both regular fields and calculated fields (by evaluating them recursively)
 */
function replaceFieldIdsWithValues(
  formula: string,
  submissionData: FormSubmissionData,
  fieldMap: Map<string, FormField>,
  evaluatedFields: Set<string> = new Set(),
): string {
  const fieldIdRegex = /\{([^}]+)\}/g;

  return formula.replace(fieldIdRegex, (match, fieldId) => {
    // Check if this field is a calculated field
    const field = fieldMap.get(fieldId);
    if (field?.type === 'calculated' && field.formula) {
      // Prevent circular dependencies
      if (evaluatedFields.has(fieldId)) {
        return '0';
      }

      // Evaluate the calculated field recursively
      evaluatedFields.add(fieldId);
      const calculatedValue = evaluateFormula(
        field.formula,
        submissionData,
        fieldMap,
        evaluatedFields,
      );
      evaluatedFields.delete(fieldId);

      const numValue = calculatedValue !== null ? calculatedValue : 0;
      return String(numValue);
    }

    // Regular field - get value from submission data
    const value = submissionData[fieldId];
    const numValue = parseFloat(String(value || 0));
    return isNaN(numValue) ? '0' : String(numValue);
  });
}

/**
 * Sanitizes expression by normalizing brackets
 * Single responsibility: Normalize bracket types
 */
function sanitizeExpression(expression: string): string {
  return expression
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')');
}

/**
 * Validates expression contains only safe characters
 * Single responsibility: Security validation
 */
function isValidExpression(expression: string): boolean {
  return /^[0-9+\-*/().\s]+$/.test(expression);
}

/**
 * Calculates the mathematical expression
 * Single responsibility: Execute calculation
 */
function calculateExpression(expression: string): number | null {
  const result = new Function('return ' + expression)();
  const numResult = parseFloat(String(result));
  return isNaN(numResult) ? null : numResult;
}

/**
 * Gets all field IDs that are nested inside array or table fields
 * These fields should NOT appear at the top level of submission data
 * Single responsibility: Identify nested field IDs
 */
export function getNestedArrayFieldIds(fields: FormField[]): Set<string> {
  const nestedIds = new Set<string>();

  function collectNestedIds(fieldList: FormField[], isInsideArray: boolean) {
    for (const field of fieldList) {
      if (isInsideArray) {
        // This field is inside an array/table - add its ID
        nestedIds.add(field.id);
      }

      // Recurse into container fields
      if (field.type === 'step_section' || field.type === 'ui_section') {
        // Sections don't change the "inside array" status
        if (field.fields) {
          collectNestedIds(field.fields, isInsideArray);
        }
      } else if (field.type === 'array' || field.type === 'table') {
        // Array/table fields: their children are nested
        if (field.fields) {
          collectNestedIds(field.fields, true);
        }
      }

      // Include nestedForm fields defined inside optionConfigs
      if (field.optionConfigs && field.optionConfigs.length > 0) {
        for (const opt of field.optionConfigs) {
          if (opt.nestedForm && opt.nestedForm.fields) {
            // nestedForm fields are considered nested if their parent is inside an array
            collectNestedIds(opt.nestedForm.fields, isInsideArray);
          }
        }
      }
    }
  }

  collectNestedIds(fields, false);
  return nestedIds;
}

/**
 * Gets all top-level field IDs (fields that should appear at root of submission data)
 * This excludes fields that are nested inside arrays/tables
 * Single responsibility: Identify top-level field IDs
 */
export function getTopLevelFieldIds(fields: FormField[]): Set<string> {
  const topLevelIds = new Set<string>();

  function collectTopLevelIds(fieldList: FormField[], isInsideArray: boolean) {
    for (const field of fieldList) {
      // Skip container types for the ID collection (except array/table which have values)
      if (field.type === 'step_section' || field.type === 'ui_section') {
        // Recurse into sections
        if (field.fields) {
          collectTopLevelIds(field.fields, isInsideArray);
        }
      } else if (field.type === 'array' || field.type === 'table') {
        // Array/table fields themselves are top-level (if not inside another array)
        if (!isInsideArray) {
          topLevelIds.add(field.id);
        }
        // Don't recurse - nested fields are not top-level
      }

      // Include nestedForm fields defined inside optionConfigs
      if (field.optionConfigs && field.optionConfigs.length > 0) {
        for (const opt of field.optionConfigs) {
          if (opt.nestedForm && opt.nestedForm.fields) {
            // nestedForm fields should be top-level if the parent field is top-level
            collectTopLevelIds(opt.nestedForm.fields, isInsideArray);
          }
        }
      } else if (field.type === 'rich_text') {
        // Display-only field, skip
      } else {
        // Regular field - only add if not inside an array
        if (!isInsideArray) {
          topLevelIds.add(field.id);
        }
      }
    }
  }

  collectTopLevelIds(fields, false);
  return topLevelIds;
}

/** Stored on choice fields with per-option nested forms (see cleanSubmissionData). */
export const NESTED_OPTION_SELECTION_KEY = '__selection';

/** Resolves the user's choice when the saved value is a nested option map. */
export function getChoiceFieldValue(value: unknown): unknown {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    NESTED_OPTION_SELECTION_KEY in (value as object)
  ) {
    return (value as Record<string, unknown>)[NESTED_OPTION_SELECTION_KEY];
  }
  return value;
}

/** Field ids that live inside an option's nested form (not top-level submission keys). */
export function getOptionNestedFieldIds(schemaFields: FormField[]): Set<string> {
  const ids = new Set<string>();

  function collectFromNested(fieldList: FormField[]) {
    for (const field of fieldList) {
      if (field.type === 'step_section' || field.type === 'ui_section') {
        if (field.fields?.length) collectFromNested(field.fields);
      } else if (field.type === 'array' || field.type === 'table') {
        if (field.fields?.length) collectFromNested(field.fields);
      } else if (field.type !== 'rich_text') {
        ids.add(field.id);
      }
    }
  }

  function walk(fieldList: FormField[]) {
    for (const field of fieldList) {
      if (field.type === 'step_section' || field.type === 'ui_section') {
        if (field.fields?.length) walk(field.fields);
      } else if (field.type === 'array' || field.type === 'table') {
        if (field.fields?.length) walk(field.fields);
      }
      if (field.optionConfigs?.length) {
        for (const opt of field.optionConfigs) {
          if (opt.nestedForm?.fields?.length) {
            collectFromNested(opt.nestedForm.fields);
          }
        }
      }
    }
  }

  walk(schemaFields);
  return ids;
}

/** Submission object with every nested field set to null (unselected option branch). */
export function buildNullNestedSubmissionData(
  nestedFields: FormField[],
): Record<string, null> {
  const out: Record<string, null> = {};

  function walk(fieldList: FormField[]) {
    for (const field of fieldList) {
      if (field.type === 'step_section' || field.type === 'ui_section') {
        if (field.fields?.length) walk(field.fields);
        continue;
      }
      if (field.type === 'rich_text') continue;
      out[field.id] = null;
    }
  }

  walk(nestedFields);
  return out;
}

export type CleanSubmissionDataOptions = {
  /** Include `isHidden` fields that have an explicit `default_value` (selected nested option branch). */
  includeHiddenDefaults?: boolean;
};

/**
 * Cleans submission data by removing hidden fields and nested fields from non-selected options.
 * Unselected option nested forms are saved with null child values (not schema defaults).
 * Single responsibility: Clean submission data structure
 */
export function cleanSubmissionData(
  formData: Record<string, any>,
  schemaFields: FormField[],
  options?: CleanSubmissionDataOptions,
): Record<string, any> {
  const cleanedData: Record<string, any> = {};
  const optionNestedFieldIds = getOptionNestedFieldIds(schemaFields);

  function processFields(
    fields: FormField[],
    nestedOptions?: CleanSubmissionDataOptions,
  ) {
    fields.forEach((field) => {
      const includeHiddenDefault =
        nestedOptions?.includeHiddenDefaults &&
        field.isHidden &&
        field.default_value !== undefined &&
        field.default_value !== null;

      // Evaluate visibility - skip if hidden (except hidden defaults in selected nested option)
      if ((field.isHidden && !includeHiddenDefault) || !shouldShowField(field, formData)) {
        return;
      }

      // Handle based on field type
      if (field.type === 'step_section' || field.type === 'ui_section') {
        // Sections: recurse into children
        if (field.fields) {
          processFields(field.fields, nestedOptions);
        }
      } else if (field.type === 'array' || field.type === 'table') {
        // Array/table: Include as-is (they have their own internal structure)
        cleanedData[field.id] = formData[field.id] || [];
      } else if (field.type === 'rich_text') {
        // Skip display-only fields
      } else if (optionNestedFieldIds.has(field.id)) {
        // Nested under a choice option — emitted under parent[field.id][optionValue]
      } else {
        const optionsWithNested =
          field.optionConfigs?.filter((o) => o.nestedForm?.fields?.length) ?? [];

        if (optionsWithNested.length === 0) {
          // Regular field: include value from formData
          if (formData[field.id] !== undefined) {
            cleanedData[field.id] =
              field.type === 'matrix'
                ? normalizeMatrixValue(field, formData[field.id])
                : formData[field.id];
          } else {
            const fallbackValue =
              field.default_value !== undefined
                ? field.default_value
                : getDefaultValueForFieldType(field.type);

            cleanedData[field.id] =
              field.type === 'matrix'
                ? normalizeMatrixValue(field, fallbackValue)
                : fallbackValue;
          }
        }
      }

      // Nested forms inside option configs — one entry per option value
      const optionsWithNested =
        field.optionConfigs?.filter((o) => o.nestedForm?.fields?.length) ?? [];
      if (optionsWithNested.length > 0) {
        const val = formData[field.id];
        const nestedFormObj: Record<string, any> = {};

        for (const opt of optionsWithNested) {
          const nestedFields = opt.nestedForm!.fields;
          const isSelected = Array.isArray(val)
            ? val.includes(opt.value)
            : val === opt.value;

          nestedFormObj[opt.value] = isSelected
            ? cleanSubmissionData(formData, nestedFields, {
                includeHiddenDefaults: true,
              })
            : buildNullNestedSubmissionData(nestedFields);
        }

        if (val !== undefined) {
          nestedFormObj[NESTED_OPTION_SELECTION_KEY] = val;
        }

        cleanedData[field.id] = nestedFormObj;
      }
    });
  }

  processFields(schemaFields, options);
  return cleanedData;
}
