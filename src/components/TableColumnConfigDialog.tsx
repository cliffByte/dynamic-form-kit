'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical, Settings2 } from 'lucide-react';
import {
  TableColumn,
  TableColumnGroup,
  TableCellDefault,
  TableRowConfig,
} from '../types/form';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { generateUUID } from '../lib/utils';
import { buildGroupedTableHeaders } from '../lib/tableGrouping';

interface TableColumnConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  columns: TableColumn[];
  columnGroups: TableColumnGroup[];
  tableRows?: TableRowConfig[];
  tableRowHeaderLabel?: string;
  cellDefaults?: TableCellDefault[];
  tableExpandDirection?: 'rows' | 'columns';
  tableShowSerialNumber?: boolean;
  tableSerialNumberLabel?: string;
  onSave: (
    columns: TableColumn[],
    columnGroups: TableColumnGroup[],
    tableRows: TableRowConfig[],
    tableRowHeaderLabel: string,
    cellDefaults?: TableCellDefault[],
    rowCount?: number,
    tableOptions?: {
      showSerialNumber?: boolean;
      serialNumberLabel?: string;
    },
  ) => void;
}

export function TableColumnConfigDialog({
  isOpen,
  onClose,
  columns: initialColumns,
  columnGroups: initialColumnGroups,
  tableRows: initialTableRows = [],
  tableRowHeaderLabel: initialTableRowHeaderLabel = 'Row',
  cellDefaults: initialCellDefaults = [],
  tableExpandDirection = 'rows',
  tableShowSerialNumber: initialShowSerialNumber = false,
  tableSerialNumberLabel: initialSerialNumberLabel = 'SN',
  onSave,
}: TableColumnConfigDialogProps) {
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [columnGroups, setColumnGroups] = useState<TableColumnGroup[]>([]);
  const [tableRows, setTableRows] = useState<TableRowConfig[]>([]);
  const [cellDefaults, setCellDefaults] = useState<TableCellDefault[]>([]);
  const [tableRowHeaderLabel, setTableRowHeaderLabel] = useState<string>('Row');
  const [showSerialNumber, setShowSerialNumber] = useState(false);
  const [serialNumberLabel, setSerialNumberLabel] = useState('SN');
  const expandByColumns = tableExpandDirection === 'columns';
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'columns' | 'groups' | 'defaults'>(
    'columns',
  );
  useEffect(() => {
    if (isOpen) {
      setColumns([...initialColumns]);
      setColumnGroups([...initialColumnGroups]);
      const normalizedRows =
        initialTableRows.length > 0
          ? initialTableRows.map((row) => ({
              ...row,
              name: row.name || row.label,
            }))
          : [];
      setTableRows(normalizedRows);
      setCellDefaults([...initialCellDefaults]);
      setTableRowHeaderLabel(initialTableRowHeaderLabel || 'Row');
      setShowSerialNumber(initialShowSerialNumber);
      setSerialNumberLabel(initialSerialNumberLabel || 'SN');
      setSelectedColumnId(
        initialColumns.length > 0 ? initialColumns[0].id : null,
      );
    }
  }, [
    isOpen,
    initialColumns,
    initialColumnGroups,
    initialCellDefaults,
    initialTableRows,
    initialTableRowHeaderLabel,
    initialShowSerialNumber,
    initialSerialNumberLabel,
  ]);

  const handleSave = () => {
    const rowCount = tableRows.length;
    onSave(
      columns,
      columnGroups,
      tableRows,
      tableRowHeaderLabel || 'Row',
      cellDefaults.length > 0 ? cellDefaults : undefined,
      rowCount,
      !expandByColumns
        ? {
            showSerialNumber,
            serialNumberLabel: serialNumberLabel.trim() || 'SN',
          }
        : undefined,
    );
    onClose();
  };

  const addColumn = () => {
    const newColumn: TableColumn = {
      id: `col-${generateUUID().slice(0, 8)}`,
      label: `Column ${columns.length + 1}`,
      type: 'text',
    };
    setColumns([...columns, newColumn]);
    setSelectedColumnId(newColumn.id);
  };

  const updateColumn = (columnId: string, updates: Partial<TableColumn>) => {
    setColumns(
      columns.map((col) =>
        col.id === columnId ? { ...col, ...updates } : col,
      ),
    );
  };

  const deleteColumn = (columnId: string) => {
    setColumns(columns.filter((col) => col.id !== columnId));
    // Also remove from any groups
    setColumnGroups(
      columnGroups.map((group) => ({
        ...group,
        columnIds: group.columnIds.filter((id) => id !== columnId),
      })),
    );
    if (selectedColumnId === columnId) {
      setSelectedColumnId(columns.length > 1 ? columns[0].id : null);
    }
  };

  const moveColumn = (fromIndex: number, toIndex: number) => {
    const newColumns = [...columns];
    const [removed] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, removed);
    setColumns(newColumns);
  };

  const addColumnGroup = () => {
    const newGroup: TableColumnGroup = {
      id: `group-${generateUUID().slice(0, 8)}`,
      label: `Group ${columnGroups.length + 1}`,
      columnIds: [],
    };
    setColumnGroups([...columnGroups, newGroup]);
  };

  const updateColumnGroup = (
    groupId: string,
    updates: Partial<TableColumnGroup>,
  ) => {
    setColumnGroups(
      columnGroups.map((group) =>
        group.id === groupId ? { ...group, ...updates } : group,
      ),
    );
  };

  const deleteColumnGroup = (groupId: string) => {
    setColumnGroups(
      columnGroups
        .filter((group) => group.id !== groupId)
        .map((group) =>
          group.parentGroupId === groupId
            ? { ...group, parentGroupId: undefined }
            : group,
        ),
    );
  };

  const getDescendantGroupIds = (groupId: string): Set<string> => {
    const descendants = new Set<string>();

    const walk = (parentId: string) => {
      columnGroups.forEach((group) => {
        if (group.parentGroupId === parentId && !descendants.has(group.id)) {
          descendants.add(group.id);
          walk(group.id);
        }
      });
    };

    walk(groupId);
    return descendants;
  };

  const getAvailableParentGroups = (groupId: string): TableColumnGroup[] => {
    const descendants = getDescendantGroupIds(groupId);
    return columnGroups.filter(
      (group) => group.id !== groupId && !descendants.has(group.id),
    );
  };

  const canBeChildGroup = (
    parentGroupId: string,
    candidateChildGroupId: string,
  ): boolean => {
    if (parentGroupId === candidateChildGroupId) return false;

    // Prevent cycles: parent cannot be in candidate's descendant chain
    const candidateDescendants = getDescendantGroupIds(candidateChildGroupId);
    if (candidateDescendants.has(parentGroupId)) return false;

    return true;
  };

  const toggleChildGroup = (parentGroupId: string, childGroupId: string) => {
    if (!canBeChildGroup(parentGroupId, childGroupId)) return;

    setColumnGroups(
      columnGroups.map((group) => {
        if (group.id !== childGroupId) return group;

        return {
          ...group,
          parentGroupId:
            group.parentGroupId === parentGroupId ? undefined : parentGroupId,
        };
      }),
    );
  };

  const toggleColumnInGroup = (groupId: string, columnId: string) => {
    setColumnGroups(
      columnGroups.map((group) => {
        if (group.id === groupId) {
          const hasColumn = group.columnIds.includes(columnId);
          return {
            ...group,
            columnIds: hasColumn
              ? group.columnIds.filter((id) => id !== columnId)
              : [...group.columnIds, columnId],
          };
        }
        // Remove from other groups if adding to this one
        if (group.columnIds.includes(columnId)) {
          return {
            ...group,
            columnIds: group.columnIds.filter((id) => id !== columnId),
          };
        }
        return group;
      }),
    );
  };

  const getChildRows = (parentRowId?: string): TableRowConfig[] =>
    tableRows.filter((row) => row.parentRowId === parentRowId);

  const hasChildren = (rowId: string): boolean =>
    tableRows.some((row) => row.parentRowId === rowId);

  const renumberRows = (rows: TableRowConfig[]): TableRowConfig[] => {
    const byParent = (parentId?: string) =>
      rows.filter((row) => row.parentRowId === parentId);

    const output: TableRowConfig[] = [];

    const walk = (parentId: string | undefined, prefix: string) => {
      const children = byParent(parentId);
      children.forEach((row, index) => {
        const nextLabel = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
        output.push({
          ...row,
          label: nextLabel,
          name: row.name || nextLabel,
        });
        walk(row.id, nextLabel);
      });
    };

    walk(undefined, '');
    return output;
  };

  const getDescendantRowIds = (rowId: string): Set<string> => {
    const descendants = new Set<string>();

    const walk = (parentId: string) => {
      tableRows.forEach((row) => {
        if (row.parentRowId === parentId && !descendants.has(row.id)) {
          descendants.add(row.id);
          walk(row.id);
        }
      });
    };

    walk(rowId);
    return descendants;
  };

  const addRootRow = () => {
    const nextRows = renumberRows([
      ...tableRows,
      {
        id: `row-${generateUUID().slice(0, 8)}`,
        label: '',
        name: '',
      },
    ]);
    setTableRows(nextRows);
  };

  const addChildRow = (parentRowId: string) => {
    const nextRows = renumberRows([
      ...tableRows,
      {
        id: `row-${generateUUID().slice(0, 8)}`,
        label: '',
        name: '',
        parentRowId,
      },
    ]);
    setTableRows(nextRows);
  };

  const updateRowName = (rowId: string, name: string) => {
    setTableRows(
      tableRows.map((row) => (row.id === rowId ? { ...row, name } : row)),
    );
  };

  const deleteRow = (rowId: string) => {
    const descendants = getDescendantRowIds(rowId);
    descendants.add(rowId);

    const nextRows = renumberRows(
      tableRows.filter((row) => !descendants.has(row.id)),
    );
    setTableRows(nextRows);
    setCellDefaults(
      cellDefaults.filter((d) => !d.rowId || !descendants.has(d.rowId)),
    );
  };

  const getRawCellDefault = (row: TableRowConfig, columnId: string): any => {
    const rowIndex = tableRows.findIndex((r) => r.id === row.id);
    const def = cellDefaults.find(
      (d) =>
        d.columnId === columnId &&
        ((d.rowId && d.rowId === row.id) ||
          (!d.rowId && d.rowIndex === rowIndex)),
    );
    return def?.value ?? '';
  };

  const getComputedNumericValue = (
    row: TableRowConfig,
    columnId: string,
  ): number => {
    const children = getChildRows(row.id);
    if (children.length === 0) {
      const value = Number(getRawCellDefault(row, columnId));
      return isNaN(value) ? 0 : value;
    }

    return children.reduce(
      (sum, child) => sum + getComputedNumericValue(child, columnId),
      0,
    );
  };

  const getCellDefault = (row: TableRowConfig, column: TableColumn): any => {
    if (column.type === 'number' && hasChildren(row.id)) {
      return getComputedNumericValue(row, column.id);
    }
    return getRawCellDefault(row, column.id);
  };

  const setCellDefault = (
    row: TableRowConfig,
    column: TableColumn,
    value: any,
  ) => {
    if (column.type === 'number' && hasChildren(row.id)) {
      return;
    }

    const rowIndex = tableRows.findIndex((r) => r.id === row.id);
    const existingIndex = cellDefaults.findIndex(
      (d) =>
        d.columnId === column.id &&
        ((d.rowId && d.rowId === row.id) ||
          (!d.rowId && d.rowIndex === rowIndex)),
    );

    if (existingIndex >= 0) {
      if (value === '' || value === null || value === undefined) {
        setCellDefaults(cellDefaults.filter((_, i) => i !== existingIndex));
      } else {
        const nextDefaults = [...cellDefaults];
        nextDefaults[existingIndex] = {
          rowIndex,
          rowId: row.id,
          columnId: column.id,
          value,
        };
        setCellDefaults(nextDefaults);
      }
    } else if (value !== '' && value !== null && value !== undefined) {
      setCellDefaults([
        ...cellDefaults,
        {
          rowIndex,
          rowId: row.id,
          columnId: column.id,
          value,
        },
      ]);
    }
  };

  const selectedColumn = columns.find((col) => col.id === selectedColumnId);
  const groupedHeaders = buildGroupedTableHeaders(columns, columnGroups);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-100 rounded-lg'>
              <Settings2 className='w-5 h-5 text-blue-600' />
            </div>
            <div>
              <h2 className='text-xl font-bold text-gray-900'>
                Configure Table
              </h2>
              <p className='text-sm text-gray-500'>
                Define columns, rows, and default values. Set both rows and
                columns for matrix mode.
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'>
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Tabs */}
        <div className='flex border-b px-6'>
          <button
            type='button'
            onClick={() => setActiveTab('columns')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'columns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            Columns ({columns.length})
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'groups'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            Column Groups ({columnGroups.length})
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('defaults')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'defaults'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            Default Values ({cellDefaults.length})
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 flex overflow-hidden'>
          {activeTab === 'columns' ? (
            <>
              {/* Column List */}
              <div className='w-1/3 border-r overflow-y-auto bg-gray-50'>
                <div className='p-4'>
                  <div className='flex items-center justify-between mb-4'>
                    <h3 className='font-semibold text-gray-700'>Columns</h3>
                    <Button
                      type='button'
                      size='sm'
                      onClick={addColumn}
                      className='gap-1'>
                      <Plus className='w-4 h-4' />
                      Add
                    </Button>
                  </div>

                  <div className='space-y-2'>
                    {columns.map((column, index) => (
                      <div
                        key={column.id}
                        onClick={() => setSelectedColumnId(column.id)}
                        className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                          selectedColumnId === column.id
                            ? 'bg-blue-100 border-2 border-blue-400'
                            : 'bg-white border border-gray-200 hover:border-blue-300'
                        }`}>
                        <GripVertical className='w-4 h-4 text-gray-400 cursor-move' />
                        <div className='flex-1 min-w-0'>
                          <div className='font-medium text-sm truncate'>
                            {column.label}
                          </div>
                          <div className='flex items-center gap-2 mt-1'>
                            <Badge variant='secondary' className='text-xs'>
                              {column.type}
                            </Badge>
                            {column.required && (
                              <Badge variant='destructive' className='text-xs'>
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteColumn(column.id);
                          }}
                          className='opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all'>
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                    ))}

                    {columns.length === 0 && (
                      <div className='text-center py-8 text-gray-500'>
                        <p className='text-sm'>No columns yet</p>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={addColumn}
                          className='mt-2'>
                          Add your first column
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Column Editor */}
              <div className='flex-1 overflow-y-auto p-4'>
                {selectedColumn ? (
                  <div className='max-w-lg space-y-4'>
                    <div>
                      <h3 className='text-lg font-semibold mb-4'>
                        Edit Column: {selectedColumn.label}
                      </h3>
                    </div>

                    {/* Column ID - Auto-generated, read-only */}
                    <div className='p-2 bg-muted/50 rounded-lg'>
                      <div className='flex items-center justify-between'>
                        <span className='text-xs text-muted-foreground'>
                          Column ID:
                        </span>
                        <code className='text-xs font-mono bg-muted px-2 py-0.5 rounded'>
                          {selectedColumn.id}
                        </code>
                      </div>
                    </div>

                    {/* Column Label */}
                    <div className='space-y-2'>
                      <Label htmlFor='col-label'>Label</Label>
                      <Input
                        id='col-label'
                        value={selectedColumn.label}
                        onChange={(e) =>
                          updateColumn(selectedColumn.id, {
                            label: e.target.value,
                          })
                        }
                        placeholder='Column Label'
                      />
                    </div>

                    {/* Column Type */}
                    <div className='space-y-2'>
                      <Label>Type</Label>
                      <Select
                        value={selectedColumn.type}
                        onValueChange={(value) =>
                          updateColumn(selectedColumn.id, {
                            type: value as TableColumn['type'],
                          })
                        }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='text'>Text</SelectItem>
                          <SelectItem value='number'>Number</SelectItem>
                          <SelectItem value='select'>
                            Select (Dropdown)
                          </SelectItem>
                          <SelectItem value='multi_select'>
                            Multi Select (Multiple Choice)
                          </SelectItem>
                          <SelectItem value='calculated'>
                            Calculated (Formula)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Placeholder */}
                    {(selectedColumn.type === 'text' ||
                      selectedColumn.type === 'number') && (
                      <div className='space-y-2'>
                        <Label htmlFor='col-placeholder'>Placeholder</Label>
                        <Input
                          id='col-placeholder'
                          value={selectedColumn.placeholder || ''}
                          onChange={(e) =>
                            updateColumn(selectedColumn.id, {
                              placeholder: e.target.value,
                            })
                          }
                          placeholder='Enter placeholder text...'
                        />
                      </div>
                    )}

                    {/* Options for select/multi_select */}
                    {(selectedColumn.type === 'select' ||
                      selectedColumn.type === 'multi_select') && (
                      <div className='space-y-2'>
                        <Label>Options</Label>
                        <Textarea
                          value={selectedColumn.options?.join('\n') || ''}
                          onChange={(e) =>
                            updateColumn(selectedColumn.id, {
                              options: e.target.value
                                .split('\n')
                                .filter((line) => line.trim()),
                            })
                          }
                          placeholder='Enter options (one per line)&#10;Option 1&#10;Option 2&#10;Option 3'
                          rows={5}
                        />
                        <p className='text-xs text-gray-500'>
                          Enter each option on a new line
                        </p>
                      </div>
                    )}
                    {/* Width */}
                    <div className='space-y-2'>
                      <Label htmlFor='col-width'>
                        Column Width (px, optional)
                      </Label>
                      <Input
                        id='col-width'
                        type='number'
                        value={selectedColumn.width ?? ''}
                        onChange={(e) =>
                          updateColumn(selectedColumn.id, {
                            width: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder='Auto'
                      />
                    </div>

                    {/* Formula for calculated */}
                    {selectedColumn.type === 'calculated' && (
                      <div className='space-y-2'>
                        <Label htmlFor='col-formula'>Formula</Label>
                        <Input
                          id='col-formula'
                          value={selectedColumn.formula || ''}
                          onChange={(e) =>
                            updateColumn(selectedColumn.id, {
                              formula: e.target.value,
                            })
                          }
                          placeholder='Click columns below to build formula'
                          className='font-mono'
                        />
                        {/* Formula Legend - show what each ID means */}
                        {selectedColumn.formula && (
                          <div className='p-2 bg-gray-50 rounded text-xs'>
                            <span className='text-gray-500'>
                              Formula uses:{' '}
                            </span>
                            {(() => {
                              const ids =
                                selectedColumn.formula.match(/\{([^}]+)\}/g) ||
                                [];
                              const uniqueIds = Array.from(
                                new Set(ids.map((id) => id.slice(1, -1))),
                              );
                              return uniqueIds.map((id, idx) => {
                                const col = columns.find((c) => c.id === id);
                                return (
                                  <span key={id}>
                                    {idx > 0 && ', '}
                                    <span className='font-medium'>
                                      {col?.label || id}
                                    </span>
                                  </span>
                                );
                              });
                            })()}
                          </div>
                        )}
                        <div className='p-3 bg-blue-50 rounded-lg text-sm'>
                          <p className='font-medium text-blue-800 mb-1'>
                            Click to add column:
                          </p>
                          <div className='flex flex-wrap gap-1'>
                            {columns
                              .filter(
                                (c) =>
                                  c.id !== selectedColumn.id &&
                                  (c.type === 'number' ||
                                    c.type === 'calculated'),
                              )
                              .map((c) => (
                                <Badge
                                  key={c.id}
                                  variant='outline'
                                  className='text-xs cursor-pointer hover:bg-blue-100'
                                  onClick={() => {
                                    const newFormula =
                                      (selectedColumn.formula || '') +
                                      `{${c.id}}`;
                                    updateColumn(selectedColumn.id, {
                                      formula: newFormula,
                                    });
                                  }}>
                                  {c.label}
                                </Badge>
                              ))}
                          </div>
                          {columns.filter(
                            (c) =>
                              c.id !== selectedColumn.id &&
                              (c.type === 'number' || c.type === 'calculated'),
                          ).length === 0 && (
                            <p className='text-xs text-blue-600 italic'>
                              No number or calculated columns available yet
                            </p>
                          )}
                        </div>
                        {/* Operator buttons */}
                        <div className='flex items-center gap-2 mt-2'>
                          <span className='text-xs text-gray-500'>
                            Operators:
                          </span>
                          {['+', '-', '*', '/', '(', ')'].map((op) => (
                            <button
                              key={op}
                              type='button'
                              onClick={() => {
                                const newFormula =
                                  (selectedColumn.formula || '') + op;
                                updateColumn(selectedColumn.id, {
                                  formula: newFormula,
                                });
                              }}
                              className='w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-sm font-mono font-bold'>
                              {op}
                            </button>
                          ))}
                          <button
                            type='button'
                            onClick={() => {
                              updateColumn(selectedColumn.id, { formula: '' });
                            }}
                            className='ml-auto text-xs text-red-500 hover:text-red-700'>
                            Clear
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Toggles: Required & Hidden & Show Sum */}
                    <div className='flex flex-wrap items-center gap-x-6 gap-y-3'>
                      <div className='flex items-center gap-3'>
                        <input
                          type='checkbox'
                          id='col-required'
                          checked={selectedColumn.required || false}
                          onChange={(e) =>
                            updateColumn(selectedColumn.id, {
                              required: e.target.checked,
                            })
                          }
                          className='w-4 h-4 rounded border-gray-300'
                        />
                        <Label
                          htmlFor='col-required'
                          className='cursor-pointer'>
                          Required field
                        </Label>
                      </div>

                      <div className='flex items-center gap-3'>
                        <input
                          type='checkbox'
                          id='col-hidden'
                          checked={selectedColumn.isHidden || false}
                          onChange={(e) =>
                            updateColumn(selectedColumn.id, {
                              isHidden: e.target.checked,
                            })
                          }
                          className='w-4 h-4 rounded border-gray-300'
                        />
                        <Label htmlFor='col-hidden' className='cursor-pointer'>
                          Hidden field
                        </Label>
                      </div>

                      {(selectedColumn.type === 'number' ||
                        selectedColumn.type === 'calculated') && (
                        <div className='flex items-center gap-3'>
                          <input
                            type='checkbox'
                            id='col-show-sum'
                            checked={selectedColumn.showSum !== false}
                            onChange={(e) =>
                              updateColumn(selectedColumn.id, {
                                showSum: e.target.checked,
                              })
                            }
                            className='w-4 h-4 rounded border-gray-300'
                          />
                          <Label
                            htmlFor='col-show-sum'
                            className='cursor-pointer text-blue-600 font-medium'>
                            Show Sum in Footer
                          </Label>
                        </div>
                      )}
                    </div>

                    {/* Validation for number */}
                    {selectedColumn.type === 'number' && (
                      <Card>
                        <CardHeader className='py-3'>
                          <CardTitle className='text-sm'>
                            Number Validation
                          </CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-3'>
                          <div className='grid grid-cols-2 gap-3'>
                            <div className='space-y-1'>
                              <Label className='text-xs'>Min Value</Label>
                              <Input
                                type='number'
                                value={selectedColumn.validation?.min ?? ''}
                                onChange={(e) =>
                                  updateColumn(selectedColumn.id, {
                                    validation: {
                                      ...selectedColumn.validation,
                                      min: e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                    },
                                  })
                                }
                                placeholder='No min'
                              />
                            </div>
                            <div className='space-y-1'>
                              <Label className='text-xs'>Max Value</Label>
                              <Input
                                type='number'
                                value={selectedColumn.validation?.max ?? ''}
                                onChange={(e) =>
                                  updateColumn(selectedColumn.id, {
                                    validation: {
                                      ...selectedColumn.validation,
                                      max: e.target.value
                                        ? Number(e.target.value)
                                        : undefined,
                                    },
                                  })
                                }
                                placeholder='No max'
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className='flex items-center justify-center h-full text-gray-500'>
                    <div className='text-center'>
                      <Settings2 className='w-12 h-12 mx-auto mb-3 text-gray-300' />
                      <p>Select a column to edit its properties</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'groups' ? (
            /* Column Groups Tab */
            <div className='flex-1 overflow-y-auto p-4'>
              <div className='max-w-2xl mx-auto'>
                <div className='flex items-center justify-between mb-4'>
                  <div>
                    <h3 className='text-lg font-semibold'>Column Groups</h3>
                    <p className='text-sm text-gray-500'>
                      Group multiple columns under a single header (e.g.,
                      "Dimensions" for length, breadth, height)
                    </p>
                  </div>
                  <Button
                    type='button'
                    onClick={addColumnGroup}
                    className='gap-1'>
                    <Plus className='w-4 h-4' />
                    Add Group
                  </Button>
                </div>

                <div className='space-y-4'>
                  {columnGroups.map((group) => (
                    <Card key={group.id} className='border-blue-200'>
                      <CardHeader className='py-3 bg-blue-50/50'>
                        <div className='flex items-center justify-between'>
                          <Input
                            value={group.label}
                            onChange={(e) =>
                              updateColumnGroup(group.id, {
                                label: e.target.value,
                              })
                            }
                            placeholder='Group Label'
                            className='max-w-xs font-medium'
                          />
                          <button
                            type='button'
                            onClick={() => deleteColumnGroup(group.id)}
                            className='p-2 text-red-500 hover:bg-red-50 rounded-lg'>
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent className='py-4 space-y-4'>
                        <div className='p-3 rounded-lg border border-blue-100 bg-blue-50/30 space-y-2'>
                          <Label className='text-sm text-gray-600 block'>
                            Parent Group (optional)
                          </Label>
                          <Select
                            value={group.parentGroupId || '__none__'}
                            onValueChange={(value) =>
                              updateColumnGroup(group.id, {
                                parentGroupId:
                                  value === '__none__' ? undefined : value,
                              })
                            }>
                            <SelectTrigger className='max-w-xs'>
                              <SelectValue placeholder='No parent (top level)' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='__none__'>
                                No parent (top level)
                              </SelectItem>
                              {getAvailableParentGroups(group.id).map(
                                (parentGroup) => (
                                  <SelectItem
                                    key={parentGroup.id}
                                    value={parentGroup.id}>
                                    {parentGroup.label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className='p-3 rounded-lg border border-indigo-100 bg-indigo-50/30 space-y-2'>
                          <Label className='text-sm text-gray-600 block'>
                            Combine Child Groups
                          </Label>
                          <div className='flex flex-wrap gap-2'>
                            {columnGroups
                              .filter((candidate) => candidate.id !== group.id)
                              .map((candidate) => {
                                const isAttached =
                                  candidate.parentGroupId === group.id;
                                const isValidChild = canBeChildGroup(
                                  group.id,
                                  candidate.id,
                                );

                                return (
                                  <button
                                    type='button'
                                    key={candidate.id}
                                    onClick={() =>
                                      toggleChildGroup(group.id, candidate.id)
                                    }
                                    disabled={!isValidChild && !isAttached}
                                    className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                                      isAttached
                                        ? 'bg-indigo-500 text-white border-indigo-500'
                                        : !isValidChild
                                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                                    }`}>
                                    {candidate.label}
                                    {isAttached && (
                                      <span className='ml-1 text-xs'>
                                        (child)
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                          </div>
                          {columnGroups.filter(
                            (candidate) => candidate.id !== group.id,
                          ).length === 0 && (
                            <p className='text-xs text-gray-500'>
                              Create more groups to combine them here.
                            </p>
                          )}
                        </div>

                        <div className='p-3 rounded-lg border border-gray-200 bg-gray-50/50'>
                          <Label className='text-sm text-gray-600 mb-3 block'>
                            Select columns for this group:
                          </Label>
                          <div className='flex flex-wrap gap-2'>
                            {columns.map((column) => {
                              const isInGroup = group.columnIds.includes(
                                column.id,
                              );
                              const isInOtherGroup = columnGroups.some(
                                (g) =>
                                  g.id !== group.id &&
                                  g.columnIds.includes(column.id),
                              );
                              return (
                                <button
                                  type='button'
                                  key={column.id}
                                  onClick={() =>
                                    toggleColumnInGroup(group.id, column.id)
                                  }
                                  disabled={isInOtherGroup && !isInGroup}
                                  className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                                    isInGroup
                                      ? 'bg-blue-500 text-white border-blue-500'
                                      : isInOtherGroup
                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                  }`}>
                                  {column.label}
                                  {isInOtherGroup && !isInGroup && (
                                    <span className='ml-1 text-xs'>
                                      (in other group)
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {group.columnIds.length > 0 && (
                          <div className='mt-3 text-xs text-gray-500'>
                            {group.columnIds.length} column(s) selected
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {columnGroups.length === 0 && (
                    <div className='text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed'>
                      <p className='text-gray-500 mb-3'>
                        No column groups defined
                      </p>
                      <p className='text-sm text-gray-400 mb-4'>
                        Groups allow you to combine multiple columns under a
                        single header
                      </p>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={addColumnGroup}>
                        Create your first group
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Default Values Tab */
            <div className='flex-1 overflow-y-auto p-4'>
              <div className='max-w-4xl mx-auto'>
                <div className='mb-4'>
                  <h3 className='text-lg font-semibold mb-2'>
                    Default Cell Values
                  </h3>
                  <p className='text-sm text-gray-500'>
                    Set default values for matrix cells. Cells with default
                    values will be read-only. Use min/max rows to control the
                    number of rows in the matrix.
                  </p>
                </div>

                {columns.length === 0 ? (
                  <div className='text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed'>
                    <p className='text-gray-500 mb-3'>No columns defined yet</p>
                    <p className='text-sm text-gray-400 mb-4'>
                      Please add columns first to set default cell values
                    </p>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    <div className='mb-4 rounded-lg border border-gray-200 p-3 bg-gray-50/50'>
                      <div className='flex items-center gap-2 mb-3'>
                        <Label className='text-sm font-medium min-w-[88px]'>
                          Row Header
                        </Label>
                        <Input
                          value={tableRowHeaderLabel}
                          onChange={(e) =>
                            setTableRowHeaderLabel(e.target.value || 'Row')
                          }
                          placeholder='Row'
                          className='h-8 text-sm max-w-[220px]'
                        />
                      </div>

                      <div className='flex items-center justify-between mb-2'>
                        <Label className='text-sm font-medium'>Rows</Label>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={addRootRow}
                          className='gap-1'>
                          <Plus className='w-3 h-3' /> Add Root Row
                        </Button>
                      </div>
                      <p className='text-xs text-gray-500 mb-3'>
                        Rows are optional for dynamic tables. Add rows only for
                        matrix mode (default cell values) or columns expand mode.
                        Use child rows (e.g., 1.1, 1.2) under a parent; parent
                        number cells sum children automatically.
                      </p>
                      {tableRows.length === 0 ? (
                        <div className='text-center py-6 rounded-lg border-2 border-dashed border-gray-200 bg-white'>
                          <p className='text-sm text-gray-500'>No rows defined</p>
                          <p className='text-xs text-gray-400 mt-1 mb-3'>
                            Click Add Root Row when you need matrix or fixed row
                            labels
                          </p>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            onClick={addRootRow}
                            className='gap-1'>
                            <Plus className='w-3 h-3' /> Add Root Row
                          </Button>
                        </div>
                      ) : (
                      <div className='space-y-2'>
                        {tableRows.map((row) => {
                          const depth = row.label.split('.').length - 1;
                          return (
                            <div
                              key={row.id}
                              className='flex items-center justify-between rounded border bg-white px-2 py-1'>
                              <div
                                className='flex items-center gap-2 flex-1 mr-2'
                                style={{ paddingLeft: `${depth * 16}px` }}>
                                <span className='text-xs text-gray-500 min-w-[42px]'>
                                  {row.label}
                                </span>
                                <Input
                                  value={row.name || ''}
                                  onChange={(e) =>
                                    updateRowName(row.id, e.target.value)
                                  }
                                  placeholder='Row name'
                                  className='h-8 text-sm'
                                />
                              </div>
                              <div className='flex items-center gap-1'>
                                <Button
                                  type='button'
                                  size='sm'
                                  variant='ghost'
                                  className='h-7 px-2 text-xs'
                                  onClick={() => addChildRow(row.id)}>
                                  + Child
                                </Button>
                                <Button
                                  type='button'
                                  size='sm'
                                  variant='ghost'
                                  className='h-7 px-2 text-xs text-red-600 hover:text-red-700'
                                  onClick={() => deleteRow(row.id)}>
                                  Delete
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      )}
                    </div>
                    {tableRows.length > 0 && (
                    <Card>
                      <CardHeader className='py-3 bg-gray-50'>
                        <CardTitle className='text-sm'>
                          Set Default Values
                        </CardTitle>
                      </CardHeader>
                      <CardContent className='py-4'>
                        <div className='overflow-x-auto'>
                          <table className='w-full text-sm border-collapse'>
                            <thead>
                              <tr className='bg-gray-100'>
                                <th className='px-3 py-2 text-left border font-medium min-w-[100px]'>
                                  {tableRowHeaderLabel || 'Row'}
                                </th>
                                {columns.map((col) => (
                                  <th
                                    key={col.id}
                                    className='px-3 py-2 text-left border font-medium min-w-[150px]'>
                                    {col.label}
                                    <Badge
                                      variant='secondary'
                                      className='ml-2 text-xs'>
                                      {col.type}
                                    </Badge>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tableRows.map((row) => {
                                const depth = row.label.split('.').length - 1;
                                return (
                                  <tr key={row.id} className='border-b'>
                                    <td className='px-3 py-2 border bg-gray-50 font-medium'>
                                      <div
                                        style={{
                                          paddingLeft: `${depth * 16}px`,
                                        }}>
                                        {row.name || row.label}
                                      </div>
                                    </td>
                                    {columns.map((col) => {
                                      const currentValue = getCellDefault(
                                        row,
                                        col,
                                      );
                                      const parentNumberCell =
                                        col.type === 'number' &&
                                        hasChildren(row.id);

                                      return (
                                        <td
                                          key={col.id}
                                          className='px-3 py-2 border'>
                                          {col.type === 'text' && (
                                            <Input
                                              type='text'
                                              value={currentValue}
                                              onChange={(e) =>
                                                setCellDefault(
                                                  row,
                                                  col,
                                                  e.target.value,
                                                )
                                              }
                                              placeholder='Default value...'
                                              className='h-8 text-sm'
                                            />
                                          )}
                                          {col.type === 'number' && (
                                            <Input
                                              type='number'
                                              value={currentValue}
                                              onChange={(e) =>
                                                setCellDefault(
                                                  row,
                                                  col,
                                                  e.target.value
                                                    ? Number(e.target.value)
                                                    : '',
                                                )
                                              }
                                              placeholder='0'
                                              disabled={parentNumberCell}
                                              className='h-8 text-sm'
                                            />
                                          )}
                                          {col.type === 'select' && (
                                            <Select
                                              value={String(currentValue)}
                                              onValueChange={(val) =>
                                                setCellDefault(row, col, val)
                                              }>
                                              <SelectTrigger className='h-8 text-sm'>
                                                <SelectValue placeholder='Select...' />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value=''>
                                                  None
                                                </SelectItem>
                                                {col.options?.map((option) => (
                                                  <SelectItem
                                                    key={option}
                                                    value={option}>
                                                    {option}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                          {col.type === 'multi_select' && (
                                            <div className='text-xs text-gray-500'>
                                              Multi-select defaults not
                                              supported
                                            </div>
                                          )}
                                          {col.type === 'calculated' && (
                                            <div className='text-xs text-gray-500 italic'>
                                              Calculated (auto)
                                            </div>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        {columns.length > 0 && (
          <div className='border-t bg-gray-50  overflow-y-auto p-4'>
            <div className='text-xs font-medium text-gray-500 mb-2'>
              {cellDefaults.length > 0
                ? 'Matrix Preview (Default Values)'
                : 'Table Preview'}
            </div>
            <div className='overflow-x-auto bg-white max-h-20 overflow-y-auto rounded-lg border'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-100'>
                  {groupedHeaders.hasGroups &&
                    groupedHeaders.groupRows.map((row, rowIndex) => (
                      <tr key={`group-row-${rowIndex}`} className='bg-blue-50'>
                        {(cellDefaults.length > 0 || tableRows.length > 0) &&
                          rowIndex === 0 && (
                            <th
                              rowSpan={groupedHeaders.maxDepth + 1}
                              className='px-3 py-2 text-center font-semibold border bg-gray-100'>
                              {tableRowHeaderLabel || 'Row'}
                            </th>
                          )}
                        {row.map((cell) => (
                          <th
                            key={cell.key}
                            colSpan={cell.colSpan}
                            rowSpan={cell.rowSpan}
                            className='px-3 py-2 text-center font-semibold border-2 border-blue-200 text-blue-700 bg-blue-50/40'>
                            {cell.label || '\u00A0'}
                          </th>
                        ))}
                      </tr>
                    ))}

                  <tr>
                    {showSerialNumber &&
                      !expandByColumns &&
                      !groupedHeaders.hasGroups && (
                        <th className='px-3 py-2 text-center font-medium border bg-gray-100'>
                          {serialNumberLabel || 'SN'}
                        </th>
                      )}
                    {(cellDefaults.length > 0 || tableRows.length > 0) &&
                      !groupedHeaders.hasGroups && (
                        <th className='px-3 py-2 text-left font-medium border bg-gray-100'>
                          {tableRowHeaderLabel || 'Row'}
                        </th>
                      )}
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        className='px-3 py-2 text-left font-medium border'>
                        {col.label}
                        {col.required && (
                          <span className='text-red-500 ml-1'>*</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cellDefaults.length > 0 || tableRows.length > 0 ? (
                    tableRows.map((row) => {
                      const depth = row.label.split('.').length - 1;
                      return (
                        <tr key={row.id}>
                          <td className='px-3 py-2 border text-xs font-medium bg-gray-50'>
                            <div style={{ paddingLeft: `${depth * 12}px` }}>
                              {row.name || row.label}
                            </div>
                          </td>
                          {columns.map((col) => {
                            const defaultValue = getCellDefault(row, col);
                            return (
                              <td
                                key={col.id}
                                className='px-3 py-2 border text-gray-400 text-xs'>
                                {defaultValue !== ''
                                  ? `(${col.type}: ${defaultValue})`
                                  : `(${col.type})`}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    // Dynamic mode: show single placeholder row
                    <tr>
                      {showSerialNumber && !expandByColumns && (
                        <td className='px-3 py-2 border text-center text-gray-500 text-xs bg-gray-50'>
                          1
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className='px-3 py-2 border text-gray-400 text-xs'>
                          ({col.type})
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!expandByColumns && (
          <div className='border-t px-6 py-4 bg-gray-50/80'>
            <p className='text-xs font-medium text-gray-600 mb-3'>
              Row table options
            </p>
            <div className='flex flex-wrap items-center gap-4'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={showSerialNumber}
                  onChange={(e) => setShowSerialNumber(e.target.checked)}
                  className='w-4 h-4 rounded border-gray-300'
                />
                <span className='text-sm text-gray-700'>
                  Show serial number (SN) column
                </span>
              </label>
              {showSerialNumber && (
                <div className='flex items-center gap-2'>
                  <Label className='text-xs text-gray-600 whitespace-nowrap'>
                    SN header
                  </Label>
                  <Input
                    value={serialNumberLabel}
                    onChange={(e) => setSerialNumberLabel(e.target.value)}
                    placeholder='SN'
                    className='h-8 text-sm w-28'
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className='flex items-center justify-between px-6 py-4 border-t bg-white'>
          <div className='text-sm text-gray-500'>
            {columns.length} column(s), {columnGroups.length} col group(s)
            {cellDefaults.length > 0 && `, ${cellDefaults.length} default(s)`}
            {cellDefaults.length > 0 && columns.length > 0 && (
              <Badge variant='outline' className='ml-2 text-xs'>
                Matrix Mode
              </Badge>
            )}
          </div>
          <div className='flex items-center gap-3'>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button type='button' onClick={handleSave}>
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
