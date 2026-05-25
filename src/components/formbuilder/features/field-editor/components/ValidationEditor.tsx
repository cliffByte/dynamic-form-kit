'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import { Badge } from '../../../../ui/badge';
import { setLocalizedFieldValue } from '../../../../../lib/fieldLocalization';

interface ValidationEditorProps {
  field: FormField;
  editingLocale: string;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const ValidationEditor: React.FC<ValidationEditorProps> = ({
  field,
  editingLocale,
  updateField,
}) => {
  const isEn = editingLocale === 'en';

  const handleUpdate = (
    key: keyof FormField,
    value: any,
    translationKey?: string,
  ) => {
    if (isEn) {
      updateField(field.id, { [key]: value });
    } else {
      const updated = setLocalizedFieldValue(
        field,
        (translationKey || key) as any,
        editingLocale,
        value,
      );
      updateField(field.id, { translations: updated.translations });
    }
  };

  const handleValidationUpdate = (
    key: 'min' | 'max' | 'pattern' | 'message',
    value: any,
  ) => {
    if (isEn) {
      updateField(field.id, {
        validation: {
          ...(field.validation || {}),
          [key]: value,
        },
      });
    } else if (key === 'message') {
      const updated = setLocalizedFieldValue(
        field,
        'message',
        editingLocale,
        value,
      );
      updateField(field.id, { translations: updated.translations });
    }
  };

  if (['header', 'paragraph', 'section', 'rich_text'].includes(field.type)) {
    return null;
  }

  return (
    <div className='border-t pt-4 space-y-4'>
      <h4 className='text-sm font-medium text-gray-700'>
        Validation & Behavior
      </h4>

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        {/* Required */}
        <div className='flex items-center gap-2'>
          <input
            type='checkbox'
            id='field-required'
            checked={field.required || false}
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked) {
                // If required is checked, cannot be hidden or disabled
                updateField(field.id, {
                  required: true,
                  isHidden: false,
                  isDisabled: false,
                });
              } else {
                updateField(field.id, { required: false });
              }
            }}
            className='w-4 h-4 rounded border-gray-300'
          />
          <Label htmlFor='field-required' className='cursor-pointer'>
            Required
          </Label>
        </div>

        {/* Hidden */}
        <div className='flex items-center gap-2'>
          <input
            type='checkbox'
            id='field-hidden'
            checked={field.isHidden || false}
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked) {
                // If hidden is checked, cannot be required
                updateField(field.id, { isHidden: true, required: false });
              } else {
                updateField(field.id, { isHidden: false });
              }
            }}
            className='w-4 h-4 rounded border-gray-300'
          />
          <Label htmlFor='field-hidden' className='cursor-pointer'>
            Hidden
          </Label>
        </div>

        {/* Disabled */}
        <div className='flex items-center gap-2'>
          <input
            type='checkbox'
            id='field-disabled'
            checked={field.isDisabled || false}
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked) {
                // If disabled is checked, cannot be required
                updateField(field.id, { isDisabled: true, required: false });
              } else {
                updateField(field.id, { isDisabled: false });
              }
            }}
            className='w-4 h-4 rounded border-gray-300'
          />
          <Label htmlFor='field-disabled' className='cursor-pointer'>
            Disabled
          </Label>
        </div>
      </div>

      {/* Placeholder */}
      {[
        'text',
        'email',
        'phone',
        'number',
        'textarea',
        'select',
        'multi_select',
        'rich_text_input',
        'nepali_unicode',
        'date',
      ].includes(field.type) && (
        <div className='space-y-2'>
          <Label htmlFor='field-placeholder'>
            Placeholder {!isEn && `(${editingLocale.toUpperCase()})`}
          </Label>
          <Input
            id='field-placeholder'
            type='text'
            value={
              isEn
                ? field.placeholder || ''
                : field.translations?.placeholder?.[editingLocale] || ''
            }
            onChange={(e) => handleUpdate('placeholder', e.target.value)}
            placeholder='Grayed out text when empty'
          />
        </div>
      )}

      {/* Text/Number/Phone specific validations */}
      {[
        'text',
        'textarea',
        'email',
        'number',
        'phone',
        'rich_text_input',
        'nepali_unicode',
      ].includes(field.type) && (
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='field-min'>
                {field.type === 'number'
                  ? 'Min Value'
                  : field.type === 'phone'
                    ? 'Min Digits'
                    : 'Min Length (characters)'}
              </Label>
              <Input
                id='field-min'
                type='number'
                value={field.validation?.min ?? ''}
                onChange={(e) =>
                  handleValidationUpdate(
                    'min',
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='field-max'>
                {field.type === 'number'
                  ? 'Max Value'
                  : field.type === 'phone'
                    ? 'Max Digits'
                    : 'Max Length (characters)'}
              </Label>
              <Input
                id='field-max'
                type='number'
                value={field.validation?.max ?? ''}
                onChange={(e) =>
                  handleValidationUpdate(
                    'max',
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='field-regex'>Custom Regex Validation</Label>
            <Input
              id='field-regex'
              type='text'
              value={(field.validation?.pattern as string) || ''}
              onChange={(e) =>
                handleValidationUpdate('pattern', e.target.value)
              }
              placeholder='e.g., ^[A-Z]{3}$'
              className='font-mono text-xs'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='field-regex-msg'>
              Validation Error Message{' '}
              {!isEn && `(${editingLocale.toUpperCase()})`}
            </Label>
            <Input
              id='field-regex-msg'
              type='text'
              value={
                isEn
                  ? field.validation?.message || ''
                  : field.translations?.message?.[editingLocale] || ''
              }
              onChange={(e) =>
                handleValidationUpdate('message', e.target.value)
              }
              placeholder='Message to show when regex fails'
            />
          </div>
        </div>
      )}
    </div>
  );
};
