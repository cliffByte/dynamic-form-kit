'use client';

import React, { useEffect, useState } from 'react';
import {
  DynamicDataSource,
  FormField,
  OptionConfig,
  NestedForm,
} from '../../../../../types/form';
import { Button } from '../../../../ui/button';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import { Textarea } from '../../../../ui/textarea';
import {
  formatDataSourceBody,
  parseDataSourceBody,
} from '../../../../../lib/dynamicDataSourceRequest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../ui/select';
import {
  SimpleOptionEditor,
  AdvancedOptionEditor,
  OptionModeSwitcher,
} from '../../../../OptionEditors';
import { setLocalizedFieldArray } from '../../../../../lib/fieldLocalization';

interface ChoiceOptionsEditorProps {
  field: FormField;
  editingLocale: string;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  options: string[];
  setOptions: (options: string[]) => void;
  optionConfigs: OptionConfig[];
  setOptionConfigs: (configs: OptionConfig[]) => void;
  isAdvancedMode: boolean;
  setIsAdvancedMode: (mode: boolean) => void;
  availableFields: FormField[];
  onOpenNestedForm: (index: number, nestedForm: NestedForm | null) => void;
  removeNestedForm: (index: number) => void;
  updateNestedFormName: (index: number, name: string) => void;
  /** Flush store schema to parent immediately after cascade link edits. */
  onCascadeChange?: () => void;
}

const CASCADE_DATA_SOURCE_KEYS = [
  'dependsOn',
  'parentValueParam',
  'parentValuePath',
] as const;

export const ChoiceOptionsEditor: React.FC<ChoiceOptionsEditorProps> = ({
  field,
  editingLocale,
  updateField,
  options,
  setOptions,
  optionConfigs,
  setOptionConfigs,
  isAdvancedMode,
  setIsAdvancedMode,
  availableFields,
  onOpenNestedForm,
  removeNestedForm,
  updateNestedFormName,
  onCascadeChange,
}) => {
  const isEn = editingLocale === 'en';
  const isPost = (field.dataSource?.method || 'GET') === 'POST';
  const defaultDynamicDataSource = React.useMemo(
    () => ({
      url: '',
      path: '',
      valueField: 'id',
      labelField: 'name',
    }),
    [],
  );

  const dataSourceInitRef = React.useRef<string | null>(null);
  const dependsOnRestoreAttemptedRef = React.useRef<Record<string, boolean>>(
    {},
  );
  const lastNonNullDataSourceByIdRef = React.useRef<
    Record<string, DynamicDataSource>
  >({});

  const patchDataSource = React.useCallback(
    (patch: Partial<DynamicDataSource>) => {
      // mergeFieldUpdate deep-merges this patch into the latest store field.dataSource
      updateField(field.id, {
        dataSource: patch as DynamicDataSource,
      });
      if (Object.prototype.hasOwnProperty.call(patch, 'dependsOn')) {
        const base =
          lastNonNullDataSourceByIdRef.current[field.id] ??
          field.dataSource ??
          {};
        const merged: DynamicDataSource = { ...base, ...patch };
        if (patch.dependsOn === undefined) {
          delete (merged as { dependsOn?: string }).dependsOn;
        }
        lastNonNullDataSourceByIdRef.current[field.id] = merged;
      }
      if (
        onCascadeChange &&
        CASCADE_DATA_SOURCE_KEYS.some((key) =>
          Object.prototype.hasOwnProperty.call(patch, key),
        )
      ) {
        onCascadeChange();
      }
    },
    [field.id, field.dataSource, updateField, onCascadeChange],
  );

  // Initialize dataSource once per field when dynamic is enabled (avoid re-init wiping dependsOn).
  useEffect(() => {
    dataSourceInitRef.current = null;
    delete dependsOnRestoreAttemptedRef.current[field.id];
  }, [field.id]);

  const hasCascadeStep2Config = Boolean(
    field.dataSource?.parentValuePath || field.dataSource?.parentValueParam,
  );

  const effectiveDependsOn = React.useMemo(() => {
    const current = field.dataSource?.dependsOn;
    if (current && current !== 'none') return current;
    const remembered = lastNonNullDataSourceByIdRef.current[field.id]?.dependsOn;
    if (remembered && remembered !== 'none' && hasCascadeStep2Config) {
      return remembered;
    }
    return undefined;
  }, [
    field.id,
    field.dataSource?.dependsOn,
    field.dataSource?.parentValuePath,
    field.dataSource?.parentValueParam,
    hasCascadeStep2Config,
  ]);

  // Remember last known good dataSource per field id (merge; never drop dependsOn while step 2 exists).
  useEffect(() => {
    if (!field.dataSource) return;
    const prev = lastNonNullDataSourceByIdRef.current[field.id];
    const merged: DynamicDataSource = { ...prev, ...field.dataSource };
    if (
      prev?.dependsOn &&
      prev.dependsOn !== 'none' &&
      field.dataSource.dependsOn === undefined &&
      (field.dataSource.parentValuePath || field.dataSource.parentValueParam)
    ) {
      merged.dependsOn = prev.dependsOn;
    }
    lastNonNullDataSourceByIdRef.current[field.id] = merged;
  }, [field.id, field.dataSource]);

  // Restore dependsOn if a stale sync stripped the link but step 2 / remembered config remains.
  useEffect(() => {
    if (!field.isDynamic || !field.dataSource) return;
    const remembered = lastNonNullDataSourceByIdRef.current[field.id];
    const rememberedDepends = remembered?.dependsOn;
    if (
      !rememberedDepends ||
      rememberedDepends === 'none' ||
      field.dataSource.dependsOn === rememberedDepends
    ) {
      if (field.dataSource.dependsOn) {
        delete dependsOnRestoreAttemptedRef.current[field.id];
      }
      return;
    }
    if (dependsOnRestoreAttemptedRef.current[field.id]) return;
    if (
      field.dataSource.dependsOn === undefined &&
      (field.dataSource.parentValuePath ||
        field.dataSource.parentValueParam ||
        remembered?.parentValuePath ||
        remembered?.parentValueParam)
    ) {
      dependsOnRestoreAttemptedRef.current[field.id] = true;
      patchDataSource({ dependsOn: rememberedDepends });
    }
  }, [
    field.id,
    field.isDynamic,
    field.dataSource,
    field.dataSource?.dependsOn,
    field.dataSource?.parentValuePath,
    field.dataSource?.parentValueParam,
    patchDataSource,
  ]);

  useEffect(() => {
    if (!field.isDynamic || field.dataSource) return;
    if (dataSourceInitRef.current === field.id) return;
    dataSourceInitRef.current = field.id;
    const restoredDataSource =
      lastNonNullDataSourceByIdRef.current[field.id];
    updateField(field.id, {
      dataSource: restoredDataSource ?? defaultDynamicDataSource,
    });
  }, [field.id, field.isDynamic, field.dataSource, updateField, defaultDynamicDataSource]);
  const [bodyText, setBodyText] = useState(() =>
    formatDataSourceBody(field.dataSource?.body),
  );
  const [bodyError, setBodyError] = useState<string | null>(null);

  useEffect(() => {
    setBodyText(formatDataSourceBody(field.dataSource?.body));
    setBodyError(null);
  }, [field.id, field.dataSource?.body]);

  const commitBody = (text: string) => {
    if (!field.dataSource) return;
    const result = parseDataSourceBody(text);
    if (!result.ok) {
      setBodyError(result.error);
      return;
    }
    setBodyError(null);
    patchDataSource({ body: result.body });
  };

  const needsOptions = [
    'select',
    'multi_select',
    'radio',
    'checkbox',
    'dropdown',
  ].includes(field.type);

  if (!needsOptions) return null;

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);

    if (isEn) {
      updateField(field.id, { options: newOptions });
    } else {
      // Update translation
      const updated = setLocalizedFieldArray(
        field,
        'options',
        editingLocale,
        newOptions,
      );

      // We don't need to update base options for simple text change in translation
      updateField(field.id, { translations: updated.translations });
    }
  };

  const addOption = () => {
    const newOptions = [...options, `Option ${options.length + 1}`];
    setOptions(newOptions);

    if (isEn) {
      updateField(field.id, { options: newOptions });
    } else {
      // Update Nepali translation
      let updated = setLocalizedFieldArray(
        field,
        'options',
        editingLocale,
        newOptions,
      );

      // IMPORTANT: Also update base options (English) to keep lengths in sync
      const baseOptions = field.options || [];
      const newBaseOptions = [
        ...baseOptions,
        `Option ${baseOptions.length + 1}`,
      ];

      updateField(field.id, {
        translations: updated.translations,
        options: newBaseOptions,
      });
    }
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);

    if (isEn) {
      updateField(field.id, { options: newOptions });
    } else {
      // Update translation
      let updated = setLocalizedFieldArray(
        field,
        'options',
        editingLocale,
        newOptions,
      );

      // IMPORTANT: Also update base options to keep lengths in sync
      const baseOptions = (field.options || []).filter((_, i) => i !== index);

      updateField(field.id, {
        translations: updated.translations,
        options: baseOptions,
      });
    }
  };

  const syncDefaultValueAfterOptionChange = (
    configs: OptionConfig[],
    removedValue?: string,
    previousValue?: string,
    nextValue?: string,
  ): Partial<FormField> => {
    const updates: Partial<FormField> = { optionConfigs: configs };

    if (removedValue !== undefined && field.default_value === removedValue) {
      updates.default_value = undefined;
    } else if (
      previousValue !== undefined &&
      nextValue !== undefined &&
      field.default_value === previousValue
    ) {
      updates.default_value = nextValue;
    }

    return updates;
  };

  const updateOptionConfig = (
    index: number,
    updates: Partial<OptionConfig>,
  ) => {
    const newConfigs = [...optionConfigs];
    const previousValue = optionConfigs[index]?.value;

    if (isEn) {
      newConfigs[index] = { ...newConfigs[index], ...updates };
    } else {
      // For non-English locales, only the label is translated within the config
      if (updates.label !== undefined) {
        const translations = newConfigs[index].translations || {};
        const labelTranslations = translations.label || {};
        newConfigs[index] = {
          ...newConfigs[index],
          translations: {
            ...translations,
            label: {
              ...labelTranslations,
              [editingLocale]: updates.label,
            },
          },
        };
      }
      // Value update is still considered global (shared across locales)
      if (updates.value !== undefined) {
        newConfigs[index] = { ...newConfigs[index], value: updates.value };
      }
    }

    setOptionConfigs(newConfigs);

    const fieldUpdates =
      updates.value !== undefined
        ? syncDefaultValueAfterOptionChange(
            newConfigs,
            undefined,
            previousValue,
            updates.value,
          )
        : { optionConfigs: newConfigs };

    updateField(field.id, fieldUpdates);
  };

  const addOptionConfig = () => {
    const newConfigs = [
      ...optionConfigs,
      {
        label: `Option ${optionConfigs.length + 1}`,
        value: `option_${optionConfigs.length + 1}`,
      },
    ];
    setOptionConfigs(newConfigs);
    updateField(field.id, { optionConfigs: newConfigs });
  };

  const removeOptionConfig = (index: number) => {
    const removedValue = optionConfigs[index]?.value;
    const newConfigs = optionConfigs.filter((_, i) => i !== index);
    setOptionConfigs(newConfigs);
    updateField(
      field.id,
      syncDefaultValueAfterOptionChange(newConfigs, removedValue),
    );
  };

  return (
    <div className='border-t pt-4 space-y-4'>
      <div className='flex items-center justify-between'>
        <h4 className='text-sm font-medium text-gray-700'>
          Options Configuration
        </h4>
        <div className='flex gap-2'>
          <Button
            type='button'
            variant={!field.isDynamic ? 'default' : 'outline'}
            size='sm'
            onClick={() =>
              updateField(field.id, { isDynamic: false, dataSource: undefined })
            }
            className='h-7 px-3 text-xs'>
            Static
          </Button>
          <Button
            type='button'
            variant={field.isDynamic ? 'default' : 'outline'}
            size='sm'
            onClick={() =>
              updateField(field.id, {
                isDynamic: true,
                dataSource: field.dataSource ?? defaultDynamicDataSource,
              })
            }
            className='h-7 px-3 text-xs'>
            Dynamic
          </Button>
        </div>
      </div>

      {!field.isDynamic ? (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <Label className='text-xs font-medium text-gray-500'>
              Static Options
            </Label>
            {/* <OptionModeSwitcher
              isAdvancedMode={isAdvancedMode}
              onSwitchToAdvanced={() => {
                const configs = options.map((opt) => ({
                  label: opt,
                  value: opt,
                }));
                setOptionConfigs(configs);
                updateField(field.id, { optionConfigs: configs });
                setIsAdvancedMode(true);
              }}
              onSwitchToSimple={() => {
                const simpleOptions = optionConfigs.map((c) => c.label);
                setOptions(simpleOptions);
                updateField(field.id, {
                  options: simpleOptions,
                  optionConfigs: undefined,
                });
                setOptionConfigs([]);
                setIsAdvancedMode(false);
              }}
            /> */}
          </div>

          {!isAdvancedMode ? (
            <SimpleOptionEditor
              options={options}
              onOptionChange={handleOptionChange}
              onAddOption={addOption}
              onRemoveOption={removeOption}
            />
          ) : (
            <AdvancedOptionEditor
              optionConfigs={optionConfigs}
              onAddOptionConfig={addOptionConfig}
              onOptionConfigUpdate={updateOptionConfig}
              onRemoveOptionConfig={removeOptionConfig}
              onOpenNestedForm={onOpenNestedForm}
              onRemoveNestedForm={removeNestedForm}
              onNestedFormNameChange={updateNestedFormName}
              editingLocale={editingLocale}
            />
          )}
        </div>
      ) : (
        <div className='p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-4'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>HTTP Method</Label>
              <Select
                value={field.dataSource?.method || 'GET'}
                onValueChange={(val: 'GET' | 'POST') => patchDataSource({ method: val })}>
                <SelectTrigger className='h-8 text-sm'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='GET'>GET</SelectItem>
                  <SelectItem value='POST'>POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>Data Source URL</Label>
              <Input
                value={field.dataSource?.url || ''}
                onChange={(e) => patchDataSource({ url: e.target.value })}
                placeholder='https://api.example.com/options'
                className='h-8 text-sm'
              />
            </div>
          </div>

          {isPost && (
            <div className='space-y-2'>
              <Label className='text-xs font-semibold'>Request Body (JSON)</Label>
              <Textarea
                value={bodyText}
                onChange={(e) => {
                  setBodyText(e.target.value);
                  if (bodyError) setBodyError(null);
                }}
                onBlur={(e) => commitBody(e.target.value)}
                placeholder={`{
  "page": 1,
  "pageSize": 50
}`}
                rows={6}
                className='font-mono text-xs'
              />
              {bodyError ? (
                <p className='text-[10px] text-destructive'>{bodyError}</p>
              ) : (
                <p className='text-[10px] text-muted-foreground'>
                  Paste JSON for the POST body. On blur, valid JSON is saved.
                  {field.dataSource?.dependsOn && field.dataSource?.parentValueParam
                    ? ` The parent field value is merged as "${field.dataSource.parentValueParam}" when the form loads options.`
                    : ''}
                </p>
              )}
            </div>
          )}

          <div className='space-y-2'>
            <Label className='text-xs font-semibold'>JSON Response Path</Label>
            <Input
              value={field.dataSource?.path || ''}
              onChange={(e) => patchDataSource({ path: e.target.value })}
              placeholder='data.items or list'
              className='h-8 text-sm'
            />
            <p className='text-[10px] text-muted-foreground'>
              JSON path to the array of options in the API response
            </p>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1.5'>
              <Label className='text-[10px] uppercase text-muted-foreground'>
                Label Field (English)
              </Label>
              <Input
                value={field.dataSource?.labelField || 'name'}
                onChange={(e) => patchDataSource({ labelField: e.target.value })}
                placeholder='name or data.value.en'
                className='h-8 text-xs'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-[10px] uppercase text-muted-foreground'>
                Label Field (Nepali)
              </Label>
              <Input
                value={field.dataSource?.labelFieldTranslations?.ne || ''}
                onChange={(e) => {
                  const ne = e.target.value.trim();
                  const current = field.dataSource?.labelFieldTranslations || {};
                  patchDataSource({
                    labelFieldTranslations: ne
                      ? { ...current, ne }
                      : Object.fromEntries(
                          Object.entries(current).filter(([key]) => key !== 'ne'),
                        ),
                  });
                }}
                placeholder='data.value.ne'
                className='h-8 text-xs'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-[10px] uppercase text-muted-foreground'>
                Value Field
              </Label>
              <Input
                value={field.dataSource?.valueField || 'id'}
                onChange={(e) => patchDataSource({ valueField: e.target.value })}
                placeholder='id'
                className='h-8 text-xs'
              />
            </div>
          </div>

          <div className='border-t pt-3 mt-1'>
            <div className='flex items-center gap-1.5 mb-1'>
              <Label className='text-xs font-bold text-blue-800'>
                Dependent Field (Cascading)
              </Label>
              <span className='text-[10px] text-blue-500 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5'>
                optional
              </span>
            </div>
            <p className='text-[10px] text-muted-foreground mb-3'>
              When a parent field&apos;s value changes, this field&apos;s
              options will automatically reload from the API using that value.
            </p>

            <div className='space-y-3'>
              {/* Step 1 — select parent */}
              <div className='space-y-1.5'>
                <Label className='text-[10px] uppercase text-muted-foreground'>
                  Step 1 · Depends On Field
                </Label>
                {/*
                  Note: Radix Select will appear "blank" if its value isn't present in the items list.
                  When a saved dependsOn points to a field that isn't in availableFields (e.g. nested/moved),
                  we still include a fallback item so the parent doesn't look like it was removed.
                */}
                <Select
                  key={`depends-on-${field.id}-${effectiveDependsOn ?? 'none'}`}
                  value={effectiveDependsOn ?? 'none'}
                  onValueChange={(val) => {
                    if (val === 'none') {
                      // Ignore spurious Radix reset while step 2 is still configured
                      if (hasCascadeStep2Config && effectiveDependsOn) {
                        return;
                      }
                      patchDataSource({
                        dependsOn: undefined,
                        parentValueParam: undefined,
                        parentValuePath: undefined,
                      });
                      return;
                    }
                    if (effectiveDependsOn === val) return;
                    patchDataSource({ dependsOn: val });
                  }}>
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Select parent field…' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>None (not dependent)</SelectItem>
                    {effectiveDependsOn &&
                      !availableFields.some((f) => f.id === effectiveDependsOn) && (
                        <SelectItem value={effectiveDependsOn}>
                          {`Missing field: ${effectiveDependsOn}`}
                        </SelectItem>
                      )}
                    {availableFields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label || f.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {effectiveDependsOn && (
                  <div className='space-y-3 p-2.5 bg-blue-50/60 border border-blue-200/60 rounded-lg'>
                    {/* How-it-works hint, changes by method */}
                    {(field.dataSource?.method || 'GET') === 'GET' ? (
                      <div className='rounded bg-amber-50 border border-amber-200 p-2 space-y-1'>
                        <p className='text-[10px] font-semibold text-amber-800'>
                          GET · URL placeholder injection
                        </p>
                        <p className='text-[10px] text-amber-700 leading-relaxed'>
                          Put a{' '}
                          <code className='bg-amber-100 px-0.5 rounded'>
                            {'{ }'}
                          </code>
                          -wrapped key anywhere in your Data Source URL. The
                          parent field&apos;s selected value will replace it at
                          runtime.
                        </p>
                        <div className='space-y-0.5 text-[10px] text-amber-700 font-mono'>
                          <div>
                            Path param →{' '}
                            <span className='text-amber-900'>
                              /api/items/<strong>{'{'}</strong>catId
                              <strong>{'}'}</strong>
                            </span>
                          </div>
                          <div>
                            Query param →{' '}
                            <span className='text-amber-900'>
                              /api/items?category=<strong>{'{'}</strong>catId
                              <strong>{'}'}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className='rounded bg-amber-50 border border-amber-200 p-2 space-y-1'>
                        <p className='text-[10px] font-semibold text-amber-800'>
                          POST · request body injection
                        </p>
                        <p className='text-[10px] text-amber-700 leading-relaxed'>
                          The parent field&apos;s selected value will be added
                          to the POST request body under the key name you
                          provide below. No URL change is needed.
                        </p>
                        <div className='text-[10px] text-amber-700 font-mono'>
                          Body →{' '}
                          <span className='text-amber-900'>
                            {'{ "categoryId": "<parent value>" }'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Step 2 — method-specific config */}
                    {(field.dataSource?.method || 'GET') === 'GET' ? (
                      <div className='space-y-1.5'>
                        <Label className='text-[10px] uppercase text-muted-foreground'>
                          Step 2 · Placeholder Key (name inside the braces)
                        </Label>
                        <Input
                          value={field.dataSource?.parentValuePath || ''}
                          onChange={(e) =>
                            patchDataSource({ parentValuePath: e.target.value })
                          }
                          placeholder='catId'
                          className='h-8 text-xs font-mono'
                        />
                        <p className='text-[10px] text-muted-foreground'>
                          Must match exactly what you wrote inside{' '}
                          <code className='bg-gray-100 rounded px-0.5'>
                            {'{ }'}
                          </code>{' '}
                          in your URL above.
                        </p>

                        {/* Live URL preview */}
                        {field.dataSource?.url &&
                          field.dataSource?.parentValuePath && (
                            <div className='space-y-0.5'>
                              <Label className='text-[10px] uppercase text-muted-foreground'>
                                Runtime URL preview
                              </Label>
                              <div className='p-1.5 bg-gray-100 rounded text-[10px] font-mono break-all text-gray-700'>
                                {field.dataSource.url.includes(
                                  `{${field.dataSource.parentValuePath}}`,
                                ) ? (
                                  <>
                                    {
                                      field.dataSource.url.split(
                                        `{${field.dataSource.parentValuePath}}`,
                                      )[0]
                                    }
                                    <span className='bg-green-200 text-green-800 rounded px-0.5'>
                                      &lt;parent-value&gt;
                                    </span>
                                    {
                                      field.dataSource.url.split(
                                        `{${field.dataSource.parentValuePath}}`,
                                      )[1]
                                    }
                                  </>
                                ) : (
                                  <span className='text-red-500'>
                                    ⚠ Placeholder{' '}
                                    <strong>{`{${field.dataSource.parentValuePath}}`}</strong>{' '}
                                    not found in URL
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className='space-y-1.5'>
                        <Label className='text-[10px] uppercase text-muted-foreground'>
                          Step 2 · Body Parameter Name
                        </Label>
                        <Input
                          value={field.dataSource?.parentValueParam || ''}
                          onChange={(e) =>
                            patchDataSource({ parentValueParam: e.target.value })
                          }
                          placeholder='categoryId'
                          className='h-8 text-xs font-mono'
                        />
                        {field.dataSource?.parentValueParam && (
                          <p className='text-[10px] text-muted-foreground font-mono'>
                            Body will include:{' '}
                            <span className='text-gray-700'>
                              {`{ "${field.dataSource.parentValueParam}": "<parent-value>" }`}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
