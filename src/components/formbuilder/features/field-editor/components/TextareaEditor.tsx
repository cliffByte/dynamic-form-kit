'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';

interface TextareaEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const TextareaEditor: React.FC<TextareaEditorProps> = ({
  field,
  updateField,
}) => {
  if (field.type !== 'textarea') return null;

  return (
    <div className='border-t pt-4 space-y-4'>
      <h4 className='text-sm font-medium text-gray-700'>Textarea Settings</h4>

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='textarea-rows'>Rows</Label>
          <Input
            id='textarea-rows'
            type='number'
            min={1}
            max={20}
            value={field.textareaRows ?? 4}
            onChange={(e) =>
              updateField(field.id, {
                textareaRows: e.target.value ? parseInt(e.target.value) : 4,
              })
            }
          />
          <p className='text-xs text-muted-foreground'>
            Number of visible text rows (default: 4)
          </p>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='textarea-cols'>Columns (optional)</Label>
          <Input
            id='textarea-cols'
            type='number'
            min={1}
            value={field.textareaCols ?? ''}
            onChange={(e) =>
              updateField(field.id, {
                textareaCols: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
          <p className='text-xs text-muted-foreground'>
            Leave empty for auto width
          </p>
        </div>
      </div>
    </div>
  );
};
