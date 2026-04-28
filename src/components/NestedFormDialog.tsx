'use client';

import { useState, useEffect } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { X } from 'lucide-react';
import { Card } from './ui/card';
import { FormField, NestedForm } from '../types/form';
import { NestedFieldPalette } from './NestedFieldPalette';
import { FormCanvas } from './FormCanvas';
import { FieldEditor } from './formbuilder/features/field-editor/FieldEditor';
import { generateUUID } from '../lib/utils';

interface NestedFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nestedForm: NestedForm | null;
  onSave: (nestedForm: NestedForm) => void;
}

export function NestedFormDialog({
  isOpen,
  onClose,
  nestedForm,
  onSave,
}: NestedFormDialogProps) {
  const [formName, setFormName] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  useEffect(() => {
    if (nestedForm) {
      setFormName(nestedForm.name);
      setFields(nestedForm.fields);
    } else {
      setFormName('');
      setFields([]);
    }
    setSelectedFieldId(null);
  }, [nestedForm, isOpen]);

  const handleSave = () => {
    // if (!formName.trim()) {
    //   return
    // }

    const updatedNestedForm: NestedForm = {
      id: nestedForm?.id || generateUUID(),
      name: formName.trim(),
      fields,
    };

    onSave(updatedNestedForm);
    onClose();
  };

  const moveField = (dragIndex: number, hoverIndex: number) => {
    const draggedField = fields[dragIndex];
    const newFields = [...fields];
    newFields.splice(dragIndex, 1);
    newFields.splice(hoverIndex, 0, draggedField);
    setFields(newFields);
  };

  const addField = (fieldType: FormField['type']) => {
    // Block restricted types from being added to nested forms
    if (
      fieldType === 'ui_section' ||
      fieldType === 'step_section' ||
      fieldType === 'array'
    ) {
      return;
    }

    const newField = createNewField(fieldType);
    setFields([...fields, newField]);
  };

  const createNewField = (fieldType: FormField['type']): FormField => {
    return {
      id: generateUUID(),
      type: fieldType,
      label: `New ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field`,
      required: false,
      isHidden: false,
      placeholder:
        fieldType === 'rich_text' ||
        fieldType === 'array' ||
        fieldType === 'step_section' ||
        fieldType === 'ui_section'
          ? undefined
          : `Enter ${fieldType}...`,
      ...(fieldType === 'rich_text' ? { content: '<p></p>' } : {}),
      ...(fieldType === 'array' ||
      fieldType === 'step_section' ||
      fieldType === 'ui_section'
        ? { fields: [] }
        : {}),
      ...(fieldType === 'step_section'
        ? { stepNumber: 1, stepDescription: '', isExpanded: true }
        : {}),
      ...(fieldType === 'ui_section'
        ? {
            layoutType: 'grid' as const,
            gridColumns: 2,
            gap: 16,
            alignItems: 'start' as const,
            justifyContent: 'start' as const,
            isExpanded: true,
          }
        : {}),
      ...(fieldType === 'select' ||
      fieldType === 'radio' ||
      fieldType === 'checkbox' ||
      fieldType === 'multi_select'
        ? { options: ['Option 1', 'Option 2'] }
        : {}),
      ...(fieldType === 'rating' ? { ratingMax: 5 } : {}),
      ...(fieldType === 'range'
        ? {
            rangeMin: 0,
            rangeMax: 100,
            rangeStep: 1,
            rangeMode: 'single',
          }
        : {}),
      ...(fieldType === 'date' ? { dateMode: 'single' } : {}),
      ...(fieldType === 'calculated' ? { formula: '' } : {}),
    };
  };

  const handleAddFieldToSection = (
    sectionId: string,
    fieldType: FormField['type'],
  ) => {
    // Block restricted types from being added to nested forms
    if (
      fieldType === 'ui_section' ||
      fieldType === 'step_section' ||
      fieldType === 'array'
    ) {
      return;
    }

    const newField = createNewField(fieldType);

    const addRecursive = (list: FormField[]): FormField[] => {
      return list.map((field) => {
        if (field.id === sectionId) {
          return { ...field, fields: [...(field.fields || []), newField] };
        }
        if (field.fields) {
          return { ...field, fields: addRecursive(field.fields) };
        }
        return field;
      });
    };

    setFields(addRecursive(fields));
  };

  // Helper to update a field recursively
  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    const updateRecursive = (list: FormField[]): FormField[] => {
      return list.map((field) => {
        if (field.id === fieldId) {
          return { ...field, ...updates };
        }
        if (field.fields) {
          return { ...field, fields: updateRecursive(field.fields) };
        }
        return field;
      });
    };
    setFields(updateRecursive(fields));
  };

  // Helper to delete a field recursively
  const deleteField = (fieldId: string) => {
    const deleteRecursive = (list: FormField[]): FormField[] => {
      return list
        .filter((field) => field.id !== fieldId)
        .map((field) => {
          if (field.fields) {
            return { ...field, fields: deleteRecursive(field.fields) };
          }
          return field;
        });
    };
    setFields(deleteRecursive(fields));

    // Also clear selection if the deleted field was selected
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  // Helper to find a field recursively (for selection)
  const findField = (list: FormField[], id: string): FormField | undefined => {
    for (const field of list) {
      if (field.id === id) return field;
      if (field.fields) {
        const found = findField(field.fields, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const selectedField = selectedFieldId
    ? findField(fields, selectedFieldId)
    : undefined;

  const handleMoveFieldBetweenSections = (
    fieldId: string,
    fromSectionId: string | null,
    toSectionId: string,
    toIndex: number,
  ) => {
    // 1. Find and remove the field
    let movedField: FormField | undefined;

    const removeRecursive = (list: FormField[]): FormField[] => {
      const result: FormField[] = [];
      for (const f of list) {
        if (f.id === fieldId) {
          movedField = f;
          continue;
        }
        if (f.fields) {
          result.push({ ...f, fields: removeRecursive(f.fields) });
        } else {
          result.push(f);
        }
      }
      return result;
    };

    const fieldsWithoutMoved = removeRecursive(fields);

    if (!movedField) return;

    // 2. Insert into new location
    const insertRecursive = (list: FormField[]): FormField[] => {
      return list.map((f) => {
        if (f.id === toSectionId) {
          const newChildren = [...(f.fields || [])];
          newChildren.splice(toIndex, 0, movedField!);
          return { ...f, fields: newChildren };
        }
        if (f.fields) {
          return { ...f, fields: insertRecursive(f.fields) };
        }
        return f;
      });
    };

    // If adding to root, likely distinct but SectionField usually receives 'toSectionId' as the section ID dropped into.
    // This handler specifically handles moving INTO a section.

    setFields(insertRecursive(fieldsWithoutMoved));
  };

  // Drop functionality for adding new fields
  const [{ isOver }, drop] = useDrop({
    accept: 'field',
    drop: (item: { type: string; fieldType: FormField['type'] }) => {
      // Block restricted types from being added to nested forms
      if (
        item.fieldType === 'ui_section' ||
        item.fieldType === 'step_section' ||
        item.fieldType === 'array'
      ) {
        return;
      }
      addField(item.fieldType);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Create a ref callback that handles both the drop target and the DOM ref
  const dropRef = (node: HTMLDivElement | null) => {
    drop(node);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg shadow-xl w-screen h-screen flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b'>
          <div className='flex-1'>
            <h2 className='text-2xl font-bold text-gray-900'>
              {nestedForm ? 'Edit Nested Form' : 'Add Nested Form'}
            </h2>
            <div className='mt-2'>
              <input
                type='text'
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder='Enter nested form name'
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='ml-4 p-2 text-gray-400 hover:text-gray-600'>
            <X className='w-6 h-6' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 flex overflow-hidden bg-gray-50/50 p-4'>
          <DndProvider backend={HTML5Backend}>
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden w-full'>
              {/* Field Palette */}
              <div className='lg:col-span-2 h-full overflow-hidden'>
                <div className='h-full overflow-y-auto custom-scrollbar pr-2'>
                  <NestedFieldPalette />
                </div>
              </div>

              {/* Form Canvas */}
              <div className='lg:col-span-7 h-full overflow-hidden'>
                <div className='h-full overflow-y-auto custom-scrollbar pr-2'>
                  <Card className='border-border shadow-sm h-fit'>
                    <div className='pb-3 px-4 pt-4 border-b border-border bg-muted/30'>
                      <div className='flex items-center gap-2'>
                        <h3 className='text-base font-semibold'>Form Canvas</h3>
                      </div>
                      <p className='text-xs text-muted-foreground mt-1'>
                        Drag and drop fields to build your nested form
                      </p>
                    </div>
                    <div className='p-4'>
                      <div
                        ref={dropRef}
                        className={`transition-all duration-200 rounded-lg ${
                          isOver
                            ? 'bg-primary/5 ring-2 ring-primary ring-inset'
                            : ''
                        }`}>
                        <FormCanvas
                          fields={fields}
                          selectedFieldId={selectedFieldId}
                          onFieldSelect={setSelectedFieldId}
                          onFieldUpdate={updateField}
                          onFieldDelete={deleteField}
                          onFieldMove={moveField}
                          onFieldAdd={handleAddFieldToSection}
                          onFieldMoveBetweenSections={
                            handleMoveFieldBetweenSections
                          }
                          isBuilder={true}
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Field Editor */}
              <div className='lg:col-span-3 h-full overflow-hidden'>
                <div className='h-full overflow-y-auto custom-scrollbar pl-2'>
                  <Card className='border-border shadow-sm h-fit'>
                    <div className='pb-3 px-4 pt-4 border-b border-border bg-muted/30'>
                      <div className='flex items-center gap-2'>
                        <h3 className='text-base font-semibold'>
                          Field Properties
                        </h3>
                      </div>
                      <p className='text-xs text-muted-foreground mt-1'>
                        {selectedField
                          ? 'Edit the selected field properties'
                          : 'Select a field to edit'}
                      </p>
                    </div>
                    <div className='p-4'>
                      <FieldEditor
                        field={selectedField}
                        onFieldUpdate={(updates) => {
                          if (selectedFieldId) {
                            updateField(selectedFieldId, updates);
                          }
                        }}
                        allFields={fields}
                      />
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </DndProvider>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 p-4 border-t bg-gray-50'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50'>
            Cancel
          </button>
          <button
            type='button'
            onClick={handleSave}
            className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'>
            {nestedForm ? 'Update Nested Form' : 'Create Nested Form'}
          </button>
        </div>
      </div>
    </div>
  );
}
