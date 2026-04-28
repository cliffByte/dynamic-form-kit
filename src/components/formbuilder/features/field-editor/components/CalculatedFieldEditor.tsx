'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Label } from '../../../../ui/label';
import { Textarea } from '../../../../ui/textarea';
import { Button } from '../../../../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../ui/select';
import { validateFormula } from '../../../../../lib/validationUtils';

interface CalculatedFieldEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  availableNumberFields: FormField[];
}

export const CalculatedFieldEditor: React.FC<CalculatedFieldEditorProps> = ({
  field,
  updateField,
  availableNumberFields,
}) => {
  if (field.type !== 'calculated') return null;

  const formulaValidation = validateFormula(field.formula || '');

  return (
    <div className='space-y-4 border-t pt-4'>
      <h4 className='text-sm font-medium text-gray-700'>Formula Builder</h4>

      <div className='space-y-3'>
        <div className='p-3 bg-gray-50 border border-border rounded-lg min-h-[40px]'>
          <code className='text-xs font-mono text-foreground break-all'>
            {field.formula || (
              <span className='text-muted-foreground italic'>
                No formula defined
              </span>
            )}
          </code>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Select
            onValueChange={(val) =>
              updateField(field.id, {
                formula: (field.formula || '') + `{${val}}`,
              })
            }>
            <SelectTrigger className='h-8 w-[160px] text-xs'>
              <SelectValue placeholder='Insert Field' />
            </SelectTrigger>
            <SelectContent>
              {availableNumberFields.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {['+', '-', '*', '/', '(', ')'].map((op) => (
            <Button
              type='button'
              key={op}
              variant='outline'
              size='sm'
              className='h-8 w-8 p-0 font-mono'
              onClick={() =>
                updateField(field.id, { formula: (field.formula || '') + op })
              }>
              {op}
            </Button>
          ))}
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs font-semibold'>Manual Formula Entry</Label>
          <Textarea
            value={field.formula || ''}
            onChange={(e) => updateField(field.id, { formula: e.target.value })}
            placeholder='{field1} * 2 + {field2}'
            className={`font-mono text-sm ${!formulaValidation.isValid && field.formula ? 'border-destructive' : ''}`}
            rows={3}
          />
          {!formulaValidation.isValid && field.formula && (
            <p className='text-[10px] text-destructive font-medium'>
              {formulaValidation.error}
            </p>
          )}
        </div>

        <div className='p-2.5 bg-primary/5 border border-primary/20 rounded-md text-[11px] text-muted-foreground'>
          <p className='font-bold text-primary/80 mb-1'>Formula Tips:</p>
          <ul className='list-disc list-inside space-y-0.5'>
            <li>Use {'{fieldId}'} for values</li>
            <li>Supported: +, -, *, /, ( )</li>
            <li>BODMAS rules apply</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
