'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import { Textarea } from '../../../../ui/textarea';
import { setLocalizedFieldValue } from '../../../../../lib/fieldLocalization';

interface StepSectionEditorProps {
  field: FormField;
  editingLocale: string;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const StepSectionEditor: React.FC<StepSectionEditorProps> = ({
  field,
  editingLocale,
  updateField,
}) => {
  if (field.type !== 'step_section') return null;

  const isEn = editingLocale === 'en';

  return (
    <div className='space-y-4 border-t pt-4'>
      <h4 className='text-sm font-medium text-gray-700'>
        Step Section Settings
      </h4>

      <div className='space-y-2'>
        <Label htmlFor='step-unique-key'>Step key (for dynamic visibility)</Label>
        <Input
          id='step-unique-key'
          type='text'
          value={field.uniqueIdentifier || ''}
          onChange={(e) =>
            updateField(field.id, { uniqueIdentifier: e.target.value })
          }
          className='font-mono'
          placeholder='userinfo_step, basicinfo_step'
        />
        <p className='text-xs text-muted-foreground'>
          Pass this key in <code className='text-xs'>hideSteps</code> on{' '}
          <code className='text-xs'>FormRenderer</code> to hide this step at
          runtime.
        </p>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='step-number'>Step Number</Label>
        <Input
          id='step-number'
          type='number'
          min='1'
          value={field.stepNumber || 1}
          onChange={(e) =>
            updateField(field.id, { stepNumber: parseInt(e.target.value) || 1 })
          }
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='step-description'>
          Step Description {!isEn && `(${editingLocale.toUpperCase()})`}
        </Label>
        <Textarea
          id='step-description'
          value={
            isEn
              ? field.stepDescription || ''
              : field.translations?.stepDescription?.[editingLocale] || ''
          }
          onChange={(e) => {
            if (isEn) {
              updateField(field.id, { stepDescription: e.target.value });
            } else {
              const updated = setLocalizedFieldValue(
                field,
                'stepDescription',
                editingLocale,
                e.target.value,
              );
              updateField(field.id, { translations: updated.translations });
            }
          }}
          placeholder={
            isEn
              ? 'Brief description of this step...'
              : `Enter ${editingLocale.toUpperCase()} description`
          }
          rows={2}
        />
      </div>

      <div className='flex flex-col gap-3'>
        <div className='flex items-center gap-2'>
          <input
            type='checkbox'
            id='expanded'
            checked={field.isExpanded ?? true}
            onChange={(e) =>
              updateField(field.id, { isExpanded: e.target.checked })
            }
            className='w-4 h-4 rounded border-gray-300'
          />
          <Label
            htmlFor='expanded'
            className='cursor-pointer text-sm font-medium'>
            Expanded by default
          </Label>
        </div>

        <div className='flex items-center gap-2'>
          <input
            type='checkbox'
            id='section-hidden'
            checked={field.isHidden || false}
            onChange={(e) =>
              updateField(field.id, { isHidden: e.target.checked })
            }
            className='w-4 h-4 rounded border-gray-300'
          />
          <Label
            htmlFor='section-hidden'
            className='cursor-pointer text-sm font-medium'>
            Hidden in form submission
          </Label>
        </div>
      </div>
    </div>
  );
};
