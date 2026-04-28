'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Label } from '../../../../ui/label';
import { Textarea } from '../../../../ui/textarea';
import { setLocalizedFieldValue } from '../../../../../lib/fieldLocalization';

interface InstructionEditorProps {
  field: FormField;
  editingLocale: string;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const InstructionEditor: React.FC<InstructionEditorProps> = ({
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

  if (['rich_text', 'section'].includes(field.type)) {
    return null;
  }

  return (
    <div className='space-y-2'>
      <Label htmlFor='field-instruction'>
        Instruction (Help Text) {!isEn && `(${editingLocale.toUpperCase()})`}
      </Label>
      <Textarea
        id='field-instruction'
        value={
          isEn
            ? field.instruction || ''
            : field.translations?.instruction?.[editingLocale] || ''
        }
        onChange={(e) =>
          handleUpdate('instruction', e.target.value || undefined)
        }
        placeholder={
          isEn
            ? 'Helpful hint or description for users'
            : `Enter ${editingLocale.toUpperCase()} instruction`
        }
        rows={2}
      />
    </div>
  );
};
