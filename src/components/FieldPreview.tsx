import React from 'react';
import { FormField } from '../types/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Calendar } from './ui/calendar';
import {
  CalendarIcon,
  Phone,
  SlidersHorizontal,
  ListChecks,
} from 'lucide-react';
import { Slider } from './ui/slider';
import { resolveDateConstraint } from '../lib/dateConstraint';
import { NepaliDatePickerField } from './form-fields/NepaliDatePickerField';

/**
 * Rich text field preview
 * Single responsibility: Render rich text preview
 */
export function RichTextPreview({ field }: { field: FormField }) {
  return (
    <div className='w-full'>
      <div
        className='text-base text-gray-600 leading-relaxed prose prose-sm max-w-none'
        dangerouslySetInnerHTML={{
          __html: field.content || field.label || '<p></p>',
        }}
      />
    </div>
  );
}

/**
 * Text input field preview
 * Single responsibility: Render text input preview
 */
export function TextInputPreview({ field }: { field: FormField }) {
  return (
    <div className='border h-10 rounded-md bg-gray-50 items-center flex pl-3'>
      <span className='text-md text-gray-400'>{field.placeholder}</span>
    </div>
  );
}

/**
 * Phone number field preview
 * Single responsibility: Render phone input preview
 */
export function PhonePreview({ field }: { field: FormField }) {
  return (
    <div className='border h-10 rounded-md bg-gray-50 items-center flex pl-3 gap-2'>
      <Phone className='w-4 h-4 text-gray-400' />
      <span className='text-md text-gray-400'>
        {field.placeholder || 'Enter phone number'}
      </span>
    </div>
  );
}

/**
 * Textarea field preview
 * Single responsibility: Render textarea preview
 */
export function TextareaPreview({ field }: { field: FormField }) {
  return (
    <div className='border h-14 rounded-md bg-gray-50 items-center flex pl-3'>
      <span className='text-md text-gray-400'>{field.placeholder}</span>
    </div>
  );
}

/**
 * Select field preview
 * Single responsibility: Render select preview
 */
export function SelectPreview({
  field,
  onSelect,
}: {
  field: FormField;
  onSelect: () => void;
}) {
  return (
    <Select disabled onValueChange={() => {}}>
      <SelectTrigger onClick={onSelect} className='w-full'>
        <SelectValue
          placeholder={
            field.isDynamic
              ? '🔄 Dynamic options from API'
              : field.placeholder || 'Select an option'
          }
        />
      </SelectTrigger>
      <SelectContent>
        {field.isDynamic ? (
          <SelectItem value='__dynamic__' disabled>
            Options will be loaded from API
          </SelectItem>
        ) : field.optionConfigs && field.optionConfigs.length > 0 ? (
          field.optionConfigs
            .filter((config) => config.value !== '')
            .map((config, idx) => (
              <SelectItem key={idx} value={config.value}>
                {config.label}
              </SelectItem>
            ))
        ) : (
          field.options?.map((option, idx) => (
            <SelectItem key={idx} value={option}>
              {option}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

/**
 * Checkbox field preview
 * Single responsibility: Render checkbox options preview
 */
export function CheckboxPreview({
  field,
  onSelect,
}: {
  field: FormField;
  onSelect: () => void;
}) {
  return (
    <div className='space-y-2' onClick={onSelect}>
      {field.optionConfigs && field.optionConfigs.length > 0
        ? field.optionConfigs.map((config, idx) => (
            <div key={idx} className='flex items-center space-x-2'>
              <Checkbox id={`checkbox-${field.id}-${idx}`} disabled />
              <Label
                htmlFor={`checkbox-${field.id}-${idx}`}
                className='text-sm font-normal cursor-pointer'>
                {config.label}
              </Label>
            </div>
          ))
        : field.options?.map((option, idx) => (
            <div key={idx} className='flex items-center space-x-2'>
              <Checkbox id={`checkbox-${field.id}-${idx}`} disabled />
              <Label
                htmlFor={`checkbox-${field.id}-${idx}`}
                className='text-sm font-normal cursor-pointer'>
                {option}
              </Label>
            </div>
          ))}
    </div>
  );
}

/**
 * Radio field preview
 * Single responsibility: Render radio options preview
 */
export function RadioPreview({
  field,
  onSelect,
}: {
  field: FormField;
  onSelect: () => void;
}) {
  return (
    <RadioGroup disabled value='' onClick={onSelect} className='space-y-2'>
      {field.optionConfigs && field.optionConfigs.length > 0
        ? field.optionConfigs.map((config, idx) => (
            <div key={idx} className='flex items-center space-x-2'>
              <RadioGroupItem
                value={config.value}
                id={`radio-${field.id}-${idx}`}
              />
              <Label
                htmlFor={`radio-${field.id}-${idx}`}
                className='text-sm font-normal cursor-pointer'>
                {config.label}
              </Label>
            </div>
          ))
        : field.options?.map((option, idx) => (
            <div key={idx} className='flex items-center space-x-2'>
              <RadioGroupItem value={option} id={`radio-${field.id}-${idx}`} />
              <Label
                htmlFor={`radio-${field.id}-${idx}`}
                className='text-sm font-normal cursor-pointer'>
                {option}
              </Label>
            </div>
          ))}
    </RadioGroup>
  );
}

/**
 * Date field preview
 * Single responsibility: Render date picker preview
 */
export function DatePreview({
  field,
  onSelect,
}: {
  field: FormField;
  onSelect: () => void;
}) {
  const dateMode = field.dateMode || 'single';
  const useNepaliCalendar = field.dateUseNepaliCalendar ?? false;
  // Normalize dates to midnight for proper comparison
  const dateMin = resolveDateConstraint(field.dateMin);
  const dateMax = resolveDateConstraint(field.dateMax);

  if (useNepaliCalendar && dateMode === 'single') {
    return (
      <div role='button' tabIndex={0} onClick={onSelect} onKeyDown={onSelect}>
        <NepaliDatePickerField
          disabled
          showError={false}
          placeholder={field.placeholder || 'मिति छान्नुहोस्'}
          minDate={dateMin}
          maxDate={dateMax}
          onChange={() => {}}
        />
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild onClick={onSelect}>
        <Button
          variant='outline'
          className='w-full justify-start text-left font-normal'
          disabled>
          <CalendarIcon className='mr-2 h-4 w-4' />
          <span>
            {field.placeholder ||
              (dateMode === 'range' ? 'Pick a date range' : 'Pick a date')}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        {dateMode === 'range' ? (
          <Calendar
            mode='range'
            selected={{ from: undefined, to: undefined }}
            onSelect={() => {}}
            disabled={(date) => {
              const normalizedDate = new Date(date);
              normalizedDate.setHours(0, 0, 0, 0);
              if (dateMin && normalizedDate < dateMin) return true;
              if (dateMax && normalizedDate > dateMax) return true;
              return false;
            }}
            useNepaliCalendar={useNepaliCalendar}
          />
        ) : (
          <Calendar
            mode='single'
            disabled={(date) => {
              const normalizedDate = new Date(date);
              normalizedDate.setHours(0, 0, 0, 0);
              if (dateMin && normalizedDate < dateMin) return true;
              if (dateMax && normalizedDate > dateMax) return true;
              return false;
            }}
            useNepaliCalendar={useNepaliCalendar}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Rating field preview
 * Single responsibility: Render rating preview
 */
export function RatingPreview({
  field,
  onSelect,
}: {
  field: FormField;
  onSelect: () => void;
}) {
  const maxRating = field.ratingMax || 5;
  return (
    <div className='flex items-center gap-2' onClick={onSelect}>
      {Array.from({ length: maxRating }, (_, i) => (
        <span key={i} className='text-2xl text-gray-300'>
          ★
        </span>
      ))}
    </div>
  );
}

/**
 * Rich text input field preview
 * Single responsibility: Render rich text input preview
 */
export function RichTextInputPreview({
  field,
  onSelect,
}: {
  field: FormField;
  onSelect: () => void;
}) {
  return (
    <div
      className='border rounded-md bg-gray-50 items-center flex p-3 min-h-[100px]'
      onClick={onSelect}>
      <span className='text-sm text-gray-400'>
        {field.placeholder || 'Click to edit rich text...'}
      </span>
    </div>
  );
}

/**
 * Media field preview
 * Single responsibility: Render media upload preview
 */
export function MediaPreview({ field }: { field: FormField }) {
  const fileTypesLabel =
    field.fileTypes && field.fileTypes.length > 0
      ? field.fileTypes
          .map(
            (type) =>
              type.charAt(0).toUpperCase() + type.slice(1).replace('_', '/'),
          )
          .join(', ')
      : null;

  return (
    <div className='w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50'>
      <div className='text-sm text-gray-600'>
        <span className='font-medium text-blue-600'>Click to upload</span> or
        drag and drop
      </div>
      <div className='text-xs text-gray-500 mt-1'>
        {fileTypesLabel && (
          <span className='font-medium'>{fileTypesLabel} • </span>
        )}
        {field.acceptedTypes && field.acceptedTypes.length > 0
          ? field.acceptedTypes.join(', ')
          : 'Any file type'}{' '}
        • Max {field.maxFiles || 1} file(s)
      </div>
    </div>
  );
}

/**
 * Calculated field preview
 * Single responsibility: Render calculated field preview
 */
export function CalculatedPreview({ field }: { field: FormField }) {
  return (
    <div className='border h-10 rounded-md bg-gray-50 items-center flex pl-3'>
      <span className='text-md text-gray-400'>
        {field.formula ? `Formula: ${field.formula}` : 'No formula defined'}
      </span>
    </div>
  );
}

/**
 * Map field preview
 * Single responsibility: Render map field preview
 */
export function MapPreview({ field }: { field: FormField }) {
  const formatArea = (area: number, unit: string = 'm²'): string => {
    if (!area || area === 0) return '0 ' + unit;

    let convertedArea = area;
    switch (unit) {
      case 'km²':
        convertedArea = area / 1000000;
        break;
      case 'hectare':
        convertedArea = area / 10000;
        break;
      case 'acre':
        convertedArea = area / 4046.86;
        break;
      default:
        convertedArea = area;
    }

    return `${convertedArea.toFixed(2)} ${unit}`;
  };

  const area = field.calculatedArea || 0;
  const length = field.calculatedLength || 0;
  const unit = field.areaUnit || 'm²';
  const lengthUnit = field.lengthUnit || 'm';
  const pointCount = field.mapCoordinates?.length || 0;
  const coordinates = field.mapCoordinates || [];
  const drawingMode = field.mapDrawingMode || 'coordinate';

  return (
    <div className='space-y-2'>
      <div className='border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50'>
        <div className='text-sm text-gray-600 mb-2'>
          <span className='font-medium text-blue-600'>
            Map Field ({drawingMode})
          </span>
        </div>
        <div className='text-xs text-gray-500 mb-3'>
          {pointCount === 0
            ? `Click on map to draw ${drawingMode}`
            : drawingMode === 'coordinate'
              ? '1 coordinate selected'
              : drawingMode === 'polygon' && pointCount < 3
                ? `${pointCount} point${pointCount !== 1 ? 's' : ''} added (need at least 3)`
                : drawingMode === 'polygon'
                  ? `Polygon with ${pointCount} points • Area: ${formatArea(area, unit)}`
                  : drawingMode === 'circle'
                    ? `Circle • Area: ${formatArea(area, unit)}`
                    : drawingMode === 'rectangle'
                      ? `Rectangle • Area: ${formatArea(area, unit)}`
                      : drawingMode === 'line'
                        ? `Line with ${pointCount} points • Length: ${length.toFixed(2)} ${lengthUnit}`
                        : `${pointCount} point${pointCount !== 1 ? 's' : ''} added`}
        </div>
        {coordinates.length > 0 && (
          <div className='mt-3 pt-3 border-t border-gray-200 text-left'>
            <p className='text-xs font-medium text-gray-700 mb-2'>
              Coordinates ({coordinates.length} points):
            </p>
            <div className='max-h-32 overflow-y-auto space-y-1'>
              {coordinates.map((coord, index) => (
                <div
                  key={index}
                  className='text-xs text-gray-600 p-1 bg-white rounded'>
                  <span className='font-medium'>P{index + 1}:</span>{' '}
                  {coord[0].toFixed(6)}, {coord[1].toFixed(6)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Range field preview
 * Single responsibility: Render range slider preview
 */
export function RangePreview({
  field,
  onSelect,
}: {
  field: FormField;
  onSelect: () => void;
}) {
  const min = field.rangeMin || 0;
  const max = field.rangeMax || 100;
  const step = field.rangeStep || 1;
  const mode = field.rangeMode || 'single';

  return (
    <div className='w-full space-y-4' onClick={onSelect}>
      <div className='flex items-center justify-between'>
        <span className='text-xs text-gray-500'>
          {field.rangeMinLabel || min}
        </span>
        <span className='text-xs text-gray-500'>
          {field.rangeMaxLabel || max}
        </span>
      </div>
      <Slider
        defaultValue={mode === 'range' ? [min, max] : [min + (max - min) / 2]}
        max={max}
        min={min}
        step={step}
        disabled
      />
    </div>
  );
}

/**
 * Multi Select field preview
 * Single responsibility: Render multi select preview
 */
export function MultiSelectPreview({
  field,
  onSelect,
}: {
  field: FormField;
  onSelect: () => void;
}) {
  return (
    <Button
      variant='outline'
      role='combobox'
      type='button'
      aria-expanded={false}
      className='w-full justify-between'
      onClick={onSelect}>
      <span className='text-gray-500'>
        {field.isDynamic
          ? '🔄 Dynamic options from API'
          : field.placeholder || 'Select options...'}
      </span>
      <ListChecks className='ml-2 h-4 w-4 shrink-0 opacity-50' />
    </Button>
  );
}

/**
 * Main field preview renderer
 * Single responsibility: Route to appropriate preview component
 */
export function FieldPreview({
  field,
  onSelect,
}: {
  field: FormField;
  onSelect: () => void;
}) {
  switch (field.type) {
    case 'rich_text':
      return <RichTextPreview field={field} />;

    case 'text':
    case 'email':
    case 'number':
    case 'nepali_unicode':
      return <TextInputPreview field={field} />;

    case 'phone':
      return <PhonePreview field={field} />;

    case 'textarea':
      return <TextareaPreview field={field} />;

    case 'rich_text_input':
      return <RichTextInputPreview field={field} onSelect={onSelect} />;

    case 'select':
      return <SelectPreview field={field} onSelect={onSelect} />;

    case 'multi_select':
      return <MultiSelectPreview field={field} onSelect={onSelect} />;

    case 'checkbox':
      return <CheckboxPreview field={field} onSelect={onSelect} />;

    case 'radio':
      return <RadioPreview field={field} onSelect={onSelect} />;

    case 'date':
      return <DatePreview field={field} onSelect={onSelect} />;

    case 'rating':
      return <RatingPreview field={field} onSelect={onSelect} />;

    case 'range':
      return <RangePreview field={field} onSelect={onSelect} />;

    case 'media':
      return <MediaPreview field={field} />;

    case 'calculated':
      return <CalculatedPreview field={field} />;

    case 'map':
      return <MapPreview field={field} />;

    default:
      return (
        <div className='text-gray-500'>Unknown field type: {field.type}</div>
      );
  }
}
