'use client';

import React from 'react';
import { useDrop } from 'react-dnd';
import { FormField } from '../types/form';
import { FormFieldItem } from './FormFieldItem';
import { SectionField } from './SectionField';
import { canAddToRoot } from '../lib/dragDropUtils';

interface FormCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  onFieldUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldMove: (dragIndex: number, hoverIndex: number) => void;
  onFieldAdd: (sectionId: string, fieldType: FormField['type']) => void;
  onTemplateAdd?: (
    sectionId: string,
    template: FormField | FormField[],
  ) => void;
  onFieldMoveBetweenSections: (
    fieldId: string,
    fromSectionId: string | null,
    toSectionId: string,
    toIndex: number,
  ) => void;
  isBuilder?: boolean;
}

export const FormCanvas = React.memo(function FormCanvas({
  fields,
  selectedFieldId,
  onFieldSelect,
  onFieldUpdate,
  onFieldDelete,
  onFieldMove,
  onFieldAdd,
  onTemplateAdd,
  onFieldMoveBetweenSections,
}: FormCanvasProps) {
  // Drop zone container for the canvas - individual items handle their own hover logic
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'form-field',
    canDrop: (item: {
      fieldId: string;
      fieldType: FormField['type'];
      isSection: boolean;
      sectionId: string | null;
    }) => {
      // If dropping back to root level, enforce root constraints
      return canAddToRoot(fields, item.fieldType);
    },
    drop: (
      item: {
        fieldId: string;
        fieldType: FormField['type'];
        isSection: boolean;
        sectionId: string | null;
      },
      monitor,
    ) => {
      // Only handle drops directly on this container, not on child sections
      if (!monitor.isOver({ shallow: true })) {
        return;
      }

      // If it's already at the root level, do nothing (reordering is handled by hovers)
      if (item.sectionId === null) {
        return;
      }

      // Move field from its current section to the end of top-level fields
      onFieldMoveBetweenSections(
        item.fieldId,
        item.sectionId,
        'root',
        fields.length,
      );
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={drop as any}
      className={`space-y-4 min-h-[400px] transition-all duration-200 ${
        isOver
          ? canDrop
            ? 'bg-primary/5 ring-2 ring-primary ring-inset rounded-lg'
            : 'bg-destructive/5 ring-2 ring-destructive ring-inset rounded-lg'
          : ''
      }`}>
      {fields.length === 0 && (
        <div className='flex flex-col items-center justify-center py-20 text-muted-foreground'>
          <p className='text-lg font-medium'>Your form is empty</p>
          <p className='text-sm italic'>
            Drag fields from the palette or use the buttons below
          </p>
        </div>
      )}
      {fields.map((field, index) => {
        if (
          field.type === 'step_section' ||
          field.type === 'ui_section' ||
          field.type === 'array' ||
          field.type === 'table'
        ) {
          return (
            <SectionField
              key={field.id}
              field={field}
              index={index}
              isSelected={selectedFieldId === field.id}
              onSelect={() => onFieldSelect(field.id)}
              onUpdate={(updates) => onFieldUpdate(field.id, updates)}
              onDelete={() => onFieldDelete(field.id)}
              onMove={onFieldMove}
              onFieldMove={onFieldMoveBetweenSections}
              onFieldAdd={onFieldAdd}
              onTemplateAdd={onTemplateAdd}
              allFields={fields}
              selectedFieldId={selectedFieldId}
              onFieldSelect={onFieldSelect}
            />
          );
        } else {
          return (
            <FormFieldItem
              key={field.id}
              field={field}
              index={index}
              isSelected={selectedFieldId === field.id}
              onSelect={() => onFieldSelect(field.id)}
              onUpdate={(updates) => onFieldUpdate(field.id, updates)}
              onDelete={() => onFieldDelete(field.id)}
              onMove={onFieldMove}
              onFieldMove={onFieldMoveBetweenSections}
            />
          );
        }
      })}
    </div>
  );
});
