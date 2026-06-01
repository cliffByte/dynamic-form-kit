import type { FormField } from '../types/form';
import type { FormSubmissionData } from '../types/submission';
import { getChoiceFieldValue, shouldShowField } from './formUtils';
import { validateFormWithZod } from './zodValidation';

export interface StepGroup {
  steps: FormField[];
  startIndex: number;
  endIndex: number;
}

export interface FormStructure {
  stepGroups: StepGroup[];
  nonStepFields: { field: FormField; originalIndex: number }[];
  hasSteps: boolean;
}

function shouldHideField(field: FormField, hide?: boolean): boolean {
  if (field.isHidden === true) return true;
  if (hide === true && field.hideable === true) return true;
  return false;
}

function applyVisibilityToField(
  field: FormField,
  hide?: boolean,
): FormField {
  const shouldHide = shouldHideField(field, hide);

  const nestedFields = field.fields?.length
    ? field.fields.map((child) => applyVisibilityToField(child, hide))
    : field.fields;

  if (!shouldHide && nestedFields === field.fields) {
    return field;
  }

  return {
    ...field,
    isHidden: shouldHide ? true : field.isHidden,
    fields: nestedFields,
  };
}

/**
 * Applies visibility for the render pipeline:
 * - `isHidden` on the schema always hides the field
 * - `hide={true}` additionally hides fields marked `hideable`
 */
export function applyFieldVisibility(
  fields: FormField[],
  hide?: boolean,
): FormField[] {
  if (hide !== true) {
    return fields;
  }

  return fields.map((field) => applyVisibilityToField(field, hide));
}

/** @deprecated Use `applyFieldVisibility` instead. */
export function applyStepVisibility(
  fields: FormField[],
  hide?: boolean,
): FormField[] {
  return applyFieldVisibility(fields, hide);
}

/**
 * Groups consecutive `step_section` fields and collects other root fields separately.
 * Step sections with `isHidden: true` are omitted from wizard groups.
 */
export function groupStepSections(fields: FormField[]): FormStructure {
  const stepGroups: StepGroup[] = [];
  const nonStepFields: { field: FormField; originalIndex: number }[] = [];

  let currentGroup: FormField[] | null = null;
  let groupStartIndex = -1;

  fields.forEach((field, index) => {
    if (field.type === 'step_section') {
      if (field.isHidden) {
        return;
      }

      if (currentGroup === null) {
        currentGroup = [field];
        groupStartIndex = index;
      } else {
        currentGroup.push(field);
      }
    } else {
      if (currentGroup !== null) {
        stepGroups.push({
          steps: currentGroup,
          startIndex: groupStartIndex,
          endIndex: index - 1,
        });
        currentGroup = null;
        groupStartIndex = -1;
      }
      nonStepFields.push({ field, originalIndex: index });
    }
  });

  if (currentGroup !== null) {
    stepGroups.push({
      steps: currentGroup,
      startIndex: groupStartIndex,
      endIndex: fields.length - 1,
    });
  }

  return {
    stepGroups,
    nonStepFields,
    hasSteps:
      stepGroups.length > 0 && stepGroups.some((g) => g.steps.length > 0),
  };
}

/** Whether the schema should use the multi-step wizard UI (2+ steps in the active group). */
export function isMultiStepWizard(
  structure: FormStructure,
  activeStepGroup: StepGroup | null,
): boolean {
  return Boolean(
    structure.hasSteps &&
      activeStepGroup &&
      activeStepGroup.steps.length > 1,
  );
}

export function markFieldsTouched(fieldList: FormField[]): Record<string, boolean> {
  const touched: Record<string, boolean> = {};

  const walk = (list: FormField[]) => {
    for (const field of list) {
      touched[field.id] = true;
      if (field.fields?.length) walk(field.fields);
      if (field.optionConfigs?.length) {
        for (const opt of field.optionConfigs) {
          if (opt.nestedForm?.fields?.length) {
            walk(opt.nestedForm.fields);
          }
        }
      }
    }
  };

  walk(fieldList);
  return touched;
}

export function scrollToFirstFieldError(errors: Record<string, string>): void {
  const firstErrorFieldId = Object.keys(errors)[0];
  if (!firstErrorFieldId) return;
  const errorElement = document.getElementById(`field-${firstErrorFieldId}`);
  errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function findStepIndexForFieldId(
  steps: FormField[],
  fieldId: string,
): number {
  const containsField = (fieldList: FormField[]): boolean => {
    for (const field of fieldList) {
      if (field.id === fieldId) return true;
      if (field.fields?.length && containsField(field.fields)) return true;
      if (field.optionConfigs?.length) {
        for (const opt of field.optionConfigs) {
          if (opt.nestedForm?.fields?.length && containsField(opt.nestedForm.fields)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  return steps.findIndex(
    (step) => step.fields?.length && containsField(step.fields),
  );
}

/**
 * Collect fields visible in the current form state (respects conditional logic).
 */
export function collectVisibleFields(
  fields: FormField[],
  values: FormSubmissionData,
): FormField[] {
  const out: FormField[] = [];

  const walk = (list: FormField[]) => {
    for (const field of list) {
      if (field.isHidden) continue;
      if (!shouldShowField(field, values)) continue;

      out.push(field);

      if (Array.isArray(field.fields) && field.fields.length > 0) {
        walk(field.fields);
      }

      if (field.optionConfigs?.length) {
        const val = getChoiceFieldValue(values[field.id]);
        for (const opt of field.optionConfigs) {
          const isSelected = Array.isArray(val)
            ? val.includes(opt.value)
            : val === opt.value;
          if (isSelected && opt.nestedForm?.fields?.length) {
            walk(opt.nestedForm.fields);
          }
        }
      }
    }
  };

  walk(fields);
  return out;
}

export function pickSubmissionValuesForFields(
  visibleFields: FormField[],
  values: FormSubmissionData,
): FormSubmissionData {
  const picked: FormSubmissionData = {};
  for (const field of visibleFields) {
    if (values[field.id] !== undefined) {
      picked[field.id] = values[field.id];
    }
  }
  return picked;
}

/** Field ids currently visible within a wizard step. */
export function getStepVisibleFieldIds(
  stepField: FormField,
  values: FormSubmissionData,
): string[] {
  return collectVisibleFields(stepField.fields ?? [], values).map((f) => f.id);
}

/**
 * Validate only the visible fields belonging to a single wizard step.
 */
export function validateStepSection(
  stepField: FormField,
  values: FormSubmissionData,
  locale?: string,
): { isValid: boolean; errors: Record<string, string> } {
  const stepFields = stepField.fields ?? [];
  const visibleFields = collectVisibleFields(stepFields, values);

  if (visibleFields.length === 0) {
    return { isValid: true, errors: {} };
  }

  const stepData = pickSubmissionValuesForFields(visibleFields, values);
  return validateFormWithZod(visibleFields, stepData, locale);
}

export interface WizardValidationOptions {
  steps: FormField[];
  nonStepFields?: FormField[];
  values: FormSubmissionData;
  locale?: string;
}

/**
 * Validate each wizard step in order, then any root fields shown after steps.
 * Returns the first step index that failed validation.
 */
export function validateWizardSteps(
  options: WizardValidationOptions,
): {
  isValid: boolean;
  errors: Record<string, string>;
  firstInvalidStepIndex: number;
} {
  const { steps, nonStepFields = [], values, locale } = options;
  const allErrors: Record<string, string> = {};

  for (let i = 0; i < steps.length; i++) {
    const result = validateStepSection(steps[i], values, locale);
    if (!result.isValid) {
      Object.assign(allErrors, result.errors);
      return { isValid: false, errors: allErrors, firstInvalidStepIndex: i };
    }
  }

  if (nonStepFields.length > 0) {
    const visible = collectVisibleFields(nonStepFields, values);
    if (visible.length > 0) {
      const data = pickSubmissionValuesForFields(visible, values);
      const result = validateFormWithZod(visible, data, locale);
      if (!result.isValid) {
        Object.assign(allErrors, result.errors);
        return {
          isValid: false,
          errors: allErrors,
          firstInvalidStepIndex: Math.max(steps.length - 1, 0),
        };
      }
    }
  }

  return { isValid: true, errors: {}, firstInvalidStepIndex: -1 };
}

/**
 * Validate only fields visible in the current form state (respects isHidden and conditional logic).
 */
export function validateVisibleFields(
  fields: FormField[],
  values: FormSubmissionData,
  locale?: string,
): { isValid: boolean; errors: Record<string, string> } {
  const visible = collectVisibleFields(fields, values);
  if (visible.length === 0) {
    return { isValid: true, errors: {} };
  }
  const data = pickSubmissionValuesForFields(visible, values);
  return validateFormWithZod(visible, data, locale);
}

/** Replace step-scoped errors while preserving errors from other steps. */
export function mergeStepValidationErrors(
  prev: Record<string, string>,
  stepFieldIds: string[],
  stepErrors: Record<string, string>,
): Record<string, string> {
  const next = { ...prev };
  for (const id of stepFieldIds) {
    delete next[id];
  }
  return { ...next, ...stepErrors };
}
