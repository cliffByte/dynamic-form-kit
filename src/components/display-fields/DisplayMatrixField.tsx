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

export function DisplayMatrixField({
  field,
  value,
  className,
}: DisplayFieldProps) {
  const rows = field.matrixRows || [];
  const columns = field.matrixColumns || [];
  const rawValue =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  const matrixValue = rows.reduce(
    (acc, rowLabel, rowIndex) => {
      const rowKey = `row_${rowIndex}`;
      const selected =
        rawValue[rowKey] ?? rawValue[rowLabel] ?? rawValue[rowIndex];
      if (
        typeof selected === 'string' &&
        (columns.length === 0 || columns.includes(selected))
      ) {
        acc[rowKey] = selected;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const hasData = Object.keys(matrixValue).length > 0;

  return (
    <DisplayFieldWrapper
      label={field.label}
      fieldId={field.id}
      instruction={field.instruction}
      className={className}>
      {hasData ? (
        <div className='w-full border rounded-md overflow-hidden'>
          <Table>
            <TableHeader className='bg-muted/50'>
              <TableRow>
                <TableHead className='w-1/3 bg-muted/80 font-bold border-r'>
                  Items
                </TableHead>
                {columns.map((col, idx) => (
                  <TableHead key={idx} className='text-center font-bold'>
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIdx) => (
                <TableRow key={rowIdx}>
                  <TableCell className='font-medium bg-muted/20 border-r'>
                    {row}
                  </TableCell>
                  {columns.map((col, colIdx) => {
                    const isSelected = matrixValue[`row_${rowIdx}`] === col;
                    return (
                      <TableCell key={colIdx} className='text-center'>
                        {isSelected ? (
                          <div className='mx-auto w-3 h-3 rounded-full bg-primary' />
                        ) : (
                          <span className='text-xs text-muted-foreground/20'>
                            -
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <span className='text-muted-foreground/50 italic text-sm'>
          No data provided
        </span>
      )}
    </DisplayFieldWrapper>
  );
}
