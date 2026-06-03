'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FormField, OptionConfig, NestedForm } from '../../../../types/form';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Save } from 'lucide-react';
import {
  useFormBuilderStore,
  FormBuilderState,
} from '../../store/useFormBuilderStore';
import { useFormBuilderSync } from '../../FormBuilderSyncContext';
import { useShallow } from 'zustand/react/shallow';
import { getLanguageName } from '../../../../lib/languageList';
import { TemplateSaveDialog } from '../../../TemplateSaveDialog';
import { RichTextEditorDialog } from '../../../RichTextEditorDialog';
import { NestedFormDialog } from '../../../NestedFormDialog';
import { setLocalizedFieldValue } from '../../../../lib/fieldLocalization';

// Refactored Sub-components
import { BasicPropertiesEditor } from './components/BasicPropertiesEditor';
import { ValidationEditor } from './components/ValidationEditor';
import { ChoiceOptionsEditor } from './components/ChoiceOptionsEditor';
import { MatrixEditor } from './components/MatrixEditor';
import { MediaEditor } from './components/MediaEditor';
import { MapEditor } from './components/MapEditor';
import { StepSectionEditor } from './components/StepSectionEditor';
import { UISectionEditor } from './components/UISectionEditor';
import { CalculatedFieldEditor } from './components/CalculatedFieldEditor';
import { TableEditor } from './components/TableEditor';
import { AnalyticsEditor } from './components/AnalyticsEditor';
import { LogicEditor } from './components/LogicEditor';
import { DateSettingsEditor } from './components/DateSettingsEditor';
import { InstructionEditor } from './components/InstructionEditor';
import { RangeEditor } from './components/RangeEditor';
import { RatingEditor } from './components/RatingEditor';
import { TextareaEditor } from './components/TextareaEditor';
import { ArrayEditor } from './components/ArrayEditor';
import { PhoneEditor } from './components/PhoneEditor';
import { DefaultValueEditor } from './components/DefaultValueEditor';

interface FieldEditorProps {
  field?: FormField;
  onFieldUpdate?: (updates: Partial<FormField>) => void;
  allFields?: FormField[];
}

const FieldEditorComponent = React.memo(function FieldEditor(
  props: FieldEditorProps,
) {
  const { selectedField, allFieldsInStore, updateFieldInStore } =
    useFormBuilderStore(
      useShallow((state: FormBuilderState) => ({
        selectedField: state.getSelectedField(),
        allFieldsInStore: state.fields,
        updateFieldInStore: state.updateField,
      })),
    );

  const field = props.field !== undefined ? props.field : selectedField;
  const allFields = props.allFields ?? allFieldsInStore;
  const formBuilderSync = useFormBuilderSync();

  const updateField = useCallback(
    (_id: string, updates: Partial<FormField>) => {
      if (props.onFieldUpdate) {
        props.onFieldUpdate(updates);
      } else if (field) {
        updateFieldInStore(field.id, updates);
      }
    },
    [field?.id, props.onFieldUpdate, updateFieldInStore],
  );

  const [editingLocale, setEditingLocale] = useState<string>('en');
  const [options, setOptions] = useState<string[]>([]);
  const [optionConfigs, setOptionConfigs] = useState<OptionConfig[]>([]);
  const [isAdvancedMode, setIsAdvancedMode] = useState(true);
  const [templateSaveDialogOpen, setTemplateSaveDialogOpen] = useState(false);
  const [richTextDialog, setRichTextDialog] = useState({ isOpen: false });
  const [nestedFormDialog, setNestedFormDialog] = useState<{
    isOpen: boolean;
    optionIndex: number | null;
    nestedForm: NestedForm | null;
  }>({
    isOpen: false,
    optionIndex: null,
    nestedForm: null,
  });

  const availableLanguages = ['en', 'ne'];

  // Initialize/Sync translations
  useEffect(() => {
    if (!field) return;
    const currentTranslations = field.translations || {};
    const updatedTranslations = { ...currentTranslations };
    let hasChanges = false;

    const translatableProperties: Array<
      keyof NonNullable<FormField['translations']>
    > = ['label', 'instruction', 'placeholder', 'content', 'stepDescription'];

    translatableProperties.forEach((prop) => {
      if (!updatedTranslations[prop]) {
        updatedTranslations[prop] = {};
      }
      availableLanguages.forEach((lang) => {
        if ((updatedTranslations[prop] as any)[lang] === undefined) {
          (updatedTranslations[prop] as any)[lang] = '';
          hasChanges = true;
        }
      });
    });

    const arrayProperties: Array<keyof NonNullable<FormField['translations']>> =
      ['options', 'matrixRows', 'matrixColumns'];
    arrayProperties.forEach((prop) => {
      if (!updatedTranslations[prop]) {
        updatedTranslations[prop] = {};
      }
      availableLanguages.forEach((lang) => {
        if ((updatedTranslations[prop] as any)[lang] === undefined) {
          const defaultValue = (field as any)[prop] || [];
          (updatedTranslations[prop] as any)[lang] = Array.isArray(defaultValue)
            ? [...defaultValue]
            : [];
          hasChanges = true;
        }
      });
    });

    if (hasChanges) {
      updateField(field.id, { translations: updatedTranslations });
    }
  }, [field?.id]);

  // Sync Options
  useEffect(() => {
    if (!field) return;
    if (field.options) {
      const currentOptions =
        editingLocale !== 'en' && field.translations?.options?.[editingLocale]
          ? field.translations.options[editingLocale]
          : field.options;
      setOptions([...currentOptions]);
    } else {
      setOptions(['Option 1', 'Option 2', 'Option 3']);
    }

    if (field.optionConfigs) {
      setOptionConfigs([...field.optionConfigs]);
      setIsAdvancedMode(true);
    } else {
      setOptionConfigs([]);
      setIsAdvancedMode(true);
    }
  }, [
    field?.id,
    editingLocale,
    field?.options,
    field?.optionConfigs,
    field?.translations?.options,
  ]);

  const availableFields = useMemo(() => {
    const flatten = (list: FormField[]): FormField[] => {
      const res: FormField[] = [];
      list.forEach((f) => {
        res.push(f);
        if (f.fields?.length) res.push(...flatten(f.fields));
        // Include fields inside option nested-forms (so cascading can depend on them too)
        if (f.optionConfigs?.length) {
          for (const oc of f.optionConfigs) {
            if (oc.nestedForm?.fields?.length) {
              res.push(...flatten(oc.nestedForm.fields));
            }
          }
        }
      });
      return res;
    };
    return flatten(allFields).filter(
      (f) => f.id !== field?.id && f.type !== 'rich_text',
    );
  }, [allFields, field?.id]);

  const numberFields = useMemo(
    () =>
      availableFields.filter(
        (f) => f.type === 'number' || f.type === 'calculated',
      ),
    [availableFields],
  );

  if (!field) {
    return (
      <Card className='border-border shadow-sm'>
        <CardHeader className='pb-3 border-b border-border bg-gray-50'>
          <CardTitle className='text-base font-semibold'>
            Field Properties
          </CardTitle>
        </CardHeader>
        <CardContent className='flex items-center justify-center py-20'>
          <div className='text-center space-y-3 prose prose-sm'>
            <div className='w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center'>
              <Badge variant='outline' className='text-muted-foreground'>
                ?
              </Badge>
            </div>
            <p className='text-muted-foreground'>
              Select a field to edit its properties
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border-border shadow-sm h-full flex flex-col overflow-hidden'>
      <CardHeader className='pb-3 border-b border-border bg-gray-50 shrink-0'>
        <div className='flex items-center justify-between gap-4'>
          <CardTitle className='text-sm font-bold truncate flex items-center gap-2'>
            Properties:
            <Badge
              variant='outline'
              className='font-mono uppercase text-[10px]'>
              {field.type.replace('_', ' ')}
            </Badge>
          </CardTitle>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setTemplateSaveDialogOpen(true)}
            className='h-7 text-[10px] gap-1 px-2'>
            <Save className='w-3 h-3' /> Save Template
          </Button>
        </div>
      </CardHeader>

      <div className='bg-muted/30 border-b p-2 flex items-center gap-2 shrink-0 overflow-x-auto whitespace-nowrap'>
        <span className='text-[10px] font-bold uppercase text-muted-foreground px-1'>
          Language:
        </span>
        {availableLanguages.map((loc) => (
          <Button
            type='button'
            key={loc}
            variant={editingLocale === loc ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setEditingLocale(loc)}
            className='h-6 text-[10px] px-2'>
            {getLanguageName(loc)}
          </Button>
        ))}
      </div>

      <CardContent className='flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar'>
        <BasicPropertiesEditor
          field={field}
          editingLocale={editingLocale}
          updateField={updateField}
        />

        {field.type === 'rich_text' && (
          <Button
            type='button'
            variant='outline'
            className='w-full'
            onClick={() => setRichTextDialog({ isOpen: true })}>
            Edit Rich Text Content
          </Button>
        )}

        <ChoiceOptionsEditor
          field={field}
          editingLocale={editingLocale}
          updateField={updateField}
          onCascadeChange={formBuilderSync?.flushSchemaToExternal}
          options={options}
          setOptions={setOptions}
          optionConfigs={optionConfigs}
          setOptionConfigs={setOptionConfigs}
          isAdvancedMode={isAdvancedMode}
          setIsAdvancedMode={setIsAdvancedMode}
          availableFields={availableFields}
          onOpenNestedForm={(idx, form) =>
            setNestedFormDialog({
              isOpen: true,
              optionIndex: idx,
              nestedForm: form,
            })
          }
          removeNestedForm={(idx) => {
            const newConfigs = [...optionConfigs];
            newConfigs[idx].nestedForm = undefined;
            setOptionConfigs(newConfigs);
            updateField(field.id, { optionConfigs: newConfigs });
          }}
          updateNestedFormName={(idx, name) => {
            const newConfigs = [...optionConfigs];
            if (newConfigs[idx].nestedForm) {
              newConfigs[idx].nestedForm!.name = name;
              setOptionConfigs(newConfigs);
              updateField(field.id, { optionConfigs: newConfigs });
            }
          }}
        />

        <MatrixEditor
          field={field}
          editingLocale={editingLocale}
          updateField={updateField}
        />
        <MediaEditor field={field} updateField={updateField} />
        <MapEditor field={field} updateField={updateField} />
        <StepSectionEditor
          field={field}
          editingLocale={editingLocale}
          updateField={updateField}
        />
        <UISectionEditor field={field} updateField={updateField} />
        <CalculatedFieldEditor
          field={field}
          updateField={updateField}
          availableNumberFields={numberFields}
        />
        <TableEditor field={field} updateField={updateField} />
        <DateSettingsEditor field={field} updateField={updateField} />
        <RangeEditor
          field={field}
          editingLocale={editingLocale}
          updateField={updateField}
        />
        <RatingEditor field={field} updateField={updateField} />
        <TextareaEditor field={field} updateField={updateField} />
        <ArrayEditor field={field} updateField={updateField} />
        <PhoneEditor field={field} updateField={updateField} />

        <DefaultValueEditor
          field={field}
          editingLocale={editingLocale}
          updateField={updateField}
        />

        <ValidationEditor
          field={field}
          editingLocale={editingLocale}
          updateField={updateField}
        />

        <LogicEditor field={field} updateField={updateField} />

        <InstructionEditor
          field={field}
          editingLocale={editingLocale}
          updateField={updateField}
        />

        <AnalyticsEditor field={field} updateField={updateField} />

        {/* Dialogs */}
        <TemplateSaveDialog
          isOpen={templateSaveDialogOpen}
          onClose={() => setTemplateSaveDialogOpen(false)}
          field={field}
        />

        <RichTextEditorDialog
          isOpen={richTextDialog.isOpen}
          onClose={() => setRichTextDialog({ isOpen: false })}
          value={
            (editingLocale === 'en'
              ? field.content
              : field.translations?.content?.[editingLocale]) || ''
          }
          onChange={(content) => {
            if (editingLocale === 'en') {
              updateField(field.id, { content });
            } else {
              const updated = setLocalizedFieldValue(
                field,
                'content',
                editingLocale,
                content,
              );
              updateField(field.id, { translations: updated.translations });
            }
          }}
          title='Edit Rich Text'
        />

        <NestedFormDialog
          isOpen={nestedFormDialog.isOpen}
          onClose={() =>
            setNestedFormDialog({
              isOpen: false,
              optionIndex: null,
              nestedForm: null,
            })
          }
          nestedForm={nestedFormDialog.nestedForm}
          onSave={(form) => {
            if (nestedFormDialog.optionIndex === null) return;
            const newConfigs = [...optionConfigs];
            newConfigs[nestedFormDialog.optionIndex].nestedForm = form;
            setOptionConfigs(newConfigs);
            updateField(field.id, { optionConfigs: newConfigs });
            setNestedFormDialog({
              isOpen: false,
              optionIndex: null,
              nestedForm: null,
            });
          }}
        />
      </CardContent>
    </Card>
  );
});

export const FieldEditor = FieldEditorComponent;
export default FieldEditorComponent;
