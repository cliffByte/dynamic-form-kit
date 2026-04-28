'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Label } from '../../../../ui/label';
import { Input } from '../../../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../ui/select';

interface UISectionEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const UISectionEditor: React.FC<UISectionEditorProps> = ({
  field,
  updateField,
}) => {
  if (field.type !== 'ui_section') return null;

  return (
    <div className='border-t pt-4 space-y-4'>
      <h4 className='text-sm font-medium text-gray-700'>
        Layout Configuration
      </h4>

      <div className='space-y-3'>
        <div className='space-y-2'>
          <Label className='text-xs font-semibold'>Layout Type</Label>
          <Select
            value={field.layoutType || 'grid'}
            onValueChange={(val: 'grid' | 'flex') =>
              updateField(field.id, { layoutType: val })
            }>
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='grid'>Grid Layout</SelectItem>
              <SelectItem value='flex'>Flex Layout (Horizontal)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {field.layoutType === 'grid' || !field.layoutType ? (
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>Columns</Label>
              <Input
                type='number'
                min='1'
                max='12'
                value={field.gridColumns || 2}
                onChange={(e) =>
                  updateField(field.id, {
                    gridColumns: parseInt(e.target.value) || 2,
                  })
                }
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>Gap (px)</Label>
              <Input
                type='number'
                min='0'
                max='100'
                value={field.gap || 32}
                onChange={(e) =>
                  updateField(field.id, { gap: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold'>Align Items</Label>
                <Select
                  value={field.alignItems || 'start'}
                  onValueChange={(val: any) =>
                    updateField(field.id, { alignItems: val })
                  }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='start'>Start</SelectItem>
                    <SelectItem value='center'>Center</SelectItem>
                    <SelectItem value='end'>End</SelectItem>
                    <SelectItem value='stretch'>Stretch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold'>Justify Content</Label>
                <Select
                  value={field.justifyContent || 'start'}
                  onValueChange={(val: any) =>
                    updateField(field.id, { justifyContent: val })
                  }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='start'>Start</SelectItem>
                    <SelectItem value='center'>Center</SelectItem>
                    <SelectItem value='end'>End</SelectItem>
                    <SelectItem value='between'>Space Between</SelectItem>
                    <SelectItem value='around'>Space Around</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>Gap (px)</Label>
              <Input
                type='number'
                min='0'
                max='100'
                value={field.gap || 16}
                onChange={(e) =>
                  updateField(field.id, { gap: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
