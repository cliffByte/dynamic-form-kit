'use client';

import React, { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';
import { isTodayConstraint, resolveDateConstraint } from '../../lib/dateConstraint';
import { useFormKit } from '../../context/FormKitContext';
import { formatNepaliDateDisplay } from '../../lib/nepaliCalendar';
import {
  NepaliDatePickerField,
  NepaliDateRangePickerField,
} from './NepaliDatePickerField';

/** Above stacked form fields and section cards (Radix portal). */
const DATE_POPOVER_Z_CLASS = 'z-[200]';

/**
 * Date picker field with single date and date range support
 */
export function DateField({
  field,
  value,
  onChange,
  onBlur,
  showError,
  errorMessage,
  disabled,
  className,
}: BaseFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { locale: localeFromKit } = useFormKit();
  const locale = localeFromKit || 'en';
  const useNepaliCalendar = field.dateUseNepaliCalendar ?? locale === 'ne';

  const dateMode = field.dateMode || 'single';
  const dateMin = resolveDateConstraint(field.dateMin);
  const dateMax = resolveDateConstraint(field.dateMax);

  const normalizeDate = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const formatDateForDisplay = (date: Date) =>
    useNepaliCalendar ? formatNepaliDateDisplay(date) : format(date, 'PPP');

  let selectedDate: Date | undefined;
  let selectedDateRange:
    | { from: Date | undefined; to?: Date | undefined }
    | undefined;

  if (dateMode === 'range') {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      selectedDateRange = {
        from: value.from ? new Date(value.from) : undefined,
        to: value.to ? new Date(value.to) : undefined,
      };
    }
  } else {
    selectedDate = value ? new Date(value) : undefined;
  }

  const formatDisplayValue = () => {
    if (dateMode === 'range') {
      if (!selectedDateRange?.from) {
        return null;
      }
      if (selectedDateRange.to) {
        return `${formatDateForDisplay(selectedDateRange.from)} - ${formatDateForDisplay(selectedDateRange.to)}`;
      }
      return formatDateForDisplay(selectedDateRange.from);
    }
    return selectedDate ? formatDateForDisplay(selectedDate) : null;
  };

  const displayValue = formatDisplayValue();

  const disabledDates = (date: Date) => {
    const normalizedDate = normalizeDate(date);
    if (dateMin && normalizedDate < dateMin) return true;
    if (dateMax && normalizedDate > dateMax) return true;
    return false;
  };

  const nepaliPlaceholder =
    field.placeholder ||
    (dateMode === 'range' ? 'मिति दायरा छान्नुहोस्' : 'मिति छान्नुहोस्');

  const englishPlaceholder =
    field.placeholder ||
    (dateMode === 'range' ? 'Pick a date range' : 'Pick a date');

  return (
    <FieldWrapper
      fieldId={field.id}
      label={field.label}
      required={field.required}
      instruction={field.instruction}
      showError={showError}
      errorMessage={errorMessage}
      className={className}>
      {useNepaliCalendar ? (
        dateMode === 'range' ? (
          <NepaliDateRangePickerField
            disabled={disabled}
            showError={showError}
            minDate={dateMin}
            maxDate={dateMax}
            value={
              value && typeof value === 'object' && !Array.isArray(value)
                ? { from: value.from, to: value.to }
                : undefined
            }
            onChange={(range) => onChange(range)}
            onBlur={onBlur}
          />
        ) : (
          <NepaliDatePickerField
            id={field.id}
            disabled={disabled}
            showError={showError}
            placeholder={nepaliPlaceholder}
            minDate={dateMin}
            maxDate={dateMax}
            value={typeof value === 'string' ? value : undefined}
            onChange={(iso) => onChange(iso)}
            onBlur={onBlur}
          />
        )
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              id={field.id}
              variant='outline'
              disabled={disabled}
              className={cn(
                'w-full justify-start text-left font-normal h-10',
                'focus-visible:ring-2 focus-visible:ring-primary focus:border-primary',
                'hover:bg-muted/50 transition-colors',
                !displayValue && 'text-muted-foreground',
                showError && 'border-red-500 focus-visible:ring-red-500',
              )}>
              <CalendarIcon className='mr-2 h-4 w-4 shrink-0' />
              <span className='truncate'>
                {displayValue || englishPlaceholder}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn('w-auto p-0', DATE_POPOVER_Z_CLASS)}
            align='start'>
            {dateMode === 'range' ? (
              <Calendar
                mode='range'
                selected={selectedDateRange}
                onSelect={(range) => {
                  if (range) {
                    onChange({
                      from: range.from?.toISOString(),
                      to: range.to?.toISOString(),
                    });
                    if (range.from && range.to) {
                      onBlur?.();
                      setIsOpen(false);
                    }
                  }
                }}
                disabled={disabledDates}
                numberOfMonths={2}
                useNepaliCalendar={false}
                initialFocus
                className='rounded-md border'
              />
            ) : (
              <Calendar
                mode='single'
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    onChange(date.toISOString());
                    onBlur?.();
                    setIsOpen(false);
                  }
                }}
                disabled={disabledDates}
                useNepaliCalendar={false}
                initialFocus
                className='rounded-md border'
              />
            )}
          </PopoverContent>
        </Popover>
      )}

      {(dateMin || dateMax) && (
        <p className='text-xs text-muted-foreground mt-1'>
          {dateMin &&
            `From: ${isTodayConstraint(field.dateMin) ? (useNepaliCalendar ? 'आज' : 'Today') : formatDateForDisplay(dateMin)}`}
          {dateMin && dateMax && ' • '}
          {dateMax &&
            `To: ${isTodayConstraint(field.dateMax) ? (useNepaliCalendar ? 'आज' : 'Today') : formatDateForDisplay(dateMax)}`}
        </p>
      )}
    </FieldWrapper>
  );
}
