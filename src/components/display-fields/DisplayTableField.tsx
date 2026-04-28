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

export function DisplayTableField({
  field,
  value,
  className,
}: DisplayFieldProps) {
  const columns = field.tableColumns || [];
  const columnGroups = field.tableColumnGroups || [];
  const groupedHeaders = buildGroupedTableHeaders(columns, columnGroups);
  const tableData = Array.isArray(value) ? value : [];
  const hasData = tableData.length > 0;

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
