import { FormField } from '../types/form';
import { generateUUID } from './utils';

/**
 * Deep clones a field and all its descendants with new IDs
 */
export function cloneFieldWithNewIds(field: FormField): FormField {
  const newId = generateUUID();
  const clonedField: FormField = {
    ...field,
    id: newId,
    uniqueIdentifier: undefined,
  };

  if (clonedField.fields && Array.isArray(clonedField.fields)) {
    clonedField.fields = clonedField.fields.map((f) => cloneFieldWithNewIds(f));
  }

  if (clonedField.optionConfigs && Array.isArray(clonedField.optionConfigs)) {
    clonedField.optionConfigs = clonedField.optionConfigs.map((oc) => {
      if (oc.nestedForm) {
        return {
          ...oc,
          nestedForm: {
            ...oc.nestedForm,
            id: generateUUID(),
            fields: oc.nestedForm.fields.map((f) => cloneFieldWithNewIds(f)),
          },
        };
      }
      return oc;
    });
  }

  return clonedField;
}

/**
 * Creates a new field with default values based on type
 * Single responsibility: Field creation logic
 */
export function createNewField(fieldType: FormField['type']): FormField {
  const isContentField = fieldType === 'rich_text';

  const baseField: FormField = {
    id: generateUUID(),
    type: fieldType,
    label: isContentField
      ? 'Rich Text'
      : `${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field`,
    required: false,
    isHidden: false,
    placeholder: isContentField ? undefined : `Enter ${fieldType}...`,
  };

  // Add type-specific properties
  return {
    ...baseField,
    ...getTypeSpecificProperties(fieldType),
  };
}

/**
 * Get type-specific properties for a field
 * Single responsibility: Field type configuration
 */
function getTypeSpecificProperties(
  fieldType: FormField['type'],
): Partial<FormField> {
  switch (fieldType) {
    case 'select':
    case 'multi_select':
    case 'radio':
    case 'checkbox':
      return { options: ['Option 1', 'Option 2'] };

    case 'matrix':
      return {
        matrixRows: ['Row 1', 'Row 2'],
        matrixColumns: ['Column 1', 'Column 2'],
      };

    case 'range':
      return {
        rangeMode: 'single',
        rangeMin: 1,
        rangeMax: 10,
        rangeStep: 1,
        rangeMinLabel: 'Poor',
        rangeMaxLabel: 'Excellent',
      };

    case 'rating':
      return {
        ratingMax: 5,
      };

    case 'date':
      return {
        dateUseNepaliCalendar: false,
      };

    case 'rich_text':
      return { content: '<p></p>' };

    case 'array':
      return { fields: [], minItems: 0 };

    case 'step_section':
      return {
        fields: [],
        isExpanded: true,
        stepNumber: 1,
        stepDescription: '',
      };

    case 'ui_section':
      return {
        fields: [],
        isExpanded: true,
        layoutType: 'grid',
        gridColumns: 2,
        gap: 16,
        alignItems: 'start',
        justifyContent: 'start',
      };

    case 'calculated':
      return { formula: '' };

    case 'map':
      return {
        mapDrawingMode: 'coordinate',
        mapCoordinates: [],
        calculatedArea: 0,
        calculatedLength: 0,
        mapCenter: [27.7172, 85.324], // Default to Kathmandu, Nepal
        mapZoom: 13,
        areaUnit: 'm²',
        lengthUnit: 'm',
      };

    case 'table':
      return {
        tableColumns: [
          { id: 'col1', label: 'Column 1', type: 'text' as const },
          { id: 'col2', label: 'Column 2', type: 'number' as const },
        ],
        tableColumnGroups: [],
        showTableFooter: true,
        tableMode: 'dynamic',
        minItems: 0,
      };

    case 'media':
      return {
        maxFiles: 1,
        blockedExtensions: ['.rar', '.zip'], // Default blocked extensions for security
      };

    default:
      return {};
  }
}

/**
 * Creates a new step section field
 * Single responsibility: Step section creation
 */
export function createStepSection(stepNumber: number): FormField {
  return {
    id: generateUUID(),
    type: 'step_section',
    label: `Step ${stepNumber}`,
    required: false,
    isHidden: false,
    isExpanded: true,
    stepNumber: stepNumber,
    stepDescription: '',
    fields: [],
  };
}

/**
 * Creates a new UI section field
 * Single responsibility: UI section creation
 */
export function createUISection(sectionNumber: number): FormField {
  return {
    id: generateUUID(),
    type: 'ui_section',
    label: `UI Section ${sectionNumber}`,
    required: false,
    isHidden: false,
    isExpanded: true,
    layoutType: 'grid',
    gridColumns: 2,
    gap: 16,
    alignItems: 'start',
    justifyContent: 'start',
    fields: [],
  };
}

/**
 * Check if a field type can contain nested fields
 * Single responsibility: Type checking
 */
export function isContainerField(field: FormField): boolean {
  return (
    field.type === 'step_section' ||
    field.type === 'ui_section' ||
    field.type === 'array' ||
    field.type === 'table'
  );
}

/**
 * Check if a field type needs options
 * Single responsibility: Type checking
 */
export function needsOptions(fieldType: FormField['type']): boolean {
  return ['select', 'multi_select', 'radio', 'checkbox'].includes(fieldType);
}

/**
 * Check if a field is a content field (not for data collection)
 * Single responsibility: Type checking
 */
export function isContentField(fieldType: FormField['type']): boolean {
  return fieldType === 'rich_text';
}

/**
 * Recursively find a field by ID in nested structure
 * Single responsibility: Field lookup
 */
export function findFieldById(
  fields: FormField[],
  targetId: string,
): FormField | undefined {
  for (const field of fields) {
    if (field.id === targetId) {
      return field;
    }

    if (isContainerField(field) && field.fields) {
      const found = findFieldById(field.fields, targetId);
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * Recursively update a field by ID
 * Single responsibility: Field update
 */
export function updateFieldById(
  fields: FormField[],
  targetId: string,
  updates: Partial<FormField>,
): FormField[] {
  return fields.map((field) => {
    if (field.id === targetId) {
      return { ...field, ...updates };
    }

    if (isContainerField(field) && field.fields) {
      return {
        ...field,
        fields: updateFieldById(field.fields, targetId, updates),
      };
    }

    return field;
  });
}

/**
 * Recursively delete a field by ID
 * Single responsibility: Field deletion
 */
export function deleteFieldById(
  fields: FormField[],
  targetId: string,
): FormField[] {
  return fields
    .filter((field) => field.id !== targetId)
    .map((field) => {
      if (isContainerField(field) && field.fields) {
        return {
          ...field,
          fields: deleteFieldById(field.fields, targetId),
        };
      }
      return field;
    });
}

/**
 * Add a field to a container (section or array)
 * Single responsibility: Field addition to container
 */
export function addFieldToContainer(
  fields: FormField[],
  containerId: string,
  newField: FormField,
): FormField[] {
  return fields.map((field) => {
    if (field.id === containerId && isContainerField(field)) {
      return {
        ...field,
        fields: [...(field.fields || []), newField],
      };
    }

    if (isContainerField(field) && field.fields) {
      return {
        ...field,
        fields: addFieldToContainer(field.fields, containerId, newField),
      };
    }

    return field;
  });
}

/**
 * Count step sections in field array
 * Single responsibility: Step section counting
 */
export function countStepSections(fields: FormField[]): number {
  return fields.filter((f) => f.type === 'step_section').length;
}

/**
 * Count UI sections in field array
 * Single responsibility: UI section counting
 */
export function countUISections(fields: FormField[]): number {
  return fields.filter((f) => f.type === 'ui_section').length;
}

/**
 * Count all sections (both types) in field array
 * Single responsibility: Total section counting
 */
export function countAllSections(fields: FormField[]): number {
  return fields.filter(
    (f) => f.type === 'step_section' || f.type === 'ui_section',
  ).length;
}

/**
 * Move field within the same array
 * Single responsibility: Field reordering
 */
export function moveField(
  fields: FormField[],
  fromIndex: number,
  toIndex: number,
): FormField[] {
  const newFields = [...fields];
  const [removed] = newFields.splice(fromIndex, 1);
  newFields.splice(toIndex, 0, removed);
  return newFields;
}

/**
 * Recursively find and remove a field from anywhere in the tree
 * Returns the updated fields and the removed field
 */
function removeFieldById(
  fields: FormField[],
  fieldId: string,
): { updatedFields: FormField[]; removedField: FormField | null } {
  let removedField: FormField | null = null;

  const updatedFields = fields
    .map((field) => {
      if (field.id === fieldId) {
        removedField = field;
        return null; // Mark for removal
      }

      if (isContainerField(field) && field.fields) {
        const { updatedFields: newFields, removedField: found } =
          removeFieldById(field.fields, fieldId);
        if (found) {
          removedField = found;
          return { ...field, fields: newFields };
        }
      }

      return field;
    })
    .filter((field): field is FormField => field !== null);

  return { updatedFields, removedField: removedField || null };
}

/**
 * Recursively add a field to a container anywhere in the tree
 */
function addFieldToContainerById(
  fields: FormField[],
  containerId: string,
  newField: FormField,
  toIndex: number,
): FormField[] {
  return fields.map((field) => {
    if (field.id === containerId && isContainerField(field)) {
      const newFields = [...(field.fields || [])];
      newFields.splice(toIndex, 0, newField);
      return { ...field, fields: newFields };
    }

    if (isContainerField(field) && field.fields) {
      return {
        ...field,
        fields: addFieldToContainerById(
          field.fields,
          containerId,
          newField,
          toIndex,
        ),
      };
    }

    return field;
  });
}

/**
 * Move a field from anywhere to anywhere in the field tree
 * Handles moves from top-level to nested, nested to nested, and nested to top-level
 */
export function moveFieldRecursive(
  fields: FormField[],
  fieldId: string,
  toSectionId: string,
  toIndex: number,
): FormField[] {
  // First, find and remove the field from anywhere in the tree
  const { updatedFields, removedField } = removeFieldById(fields, fieldId);

  if (!removedField) {
    return fields; // Field not found, return original
  }

  // Handle move to top level (root)
  if (toSectionId === 'root' || toSectionId === null) {
    const finalFields = [...updatedFields];
    finalFields.splice(toIndex, 0, removedField);
    return finalFields;
  }

  // Then, add it to the target section
  return addFieldToContainerById(
    updatedFields,
    toSectionId,
    removedField,
    toIndex,
  );
}
