'use client';

import React from 'react';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';

/**
 * Matrix/grid field with radio button selections per row
 */
export function MatrixField({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
}: BaseFieldProps) {
  const matrixRows = field.matrixRows || [];
  const matrixColumns = field.matrixColumns || [];
  const rawValue: Record<string, any> =
    typeof value === 'object' && value && !Array.isArray(value) ? value : {};
  const matrixValue: Record<string, string> = matrixRows.reduce(
    (acc, row, rowIndex) => {
      const rowKey = `row_${rowIndex}`;
      const selected = rawValue[rowKey] ?? rawValue[row] ?? rawValue[rowIndex];
      if (
        typeof selected === 'string' &&
        (matrixColumns.length === 0 || matrixColumns.includes(selected))
      ) {
        acc[rowKey] = selected;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const handleCellChange = (rowIndex: number, columnValue: string) => {
    const newValue = { ...matrixValue, [`row_${rowIndex}`]: columnValue };
    onChange(newValue);
    onBlur?.();
  };

  // Count answered rows
  const answeredRows = matrixRows.reduce(
    (count, _, rowIndex) =>
      matrixValue[`row_${rowIndex}`] ? count + 1 : count,
    0,
  );

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
        answeredRows > 0 && (
          <span className='text-xs text-muted-foreground'>
            ({answeredRows}/{matrixRows.length} answered)
          </span>
        )
      }>
      <div className='overflow-x-auto rounded-lg border'>
        <table className='w-full border-collapse'>
          <thead>
            <tr className='bg-muted/50'>
              <th className='p-3 text-left text-sm font-semibold border-b min-w-[150px]'>
                {/* Empty header for row labels */}
              </th>
              {matrixColumns.map((col, idx) => (
                <th
                  key={idx}
                  className='p-3 text-center text-sm font-semibold border-b border-l min-w-[100px]'>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixRows.map((row, rowIdx) => {
              const selectedColumn = matrixValue[`row_${rowIdx}`];
              const isRowAnswered = !!selectedColumn;

              return (
                <tr
                  key={rowIdx}
                  className={cn(
                    'transition-colors',
                    isRowAnswered ? 'bg-primary/5' : 'hover:bg-muted/30',
                    rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                  )}>
                  <td className='p-3 text-sm font-medium border-b'>{row}</td>
                  {matrixColumns.map((col, colIdx) => {
                    const isSelected = selectedColumn === col;
                    return (
                      <td
                        key={colIdx}
                        className='p-3 text-center border-b border-l'>
                        <label className='cursor-pointer inline-flex justify-center items-center w-full h-full'>
                          <input
                            type='radio'
                            name={`${field.id}-row-${rowIdx}`}
                            checked={isSelected}
                            disabled={disabled}
                            onChange={() => handleCellChange(rowIdx, col)}
                            className={cn(
                              'w-5 h-5 text-primary border-2 focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer',
                              isSelected && 'border-primary',
                            )}
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </FieldWrapper>
  );
}
