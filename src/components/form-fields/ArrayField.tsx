'use client';

import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { FieldWrapper } from './FieldWrapper';
import { ContainerFieldProps } from './types';
import { cn } from '../../lib/utils';
import { FormFieldRenderer } from './FormFieldRenderer';
import { FormField } from '../../types/form';

/**
 * Array/repeatable field for dynamic list of items
 */
export function ArrayField({
  field,
  value,
  onChange,
  showError,
  errorMessage,
  disabled,
  className,
  renderField,
}: ContainerFieldProps) {
  const arrayValue: Record<string, any>[] = Array.isArray(value) ? value : [];
  const minItems = field.minItems || 0;
  const maxItems = field.maxItems;
  const nestedFields = field.fields || [];

  const addItem = () => {
    if (maxItems && arrayValue.length >= maxItems) return;

    const newItem: Record<string, any> = {};
    nestedFields.forEach((f) => {
      // Use default_value if available, otherwise initialize based on field type
      if (f.default_value !== undefined && f.default_value !== null) {
        newItem[f.id] = f.default_value;
      } else {
        // Initialize with appropriate default based on field type
        switch (f.type) {
          case 'checkbox':
          case 'multi_select':
          case 'media':
            newItem[f.id] = [];
            break;
          case 'matrix':
            newItem[f.id] = {};
            break;
          case 'range':
          case 'rating':
          case 'number':
          case 'date':
            newItem[f.id] = null;
            break;
          default:
            newItem[f.id] = '';
        }
      }
    });
    onChange([...arrayValue, newItem]);
  };

  const removeItem = (index: number) => {
    if (arrayValue.length <= minItems) return;
    const newArray = arrayValue.filter((_, i) => i !== index);
    onChange(newArray);
  };

  const updateItem = (index: number, fieldId: string, fieldValue: any) => {
    const newArray = [...arrayValue];
    newArray[index] = { ...newArray[index], [fieldId]: fieldValue };
    onChange(newArray);
  };

  const canAddMore = !maxItems || arrayValue.length < maxItems;
  const canRemove = arrayValue.length > minItems;

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage}
      className={className}
      labelExtra={
        <span className='text-xs text-muted-foreground'>
          ({arrayValue.length} item{arrayValue.length !== 1 ? 's' : ''})
          {maxItems && ` / max ${maxItems}`}
        </span>
      }>
      <div className='space-y-3'>
        {/* Array items */}
        {arrayValue.map((item, index) => (
          <div
            key={index}
            className={cn(
              'relative border-2 rounded-lg p-4 bg-muted/20 transition-all duration-200',
              'hover:border-muted-foreground/30 hover:shadow-sm',
            )}>
            {/* Item header */}
            <div className='flex items-center justify-between mb-3 pb-2 border-b'>
              <div className='flex items-center gap-2'>
                <GripVertical className='w-4 h-4 text-muted-foreground/50' />
                <span className='text-sm font-medium text-muted-foreground'>
                  Item {index + 1}
                </span>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => removeItem(index)}
                disabled={disabled || !canRemove}
                className={cn(
                  'h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50',
                  !canRemove && 'opacity-50 cursor-not-allowed',
                )}>
                <Trash2 className='w-4 h-4' />
              </Button>
            </div>

            {/* Item fields */}
            <div className='space-y-4'>
              {nestedFields.map((nestedField) => {
                const nestedValue =
                  item[nestedField.id] ?? nestedField.default_value ?? '';

                /**
                 * Recursive field renderer for array items.
                 * This ensures that nested fields (like those inside a select option's nested form)
                 * correctly read from and write to the array item object instead of the top-level form data.
                 */
                const recursiveRenderField = (f: FormField) => (
                  <FormFieldRenderer
                    key={f.id}
                    field={f}
                    value={item[f.id] ?? f.default_value ?? ''}
                    onChange={(val) => updateItem(index, f.id, val)}
                    disabled={disabled || f.isDisabled}
                    renderField={recursiveRenderField}
                    formValues={item}
                  />
                );

                return (
                  <div key={nestedField.id}>
                    {recursiveRenderField(nestedField)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {arrayValue.length === 0 && (
          <div className='text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground'>
            <p className='text-sm mb-2'>No items added yet</p>
            {minItems > 0 && (
              <p className='text-xs'>
                Minimum {minItems} item{minItems > 1 ? 's' : ''} required
              </p>
            )}
          </div>
        )}

        {/* Add button */}
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={addItem}
          disabled={disabled || !canAddMore}
          className={cn(
            'w-full border-dashed',
            canAddMore && 'hover:border-primary hover:text-primary',
          )}>
          <Plus className='w-4 h-4 mr-2' />
          Add Item
        </Button>
      </div>
    </FieldWrapper>
  );
}
