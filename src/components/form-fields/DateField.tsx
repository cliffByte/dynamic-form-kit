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
import {
  NepaliDatePicker,
  getNepaliDate,
  makeDualDateValueFromAd,
  type DualDateValue,
} from '@etpl/nepali-datepicker';
import { FieldWrapper } from './FieldWrapper';
import { BaseFieldProps } from './types';
import { cn } from '../../lib/utils';
import { isTodayConstraint, resolveDateConstraint } from '../../lib/dateConstraint';
import { useFormKit } from '../../context/FormKitContext';

/** Above section borders and other form overlays (popover uses this via zIndex prop). */
const NEPALI_DATEPICKER_Z_INDEX = 10050;

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
  const nepaliMinDate = dateMin ? getNepaliDate(dateMin) : undefined;
  const nepaliMaxDate = dateMax ? getNepaliDate(dateMax) : undefined;

  const normalizeDate = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const formatDateForDisplay = (date: Date) => {
    if (useNepaliCalendar) {
      return new Intl.DateTimeFormat('ne-NP-u-ca-bikram-sambat', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    }

    return format(date, 'PPP');
  };

  // Parse value based on mode
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

  const nepaliSingleValue = selectedDate
    ? makeDualDateValueFromAd(selectedDate)
    : null;

  const nepaliRangeStart = selectedDateRange?.from
    ? makeDualDateValueFromAd(selectedDateRange.from)
    : null;

  const nepaliRangeEnd = selectedDateRange?.to
    ? makeDualDateValueFromAd(selectedDateRange.to)
    : null;

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
        <div
          className={cn(
            'relative z-[100]',
            showError && '[&_.ndc-input]:border-red-500',
          )}>
          <NepaliDatePicker
            id={field.id}
            variant='dropdown'
            zIndex={NEPALI_DATEPICKER_Z_INDEX}
            calendarSystem='BS'
            language='ne'
            showCalendarSystemToggle={false}
            showLanguageToggle={false}
            showSecondaryDate
            disabled={disabled}
            placeholder={
              field.placeholder ||
              (dateMode === 'range'
                ? 'मिति दायरा छान्नुहोस्'
                : 'मिति छान्नुहोस्')
            }
            selectionType={dateMode === 'range' ? 'range' : 'single'}
            minDate={nepaliMinDate}
            maxDate={nepaliMaxDate}
            value={dateMode === 'single' ? nepaliSingleValue : undefined}
            startValue={dateMode === 'range' ? nepaliRangeStart : undefined}
            endValue={dateMode === 'range' ? nepaliRangeEnd : undefined}
            onChange={(selected: DualDateValue | null) => {
              if (dateMode !== 'single') return;
              if (!selected) {
                onChange('');
                return;
              }
              if (disabledDates(selected.ad)) return;
              onChange(selected.ad.toISOString());
              onBlur?.();
            }}
            onRangeChange={(start, end) => {
              if (dateMode !== 'range') return;
              const startDate = start?.ad;
              const endDate = end?.ad;

              if (startDate && disabledDates(startDate)) return;
              if (endDate && disabledDates(endDate)) return;
              if (
                startDate &&
                endDate &&
                normalizeDate(startDate) > normalizeDate(endDate)
              ) {
                return;
              }

              onChange({
                from: startDate?.toISOString() || '',
                to: endDate?.toISOString() || '',
              });

              if (startDate && endDate) {
                onBlur?.();
              }
            }}
            disabledFn={(dual) => disabledDates(dual.ad)}
          />
        </div>
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
                {displayValue ||
                  field.placeholder ||
                  (dateMode === 'range' ? 'Pick a date range' : 'Pick a date')}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
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
                useNepaliCalendar={useNepaliCalendar}
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
                useNepaliCalendar={useNepaliCalendar}
                initialFocus
                className='rounded-md border'
              />
            )}
          </PopoverContent>
        </Popover>
      )}

      {/* Date constraints hint */}
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
