'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';

interface RatingEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const RatingEditor: React.FC<RatingEditorProps> = ({
  field,
  updateField,
}) => {
  if (field.type !== 'rating') return null;

  return (
    <div className='border-t pt-4 space-y-4'>
      <h4 className='text-sm font-medium text-gray-700'>Rating Settings</h4>

      <div className='space-y-2'>
        <Label htmlFor='rating-max'>Maximum Rating</Label>
        <Input
          id='rating-max'
          type='number'
          min={1}
          max={10}
          value={field.ratingMax ?? 5}
          onChange={(e) =>
            updateField(field.id, {
              ratingMax: e.target.value ? parseInt(e.target.value) : 5,
            })
          }
        />
        <p className='text-xs text-muted-foreground'>
          Number of stars (1-10, default: 5)
        </p>
      </div>
    </div>
  );
};
