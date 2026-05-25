'use client';

import React from 'react';
import NepaliDatePicker from '@zener/nepali-datepicker-react';
import NepaliDate from '@zener/nepali-date';
import '@zener/nepali-datepicker-react/index.css';
import { cn } from '../../lib/utils';
import {
  adDateToNepaliDate,
  storageValueToNepaliDate,
  nepaliDateToStorageValue,
} from '../../lib/nepaliCalendar';

const INPUT_CLASS =
  'zener-w-full zener-h-10 zener-rounded-md zener-border zener-border-input zener-bg-background zener-px-3 zener-py-2 zener-text-sm';

type NepaliDatePickerFieldProps = {
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  minDate?: Date;
  maxDate?: Date;
  showError?: boolean;
  onChange: (iso: string) => void;
  onBlur?: () => void;
};

export function NepaliDatePickerField({
  id,
  disabled,
  placeholder,
  value,
  minDate,
  maxDate,
  showError,
  onChange,
  onBlur,
}: NepaliDatePickerFieldProps) {
  const pickerValue = storageValueToNepaliDate(value);

  return (
    <NepaliDatePicker
      type='BS'
      lang='np'
      disabled={disabled}
      placeholder={placeholder}
      value={pickerValue ?? undefined}
      min={minDate ? adDateToNepaliDate(minDate) : undefined}
      max={maxDate ? adDateToNepaliDate(maxDate) : undefined}
      showclear
      portalClassName='z-[200]'
      className={() => ({
        default: cn(INPUT_CLASS, showError && 'zener-border-red-500'),
        focus: cn(INPUT_CLASS, 'zener-ring-2 zener-ring-ring'),
        disabled: cn(INPUT_CLASS, 'zener-opacity-50'),
      })}
      onChange={(date: NepaliDate | null) => {
        onChange(nepaliDateToStorageValue(date));
        if (date) onBlur?.();
      }}
    />
  );
}

type NepaliDateRangePickerFieldProps = {
  disabled?: boolean;
  startPlaceholder?: string;
  endPlaceholder?: string;
  value?: { from?: string; to?: string };
  minDate?: Date;
  maxDate?: Date;
  showError?: boolean;
  onChange: (range: { from: string; to: string }) => void;
  onBlur?: () => void;
};

export function NepaliDateRangePickerField({
  disabled,
  startPlaceholder = 'सुरु मिति',
  endPlaceholder = 'अन्त्य मिति',
  value,
  minDate,
  maxDate,
  showError,
  onChange,
  onBlur,
}: NepaliDateRangePickerFieldProps) {
  const startValue = value?.from ? storageValueToNepaliDate(value.from) : null;
  const endValue = value?.to ? storageValueToNepaliDate(value.to) : null;

  const handleStart = (date: NepaliDate | null) => {
    onChange({
      from: nepaliDateToStorageValue(date),
      to: value?.to || '',
    });
  };

  const handleEnd = (date: NepaliDate | null) => {
    const next = {
      from: value?.from || '',
      to: nepaliDateToStorageValue(date),
    };
    onChange(next);
    if (next.from && next.to) onBlur?.();
  };

  return (
    <div className='grid gap-2 sm:grid-cols-2'>
      <NepaliDatePicker
        type='BS'
        lang='np'
        disabled={disabled}
        placeholder={startPlaceholder}
        value={startValue ?? undefined}
        min={minDate ? adDateToNepaliDate(minDate) : undefined}
        max={maxDate ? adDateToNepaliDate(maxDate) : undefined}
        showclear
        portalClassName='z-[200]'
        className={() => ({
          default: cn(INPUT_CLASS, showError && 'zener-border-red-500'),
          focus: cn(INPUT_CLASS, 'zener-ring-2 zener-ring-ring'),
          disabled: cn(INPUT_CLASS, 'zener-opacity-50'),
        })}
        onChange={handleStart}
      />
      <NepaliDatePicker
        type='BS'
        lang='np'
        disabled={disabled}
        placeholder={endPlaceholder}
        value={endValue ?? undefined}
        min={minDate ? adDateToNepaliDate(minDate) : undefined}
        max={maxDate ? adDateToNepaliDate(maxDate) : undefined}
        showclear
        portalClassName='z-[200]'
        className={() => ({
          default: cn(INPUT_CLASS, showError && 'zener-border-red-500'),
          focus: cn(INPUT_CLASS, 'zener-ring-2 zener-ring-ring'),
          disabled: cn(INPUT_CLASS, 'zener-opacity-50'),
        })}
        onChange={handleEnd}
      />
    </div>
  );
}
