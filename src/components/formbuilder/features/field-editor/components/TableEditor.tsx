'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Label } from '../../../../ui/label';
import { Input } from '../../../../ui/input';
import { Button } from '../../../../ui/button';
import { TableColumnConfigDialog } from '../../../../TableColumnConfigDialog';

interface TableEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const TableEditor: React.FC<TableEditorProps> = ({
  field,
  updateField,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (field.type !== 'table') return null;

  return (
    <div className='space-y-4 border-t pt-4'>
      <div className='flex items-center justify-between'>
        <h4 className='text-sm font-medium text-gray-700'>
          Table Configuration
        </h4>
        <Button type='button' size='sm' onClick={() => setIsOpen(true)}>
          Configure Table
        </Button>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-1'>
          <Label className='text-xs'>Min Rows</Label>
          <Input
            type='number'
            min='0'
            value={field.minItems ?? ''}
            onChange={(e) =>
              updateField(field.id, {
                minItems: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder='0'
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-xs'>Max Rows</Label>
          <Input
            type='number'
            min='1'
            value={field.maxItems ?? ''}
            onChange={(e) =>
              updateField(field.id, {
                maxItems: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder='No limit'
          />
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <input
          type='checkbox'
          id='show-table-footer'
          checked={field.showTableFooter ?? true}
          onChange={(e) =>
            updateField(field.id, { showTableFooter: e.target.checked })
          }
          className='w-4 h-4 rounded border-gray-300'
        />
        <Label htmlFor='show-table-footer' className='text-xs cursor-pointer'>
          Show Footer (totals for number/calculated columns)
        </Label>
      </div>

      <TableColumnConfigDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        columns={field.tableColumns || []}
        columnGroups={field.tableColumnGroups || []}
        tableRows={field.tableRows || []}
        tableRowHeaderLabel={field.tableRowHeaderLabel || 'Row'}
        cellDefaults={field.tableCellDefaults || []}
        onSave={(
          columns,
          columnGroups,
          tableRows,
          tableRowHeaderLabel,
          cellDefaults,
          rowCount,
        ) => {
          const hasExistingFixedRows =
            field.minItems !== undefined &&
            field.maxItems !== undefined &&
            field.minItems === field.maxItems &&
            field.minItems > 0;
          const isMatrixMode =
            (cellDefaults && cellDefaults.length > 0) ||
            (tableRows && tableRows.length > 0) ||
            hasExistingFixedRows;

          updateField(field.id, {
            tableColumns: columns,
            tableColumnGroups: columnGroups,
            tableRows,
            tableRowHeaderLabel,
            tableCellDefaults: cellDefaults,
            ...(isMatrixMode && rowCount
              ? { minItems: rowCount, maxItems: rowCount }
              : {}),
          });
        }}
      />
    </div>
  );
};
