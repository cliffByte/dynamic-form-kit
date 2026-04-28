'use client';

import React from 'react';
import { FormField, ConditionalRule } from '../../../../../types/form';
import { Button } from '../../../../ui/button';
import { Label } from '../../../../ui/label';
import { Input } from '../../../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useFormBuilderStore } from '../../../store/useFormBuilderStore';

interface LogicEditorProps {
  field: FormField;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export const LogicEditor: React.FC<LogicEditorProps> = ({
  field,
  updateField,
}) => {
  const { fields } = useFormBuilderStore();
  const copyRule = field.metadata?.copyRule || {
    mappings: [],
    clearTargetsOnUncheck: false,
  };

  // Get all fields except the current one and container fields
  const availableFields = React.useMemo(() => {
    const allFields: FormField[] = [];
    const flatten = (items: FormField[]) => {
      items.forEach((item) => {
        if (
          item.id !== field.id &&
          ![
            'step_section',
            'ui_section',
            'header',
            'paragraph',
            'rich_text',
          ].includes(item.type)
        ) {
          allFields.push(item);
        }
        if (item.fields) flatten(item.fields);
      });
    };
    flatten(fields);
    return allFields;
  }, [fields, field.id]);

  const integrationFields = React.useMemo(
    () => availableFields.filter((f) => !!f.uniqueIdentifier),
    [availableFields],
  );

  const addRule = () => {
    const newRules = [
      ...(field.conditionalRules || []),
      { fieldId: '', operator: 'equals', value: '' },
    ];
    updateField(field.id, { conditionalRules: newRules as ConditionalRule[] });
  };

  const updateRule = (index: number, updates: Partial<ConditionalRule>) => {
    const newRules = [...(field.conditionalRules || [])];
    newRules[index] = { ...newRules[index], ...updates };
    updateField(field.id, { conditionalRules: newRules });
  };

  const removeRule = (index: number) => {
    const newRules = (field.conditionalRules || []).filter(
      (_, i) => i !== index,
    );
    updateField(field.id, { conditionalRules: newRules });
  };

  const updateCopyRule = (updates: any) => {
    updateField(field.id, {
      metadata: {
        ...(field.metadata || {}),
        copyRule: {
          ...copyRule,
          ...updates,
        },
      },
    });
  };

  const addCopyMapping = () => {
    const nextMappings = [
      ...(copyRule.mappings || []),
      { sourceUniqueIdentifier: '', targetUniqueIdentifier: '' },
    ];
    updateCopyRule({ mappings: nextMappings });
  };

  const updateCopyMapping = (
    index: number,
    updates: { sourceUniqueIdentifier?: string; targetUniqueIdentifier?: string },
  ) => {
    const nextMappings = [...(copyRule.mappings || [])];
    nextMappings[index] = { ...nextMappings[index], ...updates };
    updateCopyRule({ mappings: nextMappings });
  };

  const removeCopyMapping = (index: number) => {
    const nextMappings = (copyRule.mappings || []).filter((_: any, i: number) => i !== index);
    updateCopyRule({ mappings: nextMappings });
  };

  return (
    <div className='border-t pt-4 space-y-4'>
      <div className='flex items-center justify-between'>
        <h4 className='text-sm font-medium text-gray-700'>
          Conditional Visibility
        </h4>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={addRule}
          className='h-7 text-[10px] gap-1'>
          <Plus className='w-3 h-3' /> Add Rule
        </Button>
      </div>

      <p className='text-[11px] text-muted-foreground'>
        This field will ONLY be shown if ANY of the following rules match.
      </p>

      {!field.conditionalRules || field.conditionalRules.length === 0 ? (
        <div className='text-center p-4 border border-dashed rounded-lg bg-gray-50/50'>
          <p className='text-[10px] text-muted-foreground'>
            No visibility rules defined
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {field.conditionalRules.map((rule, idx) => (
            <div
              key={idx}
              className='p-3 bg-gray-50 border border-border rounded-lg space-y-3 relative group'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => removeRule(idx)}
                className='absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-border opacity-0 group-hover:opacity-100 transition-opacity'>
                <Trash2 className='w-3 h-3 text-destructive' />
              </Button>

              <div className='space-y-1.5'>
                <Label className='text-[10px] uppercase text-muted-foreground'>
                  When Field
                </Label>
                <Select
                  value={rule.fieldId}
                  onValueChange={(val) => updateRule(idx, { fieldId: val })}>
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Select field' />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label || f.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] uppercase text-muted-foreground'>
                    Operator
                  </Label>
                  <Select
                    value={rule.operator}
                    onValueChange={(val: any) =>
                      updateRule(idx, { operator: val })
                    }>
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='equals'>Equals</SelectItem>
                      <SelectItem value='not_equals'>Not Equals</SelectItem>
                      <SelectItem value='contains'>Contains</SelectItem>
                      <SelectItem value='not_contains'>Not Contains</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] uppercase text-muted-foreground'>
                    Value
                  </Label>
                  <Input
                    type='text'
                    value={rule.value}
                    onChange={(e) => updateRule(idx, { value: e.target.value })}
                    placeholder='Value to match'
                    className='h-8 text-xs'
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='border-t pt-4 space-y-3'>
        <div className='flex items-center justify-between'>
          <h4 className='text-sm font-medium text-gray-700'>Copy Mapping Trigger</h4>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={addCopyMapping}
            className='h-7 text-[10px] gap-1'
            disabled={!field.uniqueIdentifier}>
            <Plus className='w-3 h-3' /> Add Mapping
          </Button>
        </div>

        {!field.uniqueIdentifier ? (
          <p className='text-[11px] text-amber-600'>
            Set this field&apos;s Integration Key first. This field becomes the trigger.
          </p>
        ) : (
          <>
            <p className='text-[11px] text-muted-foreground'>
              When this trigger field changes, copy source values into target fields.
            </p>

            <div className='space-y-1.5'>
              <Label className='text-[10px] uppercase text-muted-foreground'>
                Trigger Value (optional)
              </Label>
              <Input
                type='text'
                value={copyRule.triggerValue ?? ''}
                onChange={(e) =>
                  updateCopyRule({ triggerValue: e.target.value || undefined })
                }
                placeholder='Leave empty to trigger on checked/truthy'
                className='h-8 text-xs'
              />
            </div>

            <label className='flex items-center gap-2 text-xs'>
              <input
                type='checkbox'
                checked={!!copyRule.clearTargetsOnUncheck}
                onChange={(e) =>
                  updateCopyRule({ clearTargetsOnUncheck: e.target.checked })
                }
              />
              Clear target fields when trigger is off
            </label>

            {(copyRule.mappings || []).length === 0 ? (
              <div className='text-center p-3 border border-dashed rounded-lg bg-gray-50/50'>
                <p className='text-[10px] text-muted-foreground'>
                  No copy mappings configured
                </p>
              </div>
            ) : (
              <div className='space-y-2'>
                {(copyRule.mappings || []).map((mapping: any, idx: number) => (
                  <div
                    key={idx}
                    className='p-3 bg-gray-50 border border-border rounded-lg space-y-2 relative group'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => removeCopyMapping(idx)}
                      className='absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-border opacity-0 group-hover:opacity-100 transition-opacity'>
                      <Trash2 className='w-3 h-3 text-destructive' />
                    </Button>

                    <div className='grid grid-cols-2 gap-2'>
                      <div className='space-y-1.5'>
                        <Label className='text-[10px] uppercase text-muted-foreground'>
                          Source Field
                        </Label>
                        <Select
                          value={mapping.sourceUniqueIdentifier || ''}
                          onValueChange={(val) =>
                            updateCopyMapping(idx, { sourceUniqueIdentifier: val })
                          }>
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue placeholder='Select source' />
                          </SelectTrigger>
                          <SelectContent>
                            {integrationFields.map((f) => (
                              <SelectItem
                                key={`${f.id}-source`}
                                value={f.uniqueIdentifier!}>
                                {f.label} ({f.uniqueIdentifier})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className='space-y-1.5'>
                        <Label className='text-[10px] uppercase text-muted-foreground'>
                          Target Field
                        </Label>
                        <Select
                          value={mapping.targetUniqueIdentifier || ''}
                          onValueChange={(val) =>
                            updateCopyMapping(idx, { targetUniqueIdentifier: val })
                          }>
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue placeholder='Select target' />
                          </SelectTrigger>
                          <SelectContent>
                            {integrationFields.map((f) => (
                              <SelectItem
                                key={`${f.id}-target`}
                                value={f.uniqueIdentifier!}>
                                {f.label} ({f.uniqueIdentifier})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
