import type { FormField } from '../types/form';

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

/**
 * Groups consecutive `step_section` fields and collects other root fields separately.
 */
export function groupStepSections(fields: FormField[]): FormStructure {
  const stepGroups: StepGroup[] = [];
  const nonStepFields: { field: FormField; originalIndex: number }[] = [];

  let currentGroup: FormField[] | null = null;
  let groupStartIndex = -1;

  fields.forEach((field, index) => {
    if (field.type === 'step_section') {
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
