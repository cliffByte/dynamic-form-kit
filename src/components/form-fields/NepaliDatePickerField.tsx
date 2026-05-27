'use client';

import React, { useEffect, useState } from 'react';
import NepaliDatePicker from '@zener/nepali-datepicker-react';
import NepaliDate from '@zener/nepali-date';
import '@zener/nepali-datepicker-react/index.css';
import { cn } from '../../lib/utils';
import {
  NEPALI_DATE_STORAGE_FORMAT,
  adDateToNepaliDate,
  nepaliDateToStorageValue,
  toNepaliPickerValue,
} from '../../lib/nepaliCalendar';

const INPUT_CLASS =
  'zener-w-full zener-h-10 zener-rounded-md zener-border zener-border-input zener-bg-background zener-px-3 zener-py-2 zener-text-sm';

const PICKER_FORMAT = NEPALI_DATE_STORAGE_FORMAT;

type NepaliPickerCommonProps = {
  disabled?: boolean;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  showError?: boolean;
};

function nepaliPickerClassName(showError?: boolean) {
  return () => ({
    default: cn(INPUT_CLASS, showError && 'zener-border-red-500'),
    focus: cn(INPUT_CLASS, 'zener-ring-2 zener-ring-ring'),
    disabled: cn(INPUT_CLASS, 'zener-opacity-50'),
  });
}

function NepaliPickerPlaceholder({
  placeholder,
  disabled,
  showError,
}: {
  placeholder?: string;
  disabled?: boolean;
  showError?: boolean;
}) {
  return (
    <div
      className={cn(
        INPUT_CLASS,
        'flex items-center text-muted-foreground',
        disabled && 'opacity-50',
        showError && 'border-red-500',
      )}
      aria-hidden>
      {placeholder || 'मिति छान्नुहोस्'}
    </div>
  );
}

function ClientNepaliDatePicker(
  props: React.ComponentProps<typeof NepaliDatePicker>,
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <NepaliPickerPlaceholder
        placeholder={props.placeholder}
        disabled={props.disabled}
      />
    );
  }

  return <NepaliDatePicker {...props} />;
}

type NepaliDatePickerFieldProps = NepaliPickerCommonProps & {
  id?: string;
  value?: string;
  onChange: (storageValue: string) => void;
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
  const pickerValue = toNepaliPickerValue(value);

  return (
    <div id={id}>
      <ClientNepaliDatePicker
        type='BS'
        lang='np'
        format={PICKER_FORMAT}
        disabled={disabled}
        placeholder={placeholder}
        value={pickerValue}
        min={minDate ? adDateToNepaliDate(minDate) : undefined}
        max={maxDate ? adDateToNepaliDate(maxDate) : undefined}
        showclear
        portalClassName='z-[200]'
        className={nepaliPickerClassName(showError)}
        onChange={(date) => {
          const nepali =
            date instanceof NepaliDate ? date : date ? new NepaliDate(date) : null;
          onChange(nepaliDateToStorageValue(nepali));
          if (nepali) onBlur?.();
        }}
      />
    </div>
  );
}

type NepaliDateRangePickerFieldProps = NepaliPickerCommonProps & {
  startPlaceholder?: string;
  endPlaceholder?: string;
  value?: { from?: string; to?: string };
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
  const startValue = toNepaliPickerValue(value?.from);
  const endValue = toNepaliPickerValue(value?.to);

  const toNepali = (date: NepaliDate | Date | null) => {
    if (!date) return null;
    return date instanceof NepaliDate ? date : new NepaliDate(date);
  };

  const handleStart = (date: NepaliDate | Date | null) => {
    onChange({
      from: nepaliDateToStorageValue(toNepali(date)),
      to: value?.to || '',
    });
  };

  const handleEnd = (date: NepaliDate | Date | null) => {
    const next = {
      from: value?.from || '',
      to: nepaliDateToStorageValue(toNepali(date)),
    };
    onChange(next);
    if (next.from && next.to) onBlur?.();
  };

  const pickerProps = {
    type: 'BS' as const,
    lang: 'np' as const,
    format: PICKER_FORMAT,
    disabled,
    min: minDate ? adDateToNepaliDate(minDate) : undefined,
    max: maxDate ? adDateToNepaliDate(maxDate) : undefined,
    showclear: true,
    portalClassName: 'z-[200]',
    className: nepaliPickerClassName(showError),
  };

  return (
    <div className='grid gap-2 sm:grid-cols-2'>
      <ClientNepaliDatePicker
        {...pickerProps}
        placeholder={startPlaceholder}
        value={startValue}
        onChange={handleStart}
      />
      <ClientNepaliDatePicker
        {...pickerProps}
        placeholder={endPlaceholder}
        value={endValue}
        onChange={handleEnd}
      />
    </div>
  );
}
