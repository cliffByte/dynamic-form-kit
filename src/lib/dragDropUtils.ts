import { FormField } from '../types/form';
import {
  DragItemField,
  DragItemPalette,
  ReorderOperation,
} from '../types/builder';

/**
 * Check if drag item is a section reorder
 * Single responsibility: Drag item type checking
 */
export function isSectionReorder(itemType: string | null, item: any): boolean {
  return itemType === 'form-field' && item.isSection === true;
}

/**
 * Check if drag item is from palette
 * Single responsibility: Drag item type checking
 */
export function isFromPalette(itemType: string | null): boolean {
  return itemType === 'field';
}

/**
 * Check if drag item is existing field
 * Single responsibility: Drag item type checking
 */
export function isExistingField(itemType: string | null): boolean {
  return itemType === 'form-field';
}

/**
 * Allowed field types that can be dropped into array fields
 * Single responsibility: Define allowed field types for arrays
 */
const ALLOWED_ARRAY_FIELD_TYPES: FormField['type'][] = [
  'text',
  'email',
  'phone',
  'number',
  'textarea',
  'select',
  'multi_select',
  'checkbox',
  'radio',
  'matrix',
  'range',
  'rating',
  'date',
  'media',
  'calculated',
  'rich_text', // Content block (static content)
];

/**
 * Check if a field type can be dropped into a container
 * Single responsibility: Drop validation
 *
 * Nesting rules:
 * - array: can only contain explicitly allowed field types (text, email, number, textarea, select, etc.)
 * - step_section: can contain ui_section, arrays, and regular fields (NOT other step_sections)
 * - ui_section: can only contain arrays and regular fields (NO section types)
 */
export function canDropIntoContainer(
  containerType: 'step_section' | 'ui_section' | 'array',
  droppedFieldType: FormField['type'],
): boolean {
  // Arrays can only contain explicitly allowed field types
  if (containerType === 'array') {
    return ALLOWED_ARRAY_FIELD_TYPES.includes(droppedFieldType);
  }

  // step_section can contain ui_section, arrays, and regular fields (but NOT other step_sections)
  if (containerType === 'step_section') {
    if (droppedFieldType === 'step_section') {
      return false; // Don't allow step_section inside step_section
    }
    return true; // Allow ui_section, arrays, and regular fields
  }

  // ui_section can only contain arrays and regular fields (NO section types)
  if (containerType === 'ui_section') {
    if (
      droppedFieldType === 'step_section' ||
      droppedFieldType === 'ui_section'
    ) {
      return false; // Don't allow any sections inside ui_section
    }
    return true; // Allow arrays and regular fields
  }

  return true;
}
/**
 * Check if a field type can be added to the root level of the canvas
 *
 * Rules:
 * - If root level contains a step_section, only other step_sections can be added
 * - If root level contains anything else, step_sections cannot be added
 */
export function canAddToRoot(
  fields: FormField[],
  fieldTypeToAdd: FormField['type'],
): boolean {
  if (fields.length === 0) return true;

  const hasStepSection = fields.some((f) => f.type === 'step_section');
  const hasNonStepField = fields.some((f) => f.type !== 'step_section');

  if (fieldTypeToAdd === 'step_section') {
    return !hasNonStepField;
  } else {
    return !hasStepSection;
  }
}
/**
 * Check if field is being moved within same section
 * Single responsibility: Move validation
 */
export function isMovingWithinSameSection(
  draggedSectionId: string | null | undefined,
  targetSectionId: string | null | undefined,
): boolean {
  return draggedSectionId === targetSectionId;
}

/**
 * Calculate hover index in a field list
 * Single responsibility: Index calculation for drag operations
 */
export function calculateHoverIndex(
  fields: FormField[],
  hoveredFieldId: string,
): number {
  return fields.findIndex((f) => f.id === hoveredFieldId);
}

/**
 * Handles field reordering logic
 * Single responsibility: Reorder operation
 */
export function getReorderOperation(
  dragIndex: number,
  hoverIndex: number,
): ReorderOperation {
  if (hoverIndex === -1 || dragIndex === hoverIndex) {
    return { shouldReorder: false, fromIndex: dragIndex, toIndex: hoverIndex };
  }

  return { shouldReorder: true, fromIndex: dragIndex, toIndex: hoverIndex };
}
