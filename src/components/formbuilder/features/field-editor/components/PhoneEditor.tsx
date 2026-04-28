'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';

interface PhoneEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const PhoneEditor: React.FC<PhoneEditorProps> = ({
  field,
  updateField,
}) => {
  if (field.type !== 'phone') return null;

  return (
    <div className='border-t pt-4 space-y-4'>
      <h4 className='text-sm font-medium text-gray-700'>Phone Settings</h4>

      <div className='space-y-2'>
        <Label htmlFor='phone-default-country'>Default Country Code</Label>
        <Input
          id='phone-default-country'
          type='text'
          maxLength={2}
          value={field.defaultCountry || 'NP'}
          onChange={(e) =>
            updateField(field.id, {
              defaultCountry: e.target.value.toUpperCase(),
            })
          }
          placeholder='e.g., NP, US, IN'
        />
        <p className='text-xs text-muted-foreground'>
          Two-letter country code (ISO 3166-1 alpha-2)
        </p>
      </div>
    </div>
  );
};
