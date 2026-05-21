'use client';

import React from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FormField, TableColumn } from '../../types/form';
import { FieldWrapper } from './FieldWrapper';
import { ContainerFieldProps } from './types';
import { cn } from '../../lib/utils';
import { evaluateFormula } from '../../lib/formUtils';
import { buildGroupedTableHeaders } from '../../lib/tableGrouping';
import {
  getEffectiveTableRowDefinitions,
  isTableExpandByColumns,
} from '../../lib/tableExpand';

interface TableRow {
  [key: string]: any;
}

/**
 * Table field with dynamic rows and columns
 */
export function TableField({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
}: ContainerFieldProps) {
  const rows: TableRow[] = Array.isArray(value) ? value : [];
  // Use tableColumns if available, otherwise fall back to nested fields
  const allColumns: (TableColumn | FormField)[] =
    field.tableColumns || field.fields || [];
  // Filter out hidden columns for display
  const columns = allColumns.filter(
    (col) => !('isHidden' in col && col.isHidden),
  );
  const minRows = field.minItems ?? 0;
  const maxRows = field.maxItems;
  const columnGroups = field.tableColumnGroups || [];
  const rowDefinitions = getEffectiveTableRowDefinitions(field);
  const rowHeaderLabel = field.tableRowHeaderLabel || 'Row';
  const tableCellDefaults = field.tableCellDefaults || [];
  const expandByColumns = isTableExpandByColumns(field);
  const hasFixedRows =
    !expandByColumns &&
    (field.tableMode === 'matrix' ||
      (minRows > 0 &&
        maxRows !== undefined &&
        Number(maxRows) === minRows));
  const fixedRowCount =
    hasFixedRows && rowDefinitions.length > 0 ? rowDefinitions.length : minRows;
  const showRowLabelColumn =
    rowDefinitions.length > 0 && (hasFixedRows || expandByColumns);
  const groupedHeaders = buildGroupedTableHeaders(columns, columnGroups);
  const showSerialColumn =
    !expandByColumns && Boolean(field.tableShowSerialNumber);
  const serialNumberLabel = field.tableSerialNumberLabel?.trim() || 'SN';
  const headerRowSpan = groupedHeaders.hasGroups
    ? groupedHeaders.maxDepth + 1
    : 1;

  // Create column map for formula evaluation - use ALL columns including hidden
  const columnMap = React.useMemo(() => {
    const map = new Map<string, any>();
    allColumns.forEach((col) => {
      map.set(col.id, col);
    });
    return map;
  }, [allColumns]);

  const getCellDefault = React.useCallback(
    (rowIndex: number, columnId: string, rowId?: string): any => {
      const match = tableCellDefaults.find(
        (d) =>
          d.columnId === columnId &&
          ((rowId && d.rowId === rowId) ||
            (!d.rowId && d.rowIndex === rowIndex)),
      );
      return match?.value;
    },
    [tableCellDefaults],
  );

  const isDefaultLockedCell = React.useCallback(
    (rowIndex: number, columnId: string): boolean => {
      const rowId = rowDefinitions[rowIndex]?.id;
      return tableCellDefaults.some(
        (d) =>
          d.columnId === columnId &&
          ((rowId && d.rowId === rowId) ||
            (!d.rowId && d.rowIndex === rowIndex)),
      );
    },
    [tableCellDefaults, rowDefinitions],
  );

  const hasChildren = React.useCallback(
    (rowId: string): boolean =>
      rowDefinitions.some((row) => row.parentRowId === rowId),
    [rowDefinitions],
  );

  const getColumnDefForRow = React.useCallback(
    (rowIndex: number): TableColumn | FormField =>
      allColumns[rowIndex] ?? allColumns[0],
    [allColumns],
  );

  const applyDefaultToCell = React.useCallback(
    (
      target: TableRow,
      key: string,
      col: TableColumn | FormField,
      rowIndex: number,
      rowId?: string,
    ) => {
      const current = target[key];
      if (current !== undefined && current !== null && current !== '') {
        return;
      }

      const defaultCellValue = getCellDefault(rowIndex, col.id, rowId);
      if (
        defaultCellValue !== undefined &&
        defaultCellValue !== null &&
        defaultCellValue !== ''
      ) {
        target[key] = defaultCellValue;
        return;
      }

      if (
        'default_value' in col &&
        col.default_value !== undefined &&
        col.default_value !== null
      ) {
        target[key] = col.default_value;
        return;
      }

      switch (col.type) {
        case 'checkbox':
        case 'multi_select':
          target[key] = [];
          break;
        case 'number':
          target[key] = null;
          break;
        default:
          target[key] = '';
      }
    },
    [getCellDefault],
  );

  const createRow = React.useCallback(
    (rowIndex: number, baseRow?: TableRow): TableRow => {
      const row: TableRow = { ...(baseRow || {}) };
      const rowId = rowDefinitions[rowIndex]?.id;

      if (expandByColumns) {
        rowDefinitions.forEach((rowDef, defIndex) => {
          const col = getColumnDefForRow(defIndex);
          applyDefaultToCell(row, rowDef.id, col, defIndex, rowDef.id);
        });
        return row;
      }

      allColumns.forEach((col) => {
        applyDefaultToCell(row, col.id, col, rowIndex, rowId);
      });

      allColumns.forEach((col) => {
        if (col.type === 'calculated' && col.formula) {
          const result = evaluateFormula(col.formula, row, columnMap);
          row[col.id] = result !== null ? result : '';
        }
      });

      return row;
    },
    [
      allColumns,
      columnMap,
      rowDefinitions,
      expandByColumns,
      getColumnDefForRow,
      applyDefaultToCell,
    ],
  );

  const applyParentNumberSums = React.useCallback(
    (inputRows: TableRow[]): TableRow[] => {
      if (!showRowLabelColumn) return inputRows;

      const numberColumns = allColumns.filter((col) => col.type === 'number');
      if (numberColumns.length === 0) return inputRows;

      const rowIdToIndex = new Map(
        rowDefinitions.map((row, index) => [row.id, index]),
      );
      const childMap = new Map<string, string[]>();
      rowDefinitions.forEach((row) => {
        if (!row.parentRowId) return;
        const existing = childMap.get(row.parentRowId) || [];
        childMap.set(row.parentRowId, [...existing, row.id]);
      });

      const rowsCopy = inputRows.map((row) => ({ ...row }));

      const computeForRow = (rowId: string, columnId: string): number => {
        const childIds = childMap.get(rowId) || [];
        if (childIds.length === 0) {
          const rowIndex = rowIdToIndex.get(rowId);
          if (rowIndex === undefined) return 0;
          const numericValue = Number(rowsCopy[rowIndex]?.[columnId]);
          return isNaN(numericValue) ? 0 : numericValue;
        }

        const sum = childIds.reduce(
          (acc, childId) => acc + computeForRow(childId, columnId),
          0,
        );

        const rowIndex = rowIdToIndex.get(rowId);
        if (rowIndex !== undefined) {
          rowsCopy[rowIndex][columnId] = sum;
        }
        return sum;
      };

      rowDefinitions.forEach((row) => {
        if (row.parentRowId) return;
        numberColumns.forEach((col) => {
          computeForRow(row.id, col.id);
        });
      });

      return rowsCopy;
    },
    [showRowLabelColumn, allColumns, rowDefinitions],
  );

  React.useEffect(() => {
    if (!hasFixedRows) return;

    const normalizedRowsBase: TableRow[] = Array.from(
      { length: fixedRowCount },
      (_, rowIndex) => createRow(rowIndex, rows[rowIndex]),
    );
    const normalizedRows = applyParentNumberSums(normalizedRowsBase);

    const hasLengthChanged = rows.length !== normalizedRows.length;
    const hasValueChanges = normalizedRows.some((row, index) => {
      const current = rows[index] || {};
      return allColumns.some((col) => current[col.id] !== row[col.id]);
    });

    if (hasLengthChanged || hasValueChanges) {
      onChange(normalizedRows);
    }
  }, [
    hasFixedRows,
    fixedRowCount,
    rows,
    createRow,
    allColumns,
    onChange,
    applyParentNumberSums,
  ]);

  // Re-calculate all rows on mount to ensure consistency
  React.useEffect(() => {
    if (rows.length > 0) {
      let hasAnyChanges = false;
      const updatedRows = rows.map((row) => {
        let updatedRow = { ...row };
        let hasRowChanges = false;
        allColumns.forEach((col) => {
          if (col.type === 'calculated' && col.formula) {
            const result = evaluateFormula(col.formula, updatedRow, columnMap);
            const val = result !== null ? result : '';
            if (updatedRow[col.id] !== val) {
              updatedRow[col.id] = val;
              hasRowChanges = true;
              hasAnyChanges = true;
            }
          }
        });
        return updatedRow;
      });

      if (hasAnyChanges) {
        onChange(updatedRows);
      }
    }
  }, []);

  const addRow = () => {
    if (expandByColumns) return;
    if (hasFixedRows) return;
    if (maxRows && rows.length >= maxRows) return;

    const newRow = createRow(rows.length);

    onChange([...rows, newRow]);
  };

  const addColumn = () => {
    if (!expandByColumns) return;
    if (maxRows && rows.length >= maxRows) return;

    const newInstance = createRow(rows.length);
    onChange([...rows, newInstance]);
  };

  const removeRow = (index: number) => {
    if (expandByColumns) return;
    if (hasFixedRows) return;
    if (rows.length <= minRows) return;
    const newRows = rows.filter((_, i) => i !== index);
    onChange(newRows);
  };

  const removeColumn = (index: number) => {
    if (!expandByColumns) return;
    if (rows.length <= minRows) return;
    onChange(rows.filter((_, i) => i !== index));
  };

  const updateCell = (rowIndex: number, columnId: string, cellValue: any) => {
    const newRows = [...rows];
    let row = { ...newRows[rowIndex], [columnId]: cellValue };

    if (!expandByColumns) {
      allColumns.forEach((col) => {
        if (col.type === 'calculated' && col.formula) {
          const result = evaluateFormula(col.formula, row, columnMap);
          row[col.id] = result !== null ? result : '';
        }
      });
    }

    newRows[rowIndex] = row;
    onChange(expandByColumns ? newRows : applyParentNumberSums(newRows));
  };

  const updateCellByRow = (
    instanceIndex: number,
    rowDefIndex: number,
    rowId: string,
    cellValue: any,
  ) => {
    updateCell(instanceIndex, rowId, cellValue);
  };

  const canAddMore = expandByColumns
    ? !maxRows || rows.length < maxRows
    : !hasFixedRows && (!maxRows || rows.length < maxRows);
  const canRemove = expandByColumns
    ? rows.length > minRows
    : !hasFixedRows && rows.length > minRows;

  const calculateTotal = (columnId: string) => {
    const rowsForTotal =
      showRowLabelColumn && rowDefinitions.length > 0
        ? rows.filter((_, index) => !rowDefinitions[index]?.parentRowId)
        : rows;

    return rowsForTotal.reduce((sum, row) => {
      const val = parseFloat(String(row[columnId] || 0));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  };

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage}
      className={className}
      labelExtra={
        <span className='text-xs text-muted-foreground'>
          ({rows.length}{' '}
          {expandByColumns
            ? `column${rows.length !== 1 ? 's' : ''}`
            : `row${rows.length !== 1 ? 's' : ''}`}
          )
          {hasFixedRows
            ? ' / fixed rows'
            : expandByColumns
              ? ' / fixed row labels'
              : maxRows
                ? ` / max ${maxRows}`
                : ''}
        </span>
      }>
      <div className='space-y-3'>
        {expandByColumns ? (
          <TransposedTable
            field={field}
            rows={rows}
            rowDefinitions={rowDefinitions}
            rowHeaderLabel={rowHeaderLabel}
            disabled={disabled}
            canAddMore={canAddMore}
            canRemove={canRemove}
            getColumnDefForRow={getColumnDefForRow}
            isDefaultLockedCell={isDefaultLockedCell}
            hasChildren={hasChildren}
            showRowLabelColumn={showRowLabelColumn}
            addColumn={addColumn}
            removeColumn={removeColumn}
            updateCellByRow={updateCellByRow}
          />
        ) : (
        <>
        <div className='border rounded-lg overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-muted/50'>
                {groupedHeaders.hasGroups &&
                  groupedHeaders.groupRows.map((row, rowIndex) => (
                    <tr key={`group-row-${rowIndex}`} className='bg-muted/30'>
                      {showSerialColumn && rowIndex === 0 && (
                        <th
                          className='p-2 text-center text-sm font-medium text-muted-foreground border-r min-w-[52px]'
                          rowSpan={headerRowSpan}>
                          {serialNumberLabel}
                        </th>
                      )}
                      {showRowLabelColumn && rowIndex === 0 && (
                        <th
                          className='p-2 text-left text-sm font-medium text-muted-foreground border-r'
                          rowSpan={headerRowSpan}>
                          {rowHeaderLabel}
                        </th>
                      )}
                      {row.map((cell) => (
                        <th
                          key={cell.key}
                          colSpan={cell.colSpan}
                          rowSpan={cell.rowSpan}
                          className='text-center p-2 text-sm font-medium text-muted-foreground border-l'>
                          {cell.label || '\u00A0'}
                        </th>
                      ))}
                      {!hasFixedRows && rowIndex === 0 && (
                        <th
                          className='w-24 p-2 border-l text-center text-sm font-medium text-muted-foreground'
                          rowSpan={headerRowSpan}>
                          Actions
                        </th>
                      )}
                    </tr>
                  ))}

                <tr>
                  {showSerialColumn && !groupedHeaders.hasGroups && (
                    <th className='p-2 text-center text-sm font-medium text-muted-foreground border-r min-w-[52px]'>
                      {serialNumberLabel}
                    </th>
                  )}
                  {showRowLabelColumn && !groupedHeaders.hasGroups && (
                    <th className='p-2 text-left text-sm font-medium text-muted-foreground border-r'>
                      {rowHeaderLabel}
                    </th>
                  )}
                  {columns.map((col) => {
                    const colWidth = 'width' in col ? col.width : undefined;
                    return (
                      <th
                        key={col.id}
                        className='text-left p-2 text-sm font-medium text-muted-foreground border-l'
                        style={
                          colWidth
                            ? {
                                width: `${colWidth}px`,
                                minWidth: `${colWidth}px`,
                              }
                            : undefined
                        }>
                        {col.label}
                        {col.required && (
                          <span className='text-red-500 ml-1'>*</span>
                        )}
                      </th>
                    );
                  })}
                  {!hasFixedRows && !groupedHeaders.hasGroups && (
                    <th className='w-24 p-2 border-l text-center text-sm font-medium text-muted-foreground'>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={cn(
                      'border-t transition-colors',
                      'hover:bg-muted/20',
                    )}>
                    {showSerialColumn && (
                      <td className='p-2 border-r bg-muted/30 text-sm font-medium text-center text-muted-foreground tabular-nums'>
                        {rowIndex + 1}
                      </td>
                    )}
                    {showRowLabelColumn && (
                      <td className='p-2 border-r bg-muted/20 text-sm font-medium'>
                        {rowDefinitions[rowIndex]?.name ||
                          rowDefinitions[rowIndex]?.label ||
                          rowIndex + 1}
                      </td>
                    )}
                    {/* Cells */}
                    {columns.map((col) => (
                      <td key={col.id} className=' border-l'>
                        {renderCell(
                          col,
                          row[col.id],
                          (val) => updateCell(rowIndex, col.id, val),
                          disabled ||
                            isDefaultLockedCell(rowIndex, col.id) ||
                            (showRowLabelColumn &&
                              col.type === 'number' &&
                              hasChildren(rowDefinitions[rowIndex]?.id || '')),
                        )}
                      </td>
                    ))}

                    {!hasFixedRows && (
                      <td className='bg-gray-50 border-l'>
                        <div className='flex items-center justify-center'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => removeRow(rowIndex)}
                            disabled={disabled || !canRemove}
                            className={cn(
                              'h-7 w-7',
                              canRemove &&
                                'text-muted-foreground hover:text-red-600 hover:bg-red-50',
                            )}>
                            <Trash2 className='w-3 h-3' />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}

                {/* Empty state */}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        columns.length +
                        (hasFixedRows ? 0 : 1) +
                        (showRowLabelColumn ? 1 : 0) +
                        (showSerialColumn ? 1 : 0)
                      }
                      className='p-8 text-center text-muted-foreground'>
                      <p className='text-sm'>No rows added yet</p>
                      {minRows > 0 && (
                        <p className='text-xs mt-1'>
                          Minimum {minRows} row{minRows > 1 ? 's' : ''} required
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Footer for totals */}
              {field.showTableFooter !== false && rows.length > 0 && (
                <tfoot className='bg-muted/30 border-t'>
                  <tr>
                    {showSerialColumn && <td className='p-2 border-r'></td>}
                    {showRowLabelColumn && <td className='p-2 border-r'></td>}
                    {columns.map((col) => {
                      // Show sum if explicitly set to true, or by default for number/calculated columns
                      const showSum =
                        'showSum' in col ? col.showSum : undefined;
                      const shouldShowSum =
                        showSum !== undefined
                          ? showSum
                          : col.type === 'number' || col.type === 'calculated';

                      return (
                        <td
                          key={col.id}
                          className='p-2 border-l text-sm font-bold'>
                          {shouldShowSum
                            ? calculateTotal(col.id).toLocaleString()
                            : ''}
                        </td>
                      );
                    })}
                    {!hasFixedRows && <td className='p-2 border-l'></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Add row button */}
        {!hasFixedRows && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={addRow}
            disabled={disabled || !canAddMore}
            className={cn(
              'w-full border-dashed',
              canAddMore && 'hover:border-primary hover:text-primary',
            )}>
            <Plus className='w-4 h-4 mr-2' />
            Add Row
          </Button>
        )}
        </>
        )}
      </div>
    </FieldWrapper>
  );
}

interface TransposedTableProps {
  field: ContainerFieldProps['field'];
  rows: TableRow[];
  rowDefinitions: FormField['tableRows'];
  rowHeaderLabel: string;
  disabled?: boolean;
  canAddMore: boolean;
  canRemove: boolean;
  showRowLabelColumn: boolean;
  getColumnDefForRow: (rowIndex: number) => TableColumn | FormField;
  isDefaultLockedCell: (rowIndex: number, columnId: string) => boolean;
  hasChildren: (rowId: string) => boolean;
  addColumn: () => void;
  removeColumn: (index: number) => void;
  updateCellByRow: (
    instanceIndex: number,
    rowDefIndex: number,
    rowId: string,
    cellValue: any,
  ) => void;
}

function TransposedTable({
  field,
  rows,
  rowDefinitions = [],
  rowHeaderLabel,
  disabled,
  canAddMore,
  canRemove,
  showRowLabelColumn,
  getColumnDefForRow,
  isDefaultLockedCell,
  hasChildren,
  addColumn,
  removeColumn,
  updateCellByRow,
}: TransposedTableProps) {
  const defs = rowDefinitions ?? [];

  const shouldShowSumForRow = (rowDefIndex: number) => {
    const col = getColumnDefForRow(rowDefIndex);
    const showSum = 'showSum' in col ? col.showSum : undefined;
    return showSum !== undefined
      ? showSum
      : col.type === 'number' || col.type === 'calculated';
  };

  const calculateRowDefTotal = (rowDefIndex: number) => {
    if (!shouldShowSumForRow(rowDefIndex)) return null;
    const rowDef = defs[rowDefIndex];
    return rows.reduce((sum, instance) => {
      const val = parseFloat(String(instance[rowDef.id] || 0));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  };

  return (
    <>
      <div className='border rounded-lg overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-muted/50'>
              <tr>
                {showRowLabelColumn && (
                  <th className='p-2 text-left text-sm font-medium text-muted-foreground border-r min-w-[120px]'>
                    {rowHeaderLabel}
                  </th>
                )}
                {rows.map((_, instanceIndex) => (
                  <th
                    key={instanceIndex}
                    className='border-l min-w-[140px] p-2'
                    aria-label={`Entry ${instanceIndex + 1}`}
                  />
                ))}
                <th className='w-28 p-2 border-l text-center text-sm font-medium text-muted-foreground'>
                  {field.showTableFooter !== false ? 'Total' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={(showRowLabelColumn ? 1 : 0) + 1}
                    className='p-8 text-center text-muted-foreground'>
                    <p className='text-sm'>No columns added yet</p>
                  </td>
                </tr>
              ) : (
                <>
                  <tr className='border-t'>
                    {showRowLabelColumn && <td className='border-r' />}
                    {rows.map((_, instanceIndex) => (
                      <td key={instanceIndex} className='bg-gray-50 border-l'>
                        <div className='flex items-center justify-center'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => removeColumn(instanceIndex)}
                            disabled={disabled || !canRemove}
                            className={cn(
                              'h-7 w-7',
                              canRemove &&
                                'text-muted-foreground hover:text-red-600 hover:bg-red-50',
                            )}>
                            <Trash2 className='w-3 h-3' />
                          </Button>
                        </div>
                      </td>
                    ))}
                    <td className='border-l' />
                  </tr>
                  {defs.map((rowDef, rowDefIndex) => (
                    <tr key={rowDef.id} className='border-t hover:bg-muted/20'>
                      {showRowLabelColumn && (
                        <td className='p-2 border-r bg-muted/20 text-sm font-medium'>
                          {rowDef.name || rowDef.label || rowDefIndex + 1}
                        </td>
                      )}
                      {rows.map((instance, instanceIndex) => {
                        const col = getColumnDefForRow(rowDefIndex);
                        return (
                          <td key={instanceIndex} className='border-l'>
                            {renderCell(
                              col,
                              instance[rowDef.id],
                              (val) =>
                                updateCellByRow(
                                  instanceIndex,
                                  rowDefIndex,
                                  rowDef.id,
                                  val,
                                ),
                              disabled ||
                                isDefaultLockedCell(rowDefIndex, col.id) ||
                                (showRowLabelColumn &&
                                  col.type === 'number' &&
                                  hasChildren(rowDef.id)),
                            )}
                          </td>
                        );
                      })}
                      <td className='border-l bg-muted/20 p-2 text-sm font-bold text-right align-middle'>
                        {field.showTableFooter !== false &&
                        rows.length > 0 ? (
                          (() => {
                            const total = calculateRowDefTotal(rowDefIndex);
                            return total !== null
                              ? total.toLocaleString()
                              : '';
                          })()
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className='flex gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={addColumn}
          disabled={disabled || !canAddMore}
          className={cn(
            'flex-1 border-dashed',
            canAddMore && 'hover:border-primary hover:text-primary',
          )}>
          <Plus className='w-4 h-4 mr-2' />
          Add Column
        </Button>
      </div>
    </>
  );
}

// Render cell based on column type
function renderCell(
  column: TableColumn | FormField,
  value: any,
  onChange: (value: any) => void,
  disabled?: boolean,
) {
  const colType = column.type;
  const placeholder = 'placeholder' in column ? column.placeholder : undefined;

  const commonProps = {
    value: value ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange(
        colType === 'number'
          ? e.target.value === ''
            ? null
            : Number(e.target.value)
          : e.target.value,
      ),
    disabled,
    className: 'h-8 text-sm border-none rounded-none',
    placeholder,
  };

  switch (colType) {
    case 'number':
      const validation = 'validation' in column ? column.validation : undefined;
      return (
        <Input
          type='number'
          {...commonProps}
          min={validation?.min}
          max={validation?.max}
        />
      );

    case 'select':
    case 'multi_select':
      const options = 'options' in column ? column.options : [];
      return (
        <select
          {...commonProps}
          className='w-full h-8 text-sm border rounded px-2 bg-background'>
          <option value=''>Select...</option>
          {(options || []).map((opt) => (
            <option
              key={typeof opt === 'string' ? opt : opt}
              value={typeof opt === 'string' ? opt : opt}>
              {typeof opt === 'string' ? opt : opt}
            </option>
          ))}
        </select>
      );

    case 'checkbox':
      return (
        <input
          type='checkbox'
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className='h-4 w-4 rounded border-gray-300'
        />
      );

    case 'date':
      return <Input type='date' {...commonProps} />;

    case 'email':
      return <Input type='email' {...commonProps} />;

    case 'calculated':
      return (
        <div className='relative'>
          <Input
            type='text'
            {...commonProps}
            readOnly
            className={cn(
              commonProps.className,
              'bg-muted/30 pr-8 font-medium',
            )}
          />
          <Calculator
            aria-disabled
            className='w-3 h-3 cursor-not-allowed absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50'
          />
        </div>
      );

    case 'text':
    default:
      return <Input type='text' {...commonProps} />;
  }
}
