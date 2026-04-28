'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Label } from '../../../../ui/label';
import { Input } from '../../../../ui/input';

interface AnalyticsEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const AnalyticsEditor: React.FC<AnalyticsEditorProps> = ({
  field,
  updateField,
}) => {
  if (['header', 'paragraph', 'section', 'step_section'].includes(field.type))
    return null;

  return (
    <div className='border-t pt-4 space-y-4'>
      <h4 className='text-sm font-medium text-gray-700'>Analytics Settings</h4>

      <div className='space-y-3'>
        <div className='space-y-1'>
          <Label htmlFor='analytics-key' className='text-xs font-semibold'>
            Metric Key
          </Label>
          <Input
            id='analytics-key'
            value={field.analytics?.metric_key || ''}
            onChange={(e) =>
              updateField(field.id, {
                analytics: {
                  ...field.analytics,
                  metric_key: e.target.value || undefined,
                },
              })
            }
            placeholder='e.g., performance_score'
          />
        </div>

        <div className='space-y-1'>
          <Label htmlFor='analytics-weight' className='text-xs font-semibold'>
            Weight
          </Label>
          <Input
            id='analytics-weight'
            type='number'
            step='0.1'
            value={field.analytics?.weight ?? '1.0'}
            onChange={(e) =>
              updateField(field.id, {
                analytics: {
                  ...field.analytics,
                  weight: e.target.value ? parseFloat(e.target.value) : 1.0,
                },
              })
            }
          />
          <p className='text-[10px] text-muted-foreground'>
            How much this field impacts total score (default: 1.0)
          </p>
        </div>
      </div>
    </div>
  );
};
