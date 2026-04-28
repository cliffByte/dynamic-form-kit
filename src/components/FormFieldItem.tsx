'use client';

import React, { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import { FormField } from '../types/form';
import { AlertModal } from './AlertModal';
import { FieldPreview } from './FieldPreview';
import { useLocalizedField } from '../hooks/useLocalizedField';

interface FormFieldItemProps {
  field: FormField;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onFieldMove?: (
    fieldId: string,
    fromSectionId: string | null,
    toSectionId: string,
    toIndex: number,
  ) => void;
  parentSectionId?: string; // Optional parent section ID for nested fields
}

export const FormFieldItem = React.memo(function FormFieldItem({
  field,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onMove,
  onFieldMove,
  parentSectionId,
}: FormFieldItemProps) {
  const localizedField = useLocalizedField(field) || field;
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(localizedField.label);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: 'form-field',
    item: {
      index,
      fieldId: field.id,
      sectionId: parentSectionId || null,
      fieldType: field.type,
      isSection: false,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'form-field',
    hover: (draggedItem: {
      index: number;
      sectionId?: string | null;
      isSection?: boolean;
    }) => {
      // Don't handle if it's a section being dragged
      if (draggedItem.isSection) {
        return;
      }

      // Handle reordering within the same section level
      // Normalize null/undefined to null for comparison
      const draggedSectionId = draggedItem.sectionId ?? null;
      const targetSectionId = parentSectionId ?? null;
      const isSameLevel = draggedSectionId === targetSectionId;

      if (isSameLevel && draggedItem.index !== index) {
        onMove(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
    canDrop: (item) => {
      // Allow drop for fields being reordered at the same level
      // Don't allow sections to be dropped on fields
      return !item.isSection;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const handleLabelEdit = () => {
    if (editLabel.trim()) {
      onUpdate({ label: editLabel.trim() });
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLabelEdit();
    } else if (e.key === 'Escape') {
      setEditLabel(localizedField.label);
      setIsEditing(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteModal(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  // Check if conditional rules are incomplete
  const hasIncompleteConditionalRules =
    field.conditionalRules &&
    field.conditionalRules.length > 0 &&
    field.conditionalRules.some((rule) => !rule.fieldId || !rule.value.trim());

  return (
    <div
      ref={(node) => drag(drop(node)) as any}
      className={`group relative form-field p-4 border rounded-lg bg-card cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-primary shadow-sm ring-2 ring-primary/20 bg-primary/5'
          : 'border-border hover:border-primary/50 hover:shadow-sm'
      } ${isDragging ? 'opacity-50' : ''} ${
        isOver ? 'border-primary bg-primary/5' : ''
      }`}
      onClick={(e) => {
        // Prevent selection during drag operations
        if (isDragging) return;
        e.stopPropagation();
        onSelect();
      }}>
      {/* Selected indicator */}
      {isSelected && (
        <div className='absolute -left-1 top-0 bottom-0 w-1 bg-primary rounded-sm'></div>
      )}

      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2.5'>
          <div
            className={`transition-colors cursor-grab ${isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>
            <GripVertical className='w-4 h-4' />
          </div>
          {isEditing ? (
            <input
              type='text'
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={handleLabelEdit}
              onKeyDown={handleKeyPress}
              className='font-semibold text-foreground bg-transparent border-b-2 border-primary outline-none focus:ring-0'
              autoFocus
            />
          ) : (
            <span
              className='font-semibold text-foreground cursor-pointer hover:text-primary transition-colors'
              onDoubleClick={() => setIsEditing(true)}>
              {localizedField.label}
              {localizedField.required && (
                <span className='text-destructive ml-1'>*</span>
              )}
            </span>
          )}
        </div>
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick();
          }}
          className='text-destructive hover:text-destructive/80 p-1.5 hover:bg-destructive/10 rounded transition-colors'>
          <Trash2 className='w-4 h-4' />
        </button>
      </div>

      <div className='mb-3 pt-3 border-t border-border'>
        <FieldPreview field={localizedField} onSelect={onSelect} />
      </div>

      <div className='flex items-center gap-2 text-xs pt-3 border-t border-border'>
        <span className='px-2 py-0.5 bg-muted/50 rounded text-muted-foreground'>
          {field.type.replace('_', ' ').charAt(0).toUpperCase() +
            field.type.replace('_', ' ').slice(1)}
        </span>
        {field.required && (
          <span className='px-2 py-0.5 bg-destructive/10 text-destructive rounded'>
            Required
          </span>
        )}
        {field.isHidden && (
          <span className='px-2 py-0.5 bg-muted/50 text-muted-foreground rounded'>
            Hidden
          </span>
        )}
        {hasIncompleteConditionalRules && (
          <span
            className='px-2 py-0.5 bg-amber-100 text-amber-800 rounded flex items-center gap-1'
            title='Conditional rendering is not properly configured. Please configure the field and value in the field editor.'>
            <AlertTriangle className='w-3 h-3' />
            Conditional Not Configured
          </span>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertModal
        open={showDeleteModal}
        title='Delete Field'
        description={`Are you sure you want to delete the field "${field.label}"? This action cannot be undone.`}
        onAccept={handleDeleteConfirm}
        onClose={handleDeleteCancel}
        acceptText='Delete Field'
      />
    </div>
  );
});
