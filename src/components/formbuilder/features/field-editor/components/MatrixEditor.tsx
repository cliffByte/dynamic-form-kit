'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Textarea } from '../../../../ui/textarea';
import { Label } from '../../../../ui/label';
import { setLocalizedFieldArray } from '../../../../../lib/fieldLocalization';

interface MatrixEditorProps {
  field: FormField;
  editingLocale: string;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const MatrixEditor: React.FC<MatrixEditorProps> = ({
  field,
  editingLocale,
  updateField,
}) => {
  if (field.type !== 'matrix') return null;

  const isEn = editingLocale === 'en';

  const handleRowsChange = (value: string) => {
    const rows = value ? value.split('\n').filter((r) => r.trim()) : [];
    if (isEn) {
      updateField(field.id, { matrixRows: rows });
    } else {
      const updated = setLocalizedFieldArray(
        field,
        'matrixRows',
        editingLocale,
        rows,
      );
      updateField(field.id, { translations: updated.translations });
    }
  };

  const handleColumnsChange = (value: string) => {
    const columns = value ? value.split('\n').filter((c) => c.trim()) : [];
    if (isEn) {
      updateField(field.id, { matrixColumns: columns });
    } else {
      const updated = setLocalizedFieldArray(
        field,
        'matrixColumns',
        editingLocale,
        columns,
      );
      updateField(field.id, { translations: updated.translations });
    }
  };

  return (
    <div className='space-y-4 border-t pt-4'>
      <h4 className='text-sm font-medium text-gray-700'>
        Matrix Configuration
      </h4>

      <div className='space-y-3'>
        <div className='space-y-1'>
          <Label className='text-sm font-semibold'>
            Row Labels (one per line){' '}
            {!isEn && `(${editingLocale.toUpperCase()})`}
          </Label>
          <Textarea
            value={
              isEn
                ? field.matrixRows?.join('\n') || ''
                : field.translations?.matrixRows?.[editingLocale]?.join('\n') ||
                  ''
            }
            onChange={(e) => handleRowsChange(e.target.value)}
            placeholder={
              isEn
                ? 'Restrooms\nLibrary\nScience Lab'
                : `Enter ${editingLocale.toUpperCase()} row labels`
            }
            rows={4}
          />
          <p className='text-[10px] text-muted-foreground'>
            Enter one row label per line
          </p>
        </div>

        <div className='space-y-1'>
          <Label className='text-sm font-semibold'>
            Column Labels (one per line){' '}
            {!isEn && `(${editingLocale.toUpperCase()})`}
          </Label>
          <Textarea
            value={
              isEn
                ? field.matrixColumns?.join('\n') || ''
                : field.translations?.matrixColumns?.[editingLocale]?.join(
                    '\n',
                  ) || ''
            }
            onChange={(e) => handleColumnsChange(e.target.value)}
            placeholder={
              isEn
                ? 'Poor\nFair\nGood\nExcellent'
                : `Enter ${editingLocale.toUpperCase()} column labels`
            }
            rows={4}
          />
          <p className='text-[10px] text-muted-foreground'>
            Enter one column label per line
          </p>
        </div>
      </div>
    </div>
  );
};
