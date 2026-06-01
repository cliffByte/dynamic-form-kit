'use client';

import React, { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
  LayoutTemplate,
  List,
  ListOrdered,
  LayoutGrid,
  Table2,
  AlertTriangle,
} from 'lucide-react';
import { FormField } from '../types/form';
import { FormFieldItem } from './FormFieldItem';
import { AlertModal } from './AlertModal';
import { useLocalizedField } from '../hooks/useLocalizedField';
import { canDropIntoContainer } from '../lib/dragDropUtils';

interface SectionFieldProps {
  field: FormField;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onFieldMove: (
    fieldId: string,
    fromSectionId: string | null,
    toSectionId: string,
    toIndex: number,
  ) => void;
  onFieldAdd: (sectionId: string, fieldType: FormField['type']) => void;
  onTemplateAdd?: (
    sectionId: string,
    template: FormField | FormField[],
  ) => void;
  allFields: FormField[];
  selectedFieldId?: string | null;
  onFieldSelect?: (fieldId: string) => void;
  parentSectionId?: string; // Parent section ID for nested sections (e.g., ui_section inside step_section)
}

export const SectionField = React.memo(function SectionField({
  field,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onMove,
  onFieldMove,
  onFieldAdd,
  onTemplateAdd,
  allFields,
  selectedFieldId,
  onFieldSelect,
  parentSectionId,
}: SectionFieldProps) {
  const localizedField = useLocalizedField(field) || field;
  const [isExpanded, setIsExpanded] = useState(field.isExpanded ?? true);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(localizedField.label);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: 'form-field',
    item: {
      index,
      fieldId: field.id,
      sectionId: parentSectionId || null, // Parent section ID for nested sections
      fieldType: field.type, // Include field type for validation
      isSection:
        field.type === 'step_section' ||
        field.type === 'ui_section' ||
        field.type === 'array' ||
        field.type === 'table',
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['form-field', 'field'],
    hover: (
      item: {
        index: number;
        fieldId?: string;
        sectionId?: string | null;
        isSection?: boolean;
        fieldType?: FormField['type'];
      },
      monitor,
    ) => {
      // Handle section/array reordering at the same level
      if (monitor.getItemType() === 'form-field' && item.isSection) {
        // Check if the dragged section is at the same level (has the same parent)
        // Normalize undefined to null for comparison
        const draggedParentId = item.sectionId ?? null;
        const targetParentId = parentSectionId ?? null;

        if (draggedParentId === targetParentId) {
          const draggedIndex = item.index;
          const hoverIndex = allFields.findIndex((f) => f.id === field.id);

          // Guard: Prevent invalid indices or same position
          if (hoverIndex === -1 || draggedIndex === hoverIndex) return;

          // Move the section/array at the same level
          onMove(draggedIndex, hoverIndex);
          item.index = hoverIndex;
        }
      }
    },
    canDrop: (item, monitor) => {
      // For tables, don't allow dropping fields (tables use columns, not nested fields)
      if (field.type === 'table') {
        return false;
      }
      // For arrays, use validation function to check if field type is allowed
      if (field.type === 'array') {
        if (monitor.getItemType() === 'field' && item.fieldType) {
          return canDropIntoContainer('array', item.fieldType);
        }
      } else if (field.type === 'step_section') {
        // For step_section, allow ui_section and arrays but NOT other step_sections
        if (
          monitor.getItemType() === 'field' &&
          item.fieldType === 'step_section'
        ) {
          return false; // Don't allow step_section inside step_section
        }
        // Allow ui_section and arrays
        return true;
      } else if (field.type === 'ui_section') {
        // For ui_section, prevent any section types from being dropped (only regular fields and arrays)
        if (
          monitor.getItemType() === 'field' &&
          (item.fieldType === 'step_section' || item.fieldType === 'ui_section')
        ) {
          return false; // Don't allow sections inside ui_section
        }
        return true;
      }
      // Handle moving existing fields between containers
      if (monitor.getItemType() === 'form-field') {
        // Allow reordering within the same container
        if (item.sectionId === field.id) {
          return true;
        }
        // Validate moving fields into containers
        // Type guard: check if field is a container type
        const isContainerType = (
          type: FormField['type'],
        ): type is 'array' | 'step_section' | 'ui_section' => {
          return (
            type === 'array' || type === 'step_section' || type === 'ui_section'
          );
        };

        if (isContainerType(field.type)) {
          // Use fieldType from drag item (available for form-field types)
          if (item.fieldType) {
            return canDropIntoContainer(field.type, item.fieldType);
          }
          // Fallback: try to find in allFields (for compatibility)
          const draggedField = allFields.find((f) => f.id === item.fieldId);
          if (draggedField) {
            return canDropIntoContainer(field.type, draggedField.type);
          }
        }
      }
      return true;
    },
    drop: (
      item: {
        index: number;
        fieldId?: string;
        sectionId?: string | null;
        isSection?: boolean;
        fieldType?: FormField['type'];
        schema?: FormField | FormField[];
      },
      monitor,
    ) => {
      // IMPORTANT: Check if a nested drop target already handled this drop
      // This prevents event bubbling where both parent and child accept the same drop
      if (monitor.didDrop()) {
        return; // A nested component already handled the drop
      }

      if (monitor.getItemType() === 'field') {
        // Validate drop based on container type using validation function
        if (item.fieldType) {
          // Check if field type can be dropped into this container
          if (
            field.type === 'array' ||
            field.type === 'step_section' ||
            field.type === 'ui_section'
          ) {
            if (!canDropIntoContainer(field.type, item.fieldType)) {
              return; // Field type is not allowed in this container
            }
          }
          // Adding a new field or template to this container
          if (item.schema && onTemplateAdd) {
            onTemplateAdd(field.id, item.schema);
          } else {
            onFieldAdd(field.id, item.fieldType);
          }
        }
      } else if (monitor.getItemType() === 'form-field') {
        // Handle section-to-section moves
        if (item.isSection) {
          // Allow ui_section to be moved into step_section (from anywhere, including top-level)
          if (
            field.type === 'step_section' &&
            item.fieldType === 'ui_section'
          ) {
            // Move ui_section from its current location (could be top-level with null sectionId) into this step_section
            onFieldMove(
              item.fieldId!,
              item.sectionId || null,
              field.id,
              field.fields?.length || 0,
            );
            return;
          }
          // For other section moves, handled by hover logic above
          return;
        }

        // Moving an existing field to this section
        const draggedFieldId = item.fieldId;
        const sourceSectionId = item.sectionId;
        const draggedFieldType = item.fieldType;

        if (draggedFieldId && sourceSectionId !== field.id) {
          // Validate if field type can be dropped into this container using the field type from drag item
          if (
            field.type === 'array' ||
            field.type === 'step_section' ||
            field.type === 'ui_section'
          ) {
            // Use fieldType from drag item (available from FormFieldItem drag handler)
            if (
              draggedFieldType &&
              !canDropIntoContainer(field.type, draggedFieldType)
            ) {
              return; // Field type is not allowed in this container
            }
          }

          // Moving from another section (or top-level if sourceSectionId is null) to this section
          onFieldMove(
            draggedFieldId,
            sourceSectionId || null,
            field.id,
            field.fields?.length || 0,
          );
        }
      }
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

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onUpdate({ isExpanded: newExpanded });
  };

  const handleSectionFieldMove = (dragIndex: number, hoverIndex: number) => {
    if (!field.fields) return;

    const draggedField = field.fields[dragIndex];
    const newFields = [...field.fields];
    newFields.splice(dragIndex, 1);
    newFields.splice(hoverIndex, 0, draggedField);

    onUpdate({ fields: newFields });
  };

  const handleNestedFieldMoveBetweenSections = (
    fieldId: string,
    fromSectionId: string | null,
    toSectionId: string,
    toIndex: number,
  ) => {
    if (!field.fields) return;

    let movedField: FormField | undefined;

    // Find and remove the field from the source section
    const updatedFields = field.fields.map((f) => {
      if (
        f.id === fromSectionId &&
        (f.type === 'step_section' ||
          f.type === 'ui_section' ||
          f.type === 'array') &&
        f.fields
      ) {
        const fieldIndex = f.fields.findIndex((nf) => nf.id === fieldId);
        if (fieldIndex !== -1) {
          movedField = f.fields[fieldIndex];
          const newFields = [...f.fields];
          newFields.splice(fieldIndex, 1);
          return { ...f, fields: newFields };
        }
      }
      return f;
    });

    // Add the field to the target section
    if (movedField) {
      const finalFields = updatedFields.map((f) => {
        if (
          f.id === toSectionId &&
          (f.type === 'step_section' ||
            f.type === 'ui_section' ||
            f.type === 'array')
        ) {
          const newFields = [...(f.fields || [])];
          newFields.splice(toIndex, 0, movedField!);
          return { ...f, fields: newFields };
        }
        return f;
      });

      onUpdate({ fields: finalFields });
    } else {
      // If field not found in nested fields, fall back to top-level handler
      onFieldMove(fieldId, fromSectionId, toSectionId, toIndex);
    }
  };

  const handleSectionFieldDelete = (fieldId: string) => {
    if (!field.fields) return;

    const newFields = field.fields.filter((f: FormField) => f.id !== fieldId);
    onUpdate({ fields: newFields });
  };

  const handleSectionFieldUpdate = (
    fieldId: string,
    updates: Partial<FormField>,
  ) => {
    if (!field.fields) return;

    const newFields = field.fields.map((f: FormField) =>
      f.id === fieldId ? { ...f, ...updates } : f,
    );
    onUpdate({ fields: newFields });
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
      className={`form-field p-4 border rounded-lg bg-card cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-primary shadow-sm ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:shadow-sm'
      } ${isDragging ? 'opacity-50' : ''} ${isOver && canDrop ? 'border-primary bg-primary/5' : ''}`}
      onClick={(e) => {
        // Only select section if clicking on the section header area, not on nested fields
        if (
          e.target === e.currentTarget ||
          (e.target as HTMLElement).closest('.section-header')
        ) {
          onSelect();
        }
      }}>
      {/* Section Header */}
      <div className='section-header flex items-center justify-between mb-3 pb-3 border-b border-border'>
        <div className='flex items-center gap-2'>
          <GripVertical className='w-4 h-4 text-muted-foreground hover:text-foreground cursor-grab' />
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            className='p-1 hover:bg-muted rounded transition-colors'>
            {isExpanded ? (
              <ChevronUp className='w-4 h-4 text-muted-foreground' />
            ) : (
              <ChevronDown className='w-4 h-4 text-muted-foreground' />
            )}
          </button>
          {isEditing ? (
            <input
              type='text'
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={handleLabelEdit}
              onKeyDown={handleKeyPress}
              className='font-semibold text-foreground bg-transparent border-none outline-none focus:ring-0'
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
        <div className='flex items-center gap-3'>
          <span className='text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md'>
            {field.fields?.length || 0} field
            {(field.fields?.length || 0) !== 1 ? 's' : ''}
          </span>
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
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div
          className='section-content ml-4 space-y-3'
          onClick={(e) => e.stopPropagation()}>
          {/* Table field - show column preview */}
          {field.type === 'table' &&
          field.tableColumns &&
          field.tableColumns.length > 0 ? (
            <div className='border rounded-lg overflow-hidden'>
              <div className='bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground border-b flex items-center gap-2'>
                <Table2 className='w-3 h-3' />
                Table Columns Preview ({field.tableColumns.length} columns)
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead className='bg-muted/30'>
                    <tr>
                      {field.tableCellDefaults &&
                        field.tableCellDefaults.length > 0 && (
                          <th className='px-3 py-2 text-left font-medium border-r bg-gray-100'>
                            Row
                          </th>
                        )}
                      {field.tableColumns.map((col) => (
                        <th
                          key={col.id}
                          className='px-3 py-2 text-left font-medium border-r last:border-r-0'>
                          <div className='flex flex-col'>
                            <span>{col.label}</span>
                            <span className='text-xs text-muted-foreground font-normal'>
                              {col.type}
                              {col.type === 'calculated' && col.formula && (
                                <span className='ml-1 font-mono'>
                                  ({col.formula})
                                </span>
                              )}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {field.tableCellDefaults &&
                    field.tableCellDefaults.length > 0 ? (
                      // Matrix mode: show rows with default values
                      (() => {
                        const cellDefaults = field.tableCellDefaults || [];
                        const maxRowIndex = Math.max(
                          ...cellDefaults.map((d) => d.rowIndex || 0),
                        );
                        const numRows = maxRowIndex + 1;

                        return Array.from(
                          { length: numRows },
                          (_, rowIndex) => (
                            <tr key={rowIndex} className='bg-white'>
                              <td className='px-3 py-2 border-r font-medium bg-gray-50'>
                                Row {rowIndex + 1}
                              </td>
                              {(field.tableColumns || []).map((col) => {
                                const defaultVal = cellDefaults.find(
                                  (d) =>
                                    d.rowIndex === rowIndex &&
                                    d.columnId === col.id,
                                );
                                return (
                                  <td
                                    key={col.id}
                                    className='px-3 py-2 border-r last:border-r-0 text-muted-foreground/50'>
                                    {defaultVal?.value !== undefined &&
                                    defaultVal.value !== ''
                                      ? `(${col.type}: ${defaultVal.value})`
                                      : col.type === 'text' && '(text)'
                                        ? '(text)'
                                        : col.type === 'number' && '(number)'
                                          ? '(number)'
                                          : col.type === 'select'
                                            ? `(${col.options?.join(' / ') || 'select'})`
                                            : col.type === 'multi_select'
                                              ? `(multi: ${col.options?.slice(0, 2).join(', ') || '...'})`
                                              : col.type === 'calculated'
                                                ? '(auto)'
                                                : ''}
                                  </td>
                                );
                              })}
                            </tr>
                          ),
                        );
                      })()
                    ) : (
                      // Dynamic mode: show single placeholder row
                      <tr className='bg-white'>
                        {field.tableColumns.map((col) => (
                          <td
                            key={col.id}
                            className='px-3 py-2 border-r last:border-r-0 text-muted-foreground/50'>
                            {col.type === 'text' && '(text)'}
                            {col.type === 'number' && '(number)'}
                            {col.type === 'select' &&
                              `(${col.options?.join(' / ') || 'select'})`}
                            {col.type === 'multi_select' &&
                              `(multi: ${col.options?.slice(0, 2).join(', ') || '...'})`}
                            {col.type === 'calculated' && '(auto)'}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                  {field.showTableFooter !== false && (
                    <tfoot className='bg-gray-100'>
                      <tr>
                        {field.tableCellDefaults &&
                          field.tableCellDefaults.length > 0 && (
                            <td className='px-3 py-2 border-r font-medium bg-gray-100'>
                              Total
                            </td>
                          )}
                        {field.tableColumns.map((col, idx) => (
                          <td
                            key={col.id}
                            className='px-3 py-2 border-r last:border-r-0 font-medium'>
                            {!field.tableCellDefaults &&
                            idx === 0 &&
                            field.tableColumns?.[0]?.type !== 'number' &&
                            field.tableColumns?.[0]?.type !== 'calculated'
                              ? 'Total'
                              : col.type === 'number' ||
                                  col.type === 'calculated'
                                ? '∑'
                                : ''}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              {field.tableCellDefaults &&
                field.tableCellDefaults.length > 0 && (
                  <div className='px-3 py-2 bg-green-50 border-t text-xs text-green-700'>
                    <span className='font-medium'>Matrix Mode: </span>
                    {field.tableCellDefaults.length} default value(s) set
                    {field.tableCellDefaults &&
                      field.tableCellDefaults.length > 0 && (
                        <span className='ml-2'>
                          ({field.tableCellDefaults.length} default value(s))
                        </span>
                      )}
                  </div>
                )}
              {field.tableColumnGroups &&
                field.tableColumnGroups.length > 0 && (
                  <div className='px-3 py-2 bg-blue-50 border-t text-xs text-blue-700'>
                    <span className='font-medium'>Column Groups: </span>
                    {field.tableColumnGroups.map((g) => g.label).join(', ')}
                  </div>
                )}
            </div>
          ) : field.fields && field.fields.length > 0 ? (
            <div className='space-y-2 min-h-56'>
              {field.fields.map(
                (sectionField: FormField, sectionIndex: number) => {
                  // Render nested sections and arrays as SectionField
                  if (
                    sectionField.type === 'step_section' ||
                    sectionField.type === 'ui_section' ||
                    sectionField.type === 'array'
                  ) {
                    return (
                      <SectionField
                        key={sectionField.id}
                        field={sectionField}
                        index={sectionIndex}
                        isSelected={selectedFieldId === sectionField.id}
                        onSelect={() =>
                          onFieldSelect && onFieldSelect(sectionField.id)
                        }
                        onUpdate={(updates) =>
                          handleSectionFieldUpdate(sectionField.id, updates)
                        }
                        onDelete={() =>
                          handleSectionFieldDelete(sectionField.id)
                        }
                        onMove={handleSectionFieldMove}
                        onFieldMove={handleNestedFieldMoveBetweenSections}
                        onFieldAdd={onFieldAdd}
                        onTemplateAdd={onTemplateAdd}
                        allFields={field.fields || []}
                        selectedFieldId={selectedFieldId}
                        onFieldSelect={onFieldSelect}
                        parentSectionId={field.id}
                      />
                    );
                  }
                  // Render regular fields as FormFieldItem
                  return (
                    <FormFieldItem
                      key={sectionField.id}
                      field={sectionField}
                      index={sectionIndex}
                      isSelected={selectedFieldId === sectionField.id}
                      onSelect={() =>
                        onFieldSelect && onFieldSelect(sectionField.id)
                      }
                      onUpdate={(updates) =>
                        handleSectionFieldUpdate(sectionField.id, updates)
                      }
                      onDelete={() => handleSectionFieldDelete(sectionField.id)}
                      onMove={handleSectionFieldMove}
                      onFieldMove={handleNestedFieldMoveBetweenSections}
                      parentSectionId={field.id}
                    />
                  );
                },
              )}
            </div>
          ) : (
            <div
              className={`text-center py-10 items-center justify-center flex min-h-40 text-muted-foreground border-2 border-dashed rounded-lg transition-colors ${
                isOver && canDrop
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              }`}>
              <div className='flex flex-col items-center gap-3'>
                {field.type === 'array' ? (
                  <List className='w-8 h-8 text-muted-foreground/40' />
                ) : field.type === 'table' ? (
                  <Table2 className='w-8 h-8 text-muted-foreground/40' />
                ) : field.type === 'step_section' ? (
                  <ListOrdered className='w-8 h-8 text-muted-foreground/40' />
                ) : (
                  <LayoutGrid className='w-8 h-8 text-muted-foreground/40' />
                )}
                <p className='text-sm font-medium'>
                  {field.type === 'table'
                    ? 'Configure columns in the Field Properties panel'
                    : `Drag fields here to add them to this ${
                        field.type === 'array'
                          ? 'array template'
                          : field.type === 'step_section'
                            ? 'step section'
                            : 'UI section'
                      }`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className='flex items-center gap-2 text-xs mt-3 pt-3 border-t border-border'>
        <span className='text-muted-foreground bg-muted/50 px-2 py-0.5 rounded'>
          {field.type === 'array'
            ? 'Array'
            : field.type === 'table'
              ? 'Table'
              : field.type === 'step_section'
                ? 'Step Section'
                : 'UI Section'}
        </span>
        {field.required && (
          <span className='text-destructive bg-destructive/10 px-2 py-0.5 rounded'>
            Required
          </span>
        )}
        {field.isHidden && (
          <span className='text-muted-foreground bg-muted/50 px-2 py-0.5 rounded'>
            Hidden
          </span>
        )}
        {field.hideable && !field.isHidden && (
          <span className='text-muted-foreground bg-muted/50 px-2 py-0.5 rounded'>
            Hideable
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
        title={`Delete ${field.type === 'array' ? 'Array' : field.type === 'table' ? 'Table' : field.type === 'step_section' ? 'Step Section' : 'UI Section'}`}
        description={`Are you sure you want to delete the ${field.type === 'array' ? 'array' : field.type === 'table' ? 'table' : 'section'} "${localizedField.label}"? ${field.type === 'table' ? 'All column configurations will be lost.' : `It will also delete all fields within this ${field.type === 'array' ? 'array' : 'section'}.`}`}
        onAccept={handleDeleteConfirm}
        onClose={handleDeleteCancel}
        acceptText={`Delete ${field.type === 'array' ? 'Array' : field.type === 'table' ? 'Table' : field.type === 'step_section' ? 'Step Section' : 'UI Section'}`}
      />
    </div>
  );
});
