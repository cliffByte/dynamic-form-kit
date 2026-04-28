'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../ui/select';
import { setLocalizedFieldValue } from '../../../../../lib/fieldLocalization';

interface RangeEditorProps {
  field: FormField;
  editingLocale: string;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const RangeEditor: React.FC<RangeEditorProps> = ({
  field,
  editingLocale,
  updateField,
}) => {
  const isEn = editingLocale === 'en';

  if (field.type !== 'range') return null;

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
    <div className='border-t pt-4 space-y-4'>
      <h4 className='text-sm font-medium text-gray-700'>Range Settings</h4>

      {/* Range Mode */}
      <div className='space-y-2'>
        <Label htmlFor='range-mode'>Range Mode</Label>
        <Select
          value={field.rangeMode || 'single'}
          onValueChange={(value: 'single' | 'range') =>
            updateField(field.id, { rangeMode: value })
          }>
          <SelectTrigger id='range-mode'>
            <SelectValue placeholder='Select mode' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='single'>Single Value</SelectItem>
            <SelectItem value='range'>Range (Two Handles)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Min/Max/Step */}
      <div className='grid grid-cols-3 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='range-min'>Min Value</Label>
          <Input
            id='range-min'
            type='number'
            value={field.rangeMin ?? 0}
            onChange={(e) =>
              updateField(field.id, {
                rangeMin: e.target.value ? parseInt(e.target.value) : 0,
              })
            }
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='range-max'>Max Value</Label>
          <Input
            id='range-max'
            type='number'
            value={field.rangeMax ?? 100}
            onChange={(e) =>
              updateField(field.id, {
                rangeMax: e.target.value ? parseInt(e.target.value) : 100,
              })
            }
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='range-step'>Step</Label>
          <Input
            id='range-step'
            type='number'
            value={field.rangeStep ?? 1}
            onChange={(e) =>
              updateField(field.id, {
                rangeStep: e.target.value ? parseInt(e.target.value) : 1,
              })
            }
          />
        </div>
      </div>

      {/* Labels */}
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='range-min-label'>
            Min Label {!isEn && `(${editingLocale.toUpperCase()})`}
          </Label>
          <Input
            id='range-min-label'
            type='text'
            value={
              isEn
                ? field.rangeMinLabel || ''
                : field.translations?.rangeMinLabel?.[editingLocale] || ''
            }
            onChange={(e) => handleUpdate('rangeMinLabel', e.target.value)}
            placeholder='e.g., Not Satisfied'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='range-max-label'>
            Max Label {!isEn && `(${editingLocale.toUpperCase()})`}
          </Label>
          <Input
            id='range-max-label'
            type='text'
            value={
              isEn
                ? field.rangeMaxLabel || ''
                : field.translations?.rangeMaxLabel?.[editingLocale] || ''
            }
            onChange={(e) => handleUpdate('rangeMaxLabel', e.target.value)}
            placeholder='e.g., Highly Satisfied'
          />
        </div>
      </div>
    </div>
  );
};
