'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Label } from '../../../../ui/label';
import { Input } from '../../../../ui/input';
import { Button } from '../../../../ui/button';
import { TableColumnConfigDialog } from '../../../../TableColumnConfigDialog';
import { tableRowsFromColumns } from '../../../../../lib/tableExpand';

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

  const expandByColumns = field.tableExpandDirection === 'columns';
  const isMatrixMode = field.tableMode === 'matrix';

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
          <Label className='text-xs'>
            {expandByColumns ? 'Min Columns' : 'Min Rows'}
          </Label>
          <Input
            type='number'
            min='0'
            value={field.minItems ?? 0}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              updateField(field.id, {
                minItems: Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
              });
            }}
            placeholder='0'
            disabled={isMatrixMode && !expandByColumns}
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-xs'>
            {expandByColumns ? 'Max Columns' : 'Max Rows'}
          </Label>
          <Input
            type='number'
            min='1'
            value={field.maxItems ?? ''}
            onChange={(e) =>
              updateField(field.id, {
                maxItems: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder={isMatrixMode && !expandByColumns ? 'Set in Configure Table' : 'Unlimited (empty)'}
            disabled={isMatrixMode && !expandByColumns}
          />
        </div>
      </div>

      <div className='space-y-1'>
        <Label className='text-xs'>Expand Direction</Label>
        <select
          className='w-full h-9 text-sm border rounded-md px-2 bg-background'
          value={field.tableExpandDirection ?? 'rows'}
          onChange={(e) => {
            const direction = e.target.value as 'rows' | 'columns';
            const updates: Partial<FormField> = {
              tableExpandDirection: direction,
            };
            if (
              direction === 'columns' &&
              (field.tableRows?.length ?? 0) === 0 &&
              (field.tableColumns?.length ?? 0) > 0
            ) {
              updates.tableRows = tableRowsFromColumns(field.tableColumns!);
            }
            updateField(field.id, updates);
          }}>
          <option value='rows'>Rows (add rows at bottom, fixed columns)</option>
          <option value='columns'>
            Columns (add columns to the right, fixed rows)
          </option>
        </select>
        <p className='text-xs text-muted-foreground'>
          Columns mode adds entries to the right (uses row definitions from
          Configure Table, or column labels if rows are empty). Min rows defaults
          to 0; set max for a limit.
        </p>
      </div>

      <div className='flex flex-col gap-2'>
        {!expandByColumns && (
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='show-table-sn'
              checked={field.tableShowSerialNumber ?? false}
              onChange={(e) =>
                updateField(field.id, {
                  tableShowSerialNumber: e.target.checked,
                })
              }
              className='w-4 h-4 rounded border-gray-300'
            />
            <Label htmlFor='show-table-sn' className='text-xs cursor-pointer'>
              Show SN column (first column)
            </Label>
          </div>
        )}
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
      </div>

      <TableColumnConfigDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        columns={field.tableColumns || []}
        columnGroups={field.tableColumnGroups || []}
        tableRows={field.tableRows || []}
        tableRowHeaderLabel={field.tableRowHeaderLabel || 'Row'}
        cellDefaults={field.tableCellDefaults || []}
        tableExpandDirection={field.tableExpandDirection ?? 'rows'}
        tableShowSerialNumber={field.tableShowSerialNumber}
        tableSerialNumberLabel={field.tableSerialNumberLabel ?? 'SN'}
        onSave={(
          columns,
          columnGroups,
          tableRows,
          tableRowHeaderLabel,
          cellDefaults,
          rowCount,
          tableOptions,
        ) => {
          const isMatrixMode = (cellDefaults?.length ?? 0) > 0;
          const wasMatrixMode = field.tableMode === 'matrix';
          const expandByColumns = field.tableExpandDirection === 'columns';

          const updates: Partial<FormField> = {
            tableColumns: columns,
            tableColumnGroups: columnGroups,
            tableRowHeaderLabel,
            tableCellDefaults: cellDefaults,
            tableMode: isMatrixMode ? 'matrix' : 'dynamic',
            ...(tableOptions
              ? {
                  tableShowSerialNumber: tableOptions.showSerialNumber,
                  tableSerialNumberLabel: tableOptions.serialNumberLabel,
                }
              : { tableShowSerialNumber: false }),
            tableRows:
              isMatrixMode || expandByColumns
                ? tableRows.length > 0
                  ? tableRows
                  : expandByColumns
                    ? tableRowsFromColumns(columns)
                    : []
                : [],
          };

          if (isMatrixMode && rowCount && !expandByColumns) {
            updates.minItems = rowCount;
            updates.maxItems = rowCount;
          } else if (wasMatrixMode && !isMatrixMode) {
            updates.minItems = undefined;
            updates.maxItems = undefined;
          } else if (
            !isMatrixMode &&
            !expandByColumns &&
            field.minItems === field.maxItems &&
            field.minItems === (field.tableRows?.length ?? 0) &&
            (field.tableCellDefaults?.length ?? 0) === 0
          ) {
            updates.minItems = undefined;
            updates.maxItems = undefined;
          }

          updateField(field.id, updates);
        }}
      />
    </div>
  );
};
