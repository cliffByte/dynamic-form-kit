import { create } from 'zustand';
import { FormField } from '../../../types/form';
import { EnhancedFormSubmission } from '../../../types/submission';
import {
  createNewField,
  createStepSection,
  countStepSections,
  isContainerField,
  findFieldById,
  updateFieldById,
  deleteFieldById,
  addFieldToContainer,
  moveField,
  moveFieldRecursive,
  cloneFieldWithNewIds,
} from '../../../lib/fieldOperations';

export interface FormBuilderState {
  fields: FormField[];
  selectedFieldId: string | null;
  enhancedSubmission: EnhancedFormSubmission | null;
  setFields: (fields: FormField[]) => void;
  setSelectedFieldId: (id: string | null) => void;
  setEnhancedSubmission: (submission: EnhancedFormSubmission | null) => void;

  // Field operations
  addSection: () => void;
  addField: (fieldType: FormField['type']) => void;
  addFieldFromTemplate: (template: FormField | FormField[]) => void;
  addFieldToSection: (sectionId: string, fieldType: FormField['type']) => void;
  addFieldFromTemplateToSection: (
    sectionId: string,
    template: FormField | FormField[],
  ) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  deleteField: (fieldId: string) => void;
  moveField: (dragIndex: number, hoverIndex: number) => void;
  moveFieldBetweenSections: (
    fieldId: string,
    fromSectionId: string | null,
    toSectionId: string,
    toIndex: number,
  ) => void;

  // Field selection
  selectField: (fieldId: string) => void;
  clearSelection: () => void;

  // Get selected field
  getSelectedField: () => FormField | undefined;

  // Initialize with default section
  initializeDefaultSection: () => void;

  // Reset entire store
  resetStore: () => void;
}

export const useFormBuilderStore = create<FormBuilderState>((set, get) => ({
  fields: [],
  selectedFieldId: null,
  enhancedSubmission: null,

  setFields: (fields) => set({ fields }),
  setSelectedFieldId: (id) => set({ selectedFieldId: id }),
  setEnhancedSubmission: (submission) =>
    set({ enhancedSubmission: submission }),

  selectField: (fieldId) => set({ selectedFieldId: fieldId }),
  clearSelection: () => set({ selectedFieldId: null }),

  resetStore: () =>
    set({
      fields: [],
      selectedFieldId: null,
      enhancedSubmission: null,
    }),

  getSelectedField: () => {
    const { fields, selectedFieldId } = get();
    if (!selectedFieldId) return undefined;
    return findFieldById(fields, selectedFieldId);
  },

  initializeDefaultSection: () => {
    const { fields } = get();
    if (fields.length === 0) {
      const defaultSection = createStepSection(1);
      set({ fields: [defaultSection] });
    }
  },

  addSection: () => {
    const { fields } = get();
    const sectionCount = countStepSections(fields);
    const newSection = createStepSection(sectionCount + 1);
    set({ fields: [...fields, newSection] });
  },

  addField: (fieldType) => {
    const { fields } = get();
    const newField = createNewField(fieldType);
    set({ fields: [...fields, newField] });
  },

  addFieldFromTemplate: (template) => {
    const { fields } = get();
    if (Array.isArray(template)) {
      const newFields = template.map((f) => cloneFieldWithNewIds(f));
      set({ fields: [...fields, ...newFields] });
    } else {
      const newField = cloneFieldWithNewIds(template);
      set({ fields: [...fields, newField] });
    }
  },

  addFieldToSection: (sectionId, fieldType) => {
    const { fields } = get();
    const newField = createNewField(fieldType);
    const updatedFields = addFieldToContainer(fields, sectionId, newField);
    set({ fields: updatedFields });
  },

  addFieldFromTemplateToSection: (sectionId, template) => {
    const { fields } = get();
    if (Array.isArray(template)) {
      let currentFields = fields;
      template.forEach((f) => {
        const newField = cloneFieldWithNewIds(f);
        currentFields = addFieldToContainer(currentFields, sectionId, newField);
      });
      set({ fields: currentFields });
    } else {
      const newField = cloneFieldWithNewIds(template);
      const updatedFields = addFieldToContainer(fields, sectionId, newField);
      set({ fields: updatedFields });
    }
  },

  updateField: (fieldId, updates) => {
    const { fields } = get();
    const updatedFields = updateFieldById(fields, fieldId, updates);
    set({ fields: updatedFields });
  },

  deleteField: (fieldId) => {
    const { fields, selectedFieldId } = get();
    const updatedFields = deleteFieldById(fields, fieldId);
    set({ fields: updatedFields });

    if (selectedFieldId === fieldId) {
      set({ selectedFieldId: null });
    }
  },

  moveField: (dragIndex, hoverIndex) => {
    const { fields } = get();
    const reorderedFields = moveField(fields, dragIndex, hoverIndex);
    set({ fields: reorderedFields });
  },

  moveFieldBetweenSections: (fieldId, fromSectionId, toSectionId, toIndex) => {
    const { fields } = get();
    // Use recursive move function which handles moves from anywhere (including top-level) to anywhere
    const updatedFields = moveFieldRecursive(
      fields,
      fieldId,
      toSectionId,
      toIndex,
    );
    set({ fields: updatedFields });
  },
}));
