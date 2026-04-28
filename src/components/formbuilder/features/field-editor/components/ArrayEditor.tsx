'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';

interface ArrayEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  field,
  updateField,
}) => {
  if (field.type !== 'array') return null;

  return (
    <div className='border-t pt-4 space-y-4'>
      <h4 className='text-sm font-medium text-gray-700'>Array Settings</h4>

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='array-min-items'>Min Items</Label>
          <Input
            id='array-min-items'
            type='number'
            min={0}
            value={field.minItems ?? 0}
            onChange={(e) =>
              updateField(field.id, {
                minItems: e.target.value ? parseInt(e.target.value) : 0,
              })
            }
          />
          <p className='text-xs text-muted-foreground'>
            Minimum number of items required (default: 0)
          </p>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='array-max-items'>Maxi Items (optional)</Label>
          <Input
            id='array-max-items'
            type='number'
            min={1}
            value={field.maxItems ?? ''}
            onChange={(e) =>
              updateField(field.id, {
                maxItems: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
          <p className='text-xs text-muted-foreground'>
            Leave empty for unlimited
          </p>
        </div>
      </div>
    </div>
  );
};
