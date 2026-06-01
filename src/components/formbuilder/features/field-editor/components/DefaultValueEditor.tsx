'use client';

import React from 'react';
import { FormField } from '../../../../../types/form';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import { Textarea } from '../../../../ui/textarea';
import { Button } from '../../../../ui/button';
import { Checkbox } from '../../../../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../ui/select';
interface DefaultValueEditorProps {
  field: FormField;
  editingLocale: string;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

const TYPES_WITHOUT_DEFAULT: FormField['type'][] = [
  'rich_text',
  'step_section',
  'ui_section',
  'array',
  'table',
  'calculated',
  'map',
  'media',
];

function setDefault(
  field: FormField,
  updateField: DefaultValueEditorProps['updateField'],
  value: unknown,
) {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value as object).length === 0)
  ) {
    updateField(field.id, { default_value: undefined });
    return;
  }
  updateField(field.id, { default_value: value });
}

function getStaticChoiceOptions(
  field: FormField,
): { label: string; value: string }[] {
  if (field.optionConfigs?.length) {
    return field.optionConfigs.map((c) => ({
      label: c.label || c.value,
      value: c.value,
    }));
  }
  return (field.options ?? []).map((o) => ({ label: o, value: o }));
}

export const DefaultValueEditor: React.FC<DefaultValueEditorProps> = ({
  field,
  editingLocale,
  updateField,
}) => {
  if (TYPES_WITHOUT_DEFAULT.includes(field.type)) return null;

  if (editingLocale !== 'en') {
    return (
      <div className='border-t pt-4 space-y-2'>
        <h4 className='text-sm font-medium text-gray-700'>Default Value</h4>
        <p className='text-xs text-muted-foreground'>
          Default values are configured in English only. Switch to English to
          edit.
        </p>
      </div>
    );
  }

  const clearButton = (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      className='h-7 text-xs'
      onClick={() => setDefault(field, updateField, undefined)}>
      Clear default
    </Button>
  );

  const renderChoiceSingle = () => {
    if (field.isDynamic) {
      return (
        <Input
          value={
            field.default_value != null ? String(field.default_value) : ''
          }
          onChange={(e) =>
            setDefault(
              field,
              updateField,
              e.target.value === '' ? undefined : e.target.value,
            )
          }
          placeholder='Option value from API (e.g. option_1)'
          className='text-sm'
        />
      );
    }

    const options = getStaticChoiceOptions(field);
    if (options.length === 0) {
      return (
        <p className='text-xs text-muted-foreground'>
          Add options above before setting a default.
        </p>
      );
    }

    return (
      <Select
        value={
          field.default_value != null && field.default_value !== ''
            ? String(field.default_value)
            : '__none__'
        }
        onValueChange={(v) =>
          setDefault(field, updateField, v === '__none__' ? undefined : v)
        }>
        <SelectTrigger>
          <SelectValue placeholder='No default' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='__none__'>No default</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderChoiceMultiple = () => {
    if (field.isDynamic) {
      return (
        <Input
          value={
            Array.isArray(field.default_value)
              ? field.default_value.join(', ')
              : field.default_value != null
                ? String(field.default_value)
                : ''
          }
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!raw) {
              setDefault(field, updateField, undefined);
              return;
            }
            setDefault(
              field,
              updateField,
              raw.split(',').map((s) => s.trim()).filter(Boolean),
            );
          }}
          placeholder='Comma-separated values (e.g. a, b)'
          className='text-sm'
        />
      );
    }

    const options = getStaticChoiceOptions(field);
    if (options.length === 0) {
      return (
        <p className='text-xs text-muted-foreground'>
          Add options above before setting defaults.
        </p>
      );
    }

    const selected = new Set(
      Array.isArray(field.default_value)
        ? field.default_value.map(String)
        : field.default_value != null && field.default_value !== ''
          ? [String(field.default_value)]
          : [],
    );

    return (
      <div className='space-y-2 rounded-md border border-border p-3'>
        {options.map((opt) => (
          <label
            key={opt.value}
            className='flex items-center gap-2 text-sm cursor-pointer'>
            <Checkbox
              checked={selected.has(opt.value)}
              onCheckedChange={(checked) => {
                const next = new Set(selected);
                if (checked) next.add(opt.value);
                else next.delete(opt.value);
                setDefault(field, updateField, Array.from(next));
              }}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    );
  };

  const renderMatrixDefault = () => {
    const rows = field.matrixRows ?? [];
    const columns = field.matrixColumns ?? [];
    if (rows.length === 0 || columns.length === 0) {
      return (
        <p className='text-xs text-muted-foreground'>
          Configure matrix rows and columns first.
        </p>
      );
    }

    const current: Record<string, string> =
      field.default_value &&
      typeof field.default_value === 'object' &&
      !Array.isArray(field.default_value)
        ? (field.default_value as Record<string, string>)
        : {};

    return (
      <div className='space-y-2'>
        {rows.map((row, rowIndex) => {
          const rowKey = `row_${rowIndex}`;
          return (
            <div key={rowKey} className='flex items-center gap-2'>
              <span className='text-xs text-muted-foreground w-28 shrink-0 truncate'>
                {row}
              </span>
              <Select
                value={current[rowKey] ?? '__none__'}
                onValueChange={(col) => {
                  const next = { ...current };
                  if (col === '__none__') delete next[rowKey];
                  else next[rowKey] = col;
                  setDefault(field, updateField, next);
                }}>
                <SelectTrigger className='h-8 text-xs flex-1'>
                  <SelectValue placeholder='No default' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>No default</SelectItem>
                  {columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    );
  };

  let control: React.ReactNode = null;

  switch (field.type) {
    case 'text':
    case 'email':
    case 'nepali_unicode':
    case 'phone':
    case 'rich_text_input':
      control = (
        <Input
          type={field.type === 'email' ? 'email' : 'text'}
          value={
            field.default_value != null ? String(field.default_value) : ''
          }
          onChange={(e) =>
            setDefault(
              field,
              updateField,
              e.target.value === '' ? undefined : e.target.value,
            )
          }
          placeholder='Default text'
        />
      );
      break;

    case 'textarea':
      control = (
        <Textarea
          value={
            field.default_value != null ? String(field.default_value) : ''
          }
          onChange={(e) =>
            setDefault(
              field,
              updateField,
              e.target.value === '' ? undefined : e.target.value,
            )
          }
          placeholder='Default text'
          rows={3}
        />
      );
      break;

    case 'number':
      control = (
        <Input
          type='number'
          value={
            field.default_value != null && field.default_value !== ''
              ? String(field.default_value)
              : ''
          }
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              setDefault(field, updateField, undefined);
              return;
            }
            const n = Number(raw);
            setDefault(field, updateField, Number.isFinite(n) ? n : undefined);
          }}
          placeholder='Default number'
          min={field.validation?.min}
          max={field.validation?.max}
        />
      );
      break;

    case 'select':
    case 'radio':
      control = renderChoiceSingle();
      break;

    case 'multi_select':
    case 'checkbox':
      control = renderChoiceMultiple();
      break;

    case 'date': {
      const isRange = field.dateMode === 'range';
      const rangeVal =
        field.default_value &&
        typeof field.default_value === 'object' &&
        !Array.isArray(field.default_value)
          ? (field.default_value as { from?: string; to?: string })
          : {};

      if (isRange) {
        control = (
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1'>
              <Label className='text-xs text-muted-foreground'>From</Label>
              <Input
                type='date'
                value={rangeVal.from ?? ''}
                onChange={(e) =>
                  setDefault(field, updateField, {
                    ...rangeVal,
                    from: e.target.value || undefined,
                  })
                }
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-xs text-muted-foreground'>To</Label>
              <Input
                type='date'
                value={rangeVal.to ?? ''}
                onChange={(e) =>
                  setDefault(field, updateField, {
                    ...rangeVal,
                    to: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>
        );
      } else {
        control = (
          <Input
            type='date'
            value={
              field.default_value != null && field.default_value !== ''
                ? String(field.default_value).slice(0, 10)
                : ''
            }
            onChange={(e) =>
              setDefault(
                field,
                updateField,
                e.target.value === '' ? undefined : e.target.value,
              )
            }
          />
        );
      }
      break;
    }

    case 'range': {
      const min = field.rangeMin ?? 0;
      const max = field.rangeMax ?? 100;
      const isRange = field.rangeMode === 'range';
      const arr = Array.isArray(field.default_value)
        ? field.default_value
        : typeof field.default_value === 'number'
          ? [field.default_value]
          : [];

      if (isRange) {
        control = (
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1'>
              <Label className='text-xs text-muted-foreground'>Low</Label>
              <Input
                type='number'
                min={min}
                max={max}
                value={arr[0] != null ? String(arr[0]) : ''}
                onChange={(e) => {
                  const low =
                    e.target.value === '' ? min : Number(e.target.value);
                  const high = arr[1] ?? max;
                  setDefault(field, updateField, [low, high]);
                }}
              />
            </div>
            <div className='space-y-1'>
              <Label className='text-xs text-muted-foreground'>High</Label>
              <Input
                type='number'
                min={min}
                max={max}
                value={arr[1] != null ? String(arr[1]) : ''}
                onChange={(e) => {
                  const high =
                    e.target.value === '' ? max : Number(e.target.value);
                  const low = arr[0] ?? min;
                  setDefault(field, updateField, [low, high]);
                }}
              />
            </div>
          </div>
        );
      } else {
        control = (
          <Input
            type='number'
            min={min}
            max={max}
            value={arr[0] != null ? String(arr[0]) : ''}
            onChange={(e) =>
              setDefault(
                field,
                updateField,
                e.target.value === '' ? undefined : Number(e.target.value),
              )
            }
            placeholder={`${min}–${max}`}
          />
        );
      }
      break;
    }

    case 'rating': {
      const max = field.ratingMax ?? 5;
      control = (
        <Input
          type='number'
          min={1}
          max={max}
          value={
            field.default_value != null && field.default_value !== ''
              ? String(field.default_value)
              : ''
          }
          onChange={(e) =>
            setDefault(
              field,
              updateField,
              e.target.value === '' ? undefined : Number(e.target.value),
            )
          }
          placeholder={`1–${max}`}
        />
      );
      break;
    }

    case 'matrix':
      control = renderMatrixDefault();
      break;

    default:
      return null;
  }

  const hasDefault =
    field.default_value !== undefined &&
    field.default_value !== null &&
    field.default_value !== '' &&
    !(
      Array.isArray(field.default_value) && field.default_value.length === 0
    ) &&
    !(
      typeof field.default_value === 'object' &&
      !Array.isArray(field.default_value) &&
      Object.keys(field.default_value as object).length === 0
    );

  return (
    <div className='border-t pt-4 space-y-3'>
      <div className='flex items-center justify-between gap-2'>
        <h4 className='text-sm font-medium text-gray-700'>Default Value</h4>
        {hasDefault && clearButton}
      </div>
      <p className='text-xs text-muted-foreground'>
        Pre-filled when users open the form (preview and live forms).
      </p>
      {control}
    </div>
  );
};
