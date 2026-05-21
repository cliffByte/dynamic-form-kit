'use client';

import React from 'react';
import { DisplayFieldProps } from './types';
import { DisplayFieldWrapper } from './DisplayFieldWrapper';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { buildGroupedTableHeaders } from '../../lib/tableGrouping';
import {
  getEffectiveTableRowDefinitions,
  isTableExpandByColumns,
} from '../../lib/tableExpand';

export function DisplayTableField({
  field,
  value,
  className,
}: DisplayFieldProps) {
  const columns = field.tableColumns || [];
  const columnGroups = field.tableColumnGroups || [];
  const rowDefinitions = getEffectiveTableRowDefinitions(field);
  const expandByColumns = isTableExpandByColumns(field);
  const rowHeaderLabel = field.tableRowHeaderLabel || 'Row';
  const groupedHeaders = buildGroupedTableHeaders(columns, columnGroups);
  const tableData = Array.isArray(value) ? value : [];
  const hasData = tableData.length > 0;
  const showSerialColumn =
    !expandByColumns && Boolean(field.tableShowSerialNumber);
  const serialNumberLabel = field.tableSerialNumberLabel?.trim() || 'SN';

  if (expandByColumns) {
    const showFooter = field.showTableFooter !== false;
    const getRowTotal = (rowDefIndex: number) => {
      const rowDef = rowDefinitions[rowDefIndex];
      const col = columns[rowDefIndex] ?? columns[0];
      if (!col) return null;
      const showSum = 'showSum' in col ? col.showSum : undefined;
      const shouldSum =
        showSum !== undefined
          ? showSum
          : col.type === 'number' || col.type === 'calculated';
      if (!shouldSum) return null;
      return tableData.reduce((sum, instance) => {
        const val = parseFloat(String(instance[rowDef.id] || 0));
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
    };

    return (
      <DisplayFieldWrapper
        label={field.label}
        fieldId={field.id}
        instruction={field.instruction}
        className={className}>
        {hasData ? (
          <div className='w-full border rounded-md overflow-x-auto'>
            <Table>
              <TableHeader className='bg-muted/50'>
                <TableRow>
                  <TableHead className='font-bold whitespace-nowrap border border-border'>
                    {rowHeaderLabel}
                  </TableHead>
                  {tableData.map((_, instanceIndex) => (
                    <TableHead
                      key={instanceIndex}
                      className='border border-border min-w-[80px]'
                      aria-label={`Entry ${instanceIndex + 1}`}
                    />
                  ))}
                  {showFooter && (
                    <TableHead className='font-bold text-right border border-border'>
                      Total
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowDefinitions.map((rowDef, rowDefIndex) => {
                  const total = showFooter ? getRowTotal(rowDefIndex) : null;
                  return (
                    <TableRow key={rowDef.id}>
                      <TableCell className='text-sm font-medium border border-border bg-muted/20'>
                        {rowDef.name || rowDef.label}
                      </TableCell>
                      {tableData.map((instance, instanceIndex) => (
                        <TableCell
                          key={instanceIndex}
                          className='text-sm text-center border border-border'>
                          {instance[rowDef.id] ?? '-'}
                        </TableCell>
                      ))}
                      {showFooter && (
                        <TableCell className='text-sm font-bold text-right border border-border bg-muted/20'>
                          {total !== null ? total.toLocaleString() : ''}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <span className='text-muted-foreground/50 italic text-sm'>
            Empty table
          </span>
        )}
      </DisplayFieldWrapper>
    );
  }

  return (
    <DisplayFieldWrapper
      label={field.label}
      fieldId={field.id}
      instruction={field.instruction}
      className={className}>
      {hasData ? (
        <div className='w-full border rounded-md overflow-x-auto'>
          <Table>
            <TableHeader className='bg-muted/50'>
              {groupedHeaders.hasGroups &&
                groupedHeaders.groupRows.map((row, rowIndex) => (
                  <TableRow key={`group-row-${rowIndex}`}>
                    {row.map((cell) => (
                      <TableHead
                        key={cell.key}
                        colSpan={cell.colSpan}
                        rowSpan={cell.rowSpan}
                        className='text-center font-semibold whitespace-nowrap border border-border bg-muted/30'>
                        {cell.label || '\u00A0'}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}

              <TableRow>
                {showSerialColumn && (
                  <TableHead className='font-bold whitespace-nowrap text-center'>
                    {serialNumberLabel}
                  </TableHead>
                )}
                {columns.map((col, idx) => (
                  <TableHead key={idx} className='font-bold whitespace-nowrap'>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row, rowIdx) => (
                <TableRow key={rowIdx}>
                  {showSerialColumn && (
                    <TableCell className='text-sm text-center font-medium text-muted-foreground bg-muted/20'>
                      {rowIdx + 1}
                    </TableCell>
                  )}
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx} className='text-sm'>
                      {row[col.id] ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <span className='text-muted-foreground/50 italic text-sm'>
          Empty table
        </span>
      )}
    </DisplayFieldWrapper>
  );
}
