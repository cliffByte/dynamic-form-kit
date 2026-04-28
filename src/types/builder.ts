import { FormField } from './form';

export interface DragItemField {
  type: 'form-field';
  index: number;
  fieldId: string;
  sectionId: string | null;
  isSection?: boolean;
}

export interface DragItemPalette {
  type: 'field';
  fieldType: FormField['type'];
}

export interface ReorderOperation {
  shouldReorder: boolean;
  fromIndex: number;
  toIndex: number;
}
