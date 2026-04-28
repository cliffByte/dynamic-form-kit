'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Label } from '../../../../ui/label';
import { Button } from '../../../../ui/button';
import { Calendar } from '../../../../ui/calendar';
import { Checkbox } from '../../../../ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../../../../lib/utils';

interface DateSettingsEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const DateSettingsEditor: React.FC<DateSettingsEditorProps> = ({
  field,
  updateField,
}) => {
  if (field.type !== 'date') return null;

  const useNepaliCalendar = field.dateUseNepaliCalendar ?? false;

  const formatDateLabel = (date: Date) => {
    if (useNepaliCalendar) {
      return new Intl.DateTimeFormat('ne-NP-u-ca-bikram-sambat', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    }

    return format(date, 'PPP');
  };

  return (
    <div className='grid grid-cols-2 gap-4 border-t pt-4'>
      <div className='space-y-2'>
        <Label>Minimum Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type='button'
              variant='outline'
              className={cn(
                'w-full justify-start text-left font-normal',
                !field.dateMin && 'text-muted-foreground',
              )}>
              <CalendarIcon className='mr-2 h-4 w-4' />
              {field.dateMin === 'today'
                ? 'Today'
                : field.dateMin
                  ? formatDateLabel(new Date(field.dateMin))
                  : 'Pick date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0'>
            <Calendar
              mode='single'
              useNepaliCalendar={useNepaliCalendar}
              selected={
                field.dateMin && field.dateMin !== 'today'
                  ? new Date(field.dateMin)
                  : undefined
              }
              onSelect={(date) =>
                updateField(field.id, {
                  dateMin: date ? format(date, 'yyyy-MM-dd') : undefined,
                })
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <div className='flex items-center gap-2'>
          <Checkbox
            id={`${field.id}-date-min-today`}
            checked={field.dateMin === 'today'}
            onCheckedChange={(checked) =>
              updateField(field.id, {
                dateMin: checked ? 'today' : undefined,
              })
            }
          />
          <Label
            htmlFor={`${field.id}-date-min-today`}
            className='text-xs font-normal cursor-pointer'>
            Use Today
          </Label>
        </div>
      </div>
      <div className='space-y-2'>
        <Label>Maximum Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type='button'
              variant='outline'
              className={cn(
                'w-full justify-start text-left font-normal',
                !field.dateMax && 'text-muted-foreground',
              )}>
              <CalendarIcon className='mr-2 h-4 w-4' />
              {field.dateMax === 'today'
                ? 'Today'
                : field.dateMax
                  ? formatDateLabel(new Date(field.dateMax))
                  : 'Pick date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0'>
            <Calendar
              mode='single'
              useNepaliCalendar={useNepaliCalendar}
              selected={
                field.dateMax && field.dateMax !== 'today'
                  ? new Date(field.dateMax)
                  : undefined
              }
              onSelect={(date) =>
                updateField(field.id, {
                  dateMax: date ? format(date, 'yyyy-MM-dd') : undefined,
                })
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <div className='flex items-center gap-2'>
          <Checkbox
            id={`${field.id}-date-max-today`}
            checked={field.dateMax === 'today'}
            onCheckedChange={(checked) =>
              updateField(field.id, {
                dateMax: checked ? 'today' : undefined,
              })
            }
          />
          <Label
            htmlFor={`${field.id}-date-max-today`}
            className='text-xs font-normal cursor-pointer'>
            Use Today
          </Label>
        </div>
      </div>
      <div className='col-span-2 flex items-center gap-2'>
        <Checkbox
          id={`${field.id}-date-nepali-calendar`}
          checked={useNepaliCalendar}
          onCheckedChange={(checked) =>
            updateField(field.id, {
              dateUseNepaliCalendar: checked === true,
            })
          }
        />
        <Label
          htmlFor={`${field.id}-date-nepali-calendar`}
          className='text-xs font-normal cursor-pointer'>
          Use Nepali Calendar (Bikram Sambat)
        </Label>
      </div>
    </div>
  );
};
