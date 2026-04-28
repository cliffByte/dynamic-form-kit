'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import { setLocalizedFieldValue } from '../../../../../lib/fieldLocalization';

interface BasicPropertiesEditorProps {
  field: FormField;
  editingLocale: string;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const BasicPropertiesEditor: React.FC<BasicPropertiesEditorProps> = ({
  field,
  editingLocale,
  updateField,
}) => {
  const isEn = editingLocale === 'en';

  const handleUpdate = (key: keyof FormField, value: any) => {
    if (isEn) {
      updateField(field.id, { [key]: value });
    } else {
      const updated = setLocalizedFieldValue(
        field,
        key as any,
        editingLocale,
        value,
      );
      updateField(field.id, { translations: updated.translations });
    }
  };

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='field-unique-identifier' className='text-sm font-semibold'>
          Unique Key
        </Label>
        <Input
          id='field-unique-identifier'
          type='text'
          value={field.uniqueIdentifier || ''}
          onChange={(e) => updateField(field.id, { uniqueIdentifier: e.target.value })}
          className='font-mono border-border focus:border-primary focus:ring-primary'
          placeholder='fullName, age, permanentAddress'
        />
     
      </div>

      {/* Label */}
      <div className='space-y-2'>
        <Label
          htmlFor='field-label'
          className='text-sm font-semibold text-foreground'>
          Field Label {!isEn && `(${editingLocale.toUpperCase()})`}
        </Label>
        <Input
          id='field-label'
          type='text'
          value={
            isEn
              ? field.label
              : field.translations?.label?.[editingLocale] || ''
          }
          onChange={(e) => handleUpdate('label', e.target.value)}
          className='border-border focus:border-primary focus:ring-primary'
          placeholder={
            isEn ? 'Enter label' : `Enter ${editingLocale.toUpperCase()} label`
          }
        />
      </div>

    </div>
  );
};
