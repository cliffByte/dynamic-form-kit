'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { FormField } from '../../types/form';
import { EnhancedFormSubmission } from '../../types/submission';
import { TemplateSelector } from './features/field-palette/TemplateSelector';
import { FieldPalette } from './features/field-palette/FieldPalette';
import { FormKitRoot } from '../FormKitRoot';
import { FormCanvas } from '../FormCanvas';
import {
  useFormBuilderStore,
  FormBuilderState,
} from './store/useFormBuilderStore';
import { SubmissionDataModal } from '../SubmissionDataModal';
import { createEnhancedSubmission } from '../../lib/formUtils';
import { canAddToRoot } from '../../lib/dragDropUtils';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

const FieldEditorLazy = React.lazy(() =>
  import('./features/field-editor/FieldEditor').then((mod) => ({
    default: mod.FieldEditor,
  })),
);

interface FormBuilderProps {
  fields: any[];
  setFields: (fields: any[]) => void;
}

// Inner component that uses DndProvider context
function FormCanvasWithDrop() {
  const {
    fields,
    selectedFieldId,
    selectField,
    updateField,
    deleteField,
    moveField,
    addFieldToSection,
    addFieldFromTemplateToSection,
    moveFieldBetweenSections,
    addField,
    addFieldFromTemplate,
  } = useFormBuilderStore(
    useShallow((state: FormBuilderState) => ({
      fields: state.fields,
      selectedFieldId: state.selectedFieldId,
      selectField: state.selectField,
      updateField: state.updateField,
      deleteField: state.deleteField,
      moveField: state.moveField,
      addFieldToSection: state.addFieldToSection,
      addFieldFromTemplateToSection: state.addFieldFromTemplateToSection,
      moveFieldBetweenSections: state.moveFieldBetweenSections,
      addField: state.addField,
      addFieldFromTemplate: state.addFieldFromTemplate,
    })),
  );

  const canAddStep = canAddToRoot(fields, 'step_section');
  const canAddNonStep = canAddToRoot(fields, 'text'); // Check for a regular field

  // Drop handler for adding fields at top level
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'field',
    canDrop: (item: { type: string; fieldType: FormField['type'] }) => {
      return canAddToRoot(fields, item.fieldType);
    },
    drop: (
      item: {
        type: string;
        fieldType: FormField['type'];
        schema?: FormField | FormField[];
      },
      monitor,
    ) => {
      // Only handle drops directly on this container, not on child sections
      // If a child section already handled the drop, don't add to top level
      if (!monitor.isOver({ shallow: true })) {
        return;
      }

      if (item.schema) {
        addFieldFromTemplate(item.schema);
      } else {
        addField(item.fieldType);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  // Create a ref callback for the drop target
  const dropRef = (node: HTMLDivElement | null) => {
    drop(node);
  };

  return (
    <div ref={dropRef}>
      <Card
        className={`min-h-150   shadow-sm hover:border-dashed p-4 transition-all duration-200 ${
          isOver
            ? canDrop
              ? 'border-primary bg-primary/5 shadow-md'
              : 'border-destructive bg-destructive/5 shadow-md'
            : 'border-border hover:border-primary/50'
        }`}>
        <div className='flex items-center justify-between mb-4 pb-3 border-b border-border'>
          <div className='flex items-center gap-3'>
            <div className='w-1 h-6 bg-primary rounded-sm'></div>
            <h3 className='text-lg font-semibold text-foreground'>
              Form Canvas
            </h3>
            {isOver && (
              <span
                className={`text-sm font-medium ${canDrop ? 'text-primary' : 'text-destructive'}`}>
                {canDrop ? 'Drop field here' : 'Cannot mix steps and fields'}
              </span>
            )}
          </div>
          <TemplateSelector />
        </div>
        <FormCanvas
          fields={fields}
          selectedFieldId={selectedFieldId}
          onFieldSelect={selectField}
          onFieldUpdate={updateField}
          onFieldDelete={deleteField}
          onFieldMove={moveField}
          onFieldAdd={addFieldToSection}
          onTemplateAdd={addFieldFromTemplateToSection}
          onFieldMoveBetweenSections={moveFieldBetweenSections}
        />

        {/* Add Section Button */}
        <div className='flex max-w-fit mx-auto'>
          <div className='mt-8 gap-4 flex justify-center'>
            <Button
              type='button'
              onClick={() => addField('step_section')}
              variant='outline'
              disabled={!canAddStep}
              title={
                !canAddStep ? 'Cannot add steps to a single-page form' : ''
              }
              className='hover:border-dashed  hover:border-primary hover:bg-primary/5 transition-colors'>
              <Plus className='w-4 h-4 mr-2' />
              Add Step Section
            </Button>
            <Button
              type='button'
              onClick={() => addField('ui_section')}
              variant='outline'
              disabled={!canAddNonStep}
              title={
                !canAddNonStep
                  ? 'Cannot add UI sections to a multi-step form'
                  : ''
              }
              className='hover:border-dashed hover:border-primary hover:bg-primary/5 transition-colors'>
              <Plus className='w-4 h-4 mr-2' />
              Add UI Section
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export const FormBuilder = React.memo(function FormBuilder({
  fields: externalFields,
  setFields: externalSetFields,
}: FormBuilderProps) {
  const setFields = useFormBuilderStore((state) => state.setFields);
  const resetStore = useFormBuilderStore((state) => state.resetStore);
  const initializeDefaultSection = useFormBuilderStore(
    (state) => state.initializeDefaultSection,
  );
  const enhancedSubmission = useFormBuilderStore(
    (state) => state.enhancedSubmission,
  );
  const setEnhancedSubmission = useFormBuilderStore(
    (state) => state.setEnhancedSubmission,
  );
  const fields = useFormBuilderStore((state) => state.fields);

  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  // Refs to prevent sync loops
  const isSyncingFromExternal = useRef(false);
  const isSyncingToExternal = useRef(false);
  const lastExternalFieldsRef = useRef<string>('');

  // Synchronize external fields with store
  useEffect(() => {
    // 1. Skip if the parent update was triggered by us (isSyncingToExternal is true)
    if (isSyncingToExternal.current) return;

    const externalFieldsJson = JSON.stringify(externalFields || []);

    // 2. Only proceed if external data actually changed compared to our last known state
    if (externalFieldsJson !== lastExternalFieldsRef.current) {
      const isExternalEmpty = !externalFields || externalFields.length === 0;

      if (isExternalEmpty) {
        // If parent is empty but we have data, reset (unless we just initialized)
        // We check if ref is '' to skip the first empty-to-empty transition on mount
        if (
          fields.length > 0 &&
          lastExternalFieldsRef.current !== '[]' &&
          lastExternalFieldsRef.current !== ''
        ) {
          resetStore();
          initializeDefaultSection();
        }
        lastExternalFieldsRef.current = '[]';
      } else {
        // Parent has data, sync it to our store
        lastExternalFieldsRef.current = externalFieldsJson;
        isSyncingFromExternal.current = true;
        setFields(externalFields);

        // Use a short timeout to clear the flag to allow state to settle
        const tid = setTimeout(() => {
          isSyncingFromExternal.current = false;
        }, 50);
        return () => clearTimeout(tid);
      }
    }
  }, [externalFields, fields.length]); // Minimize dependencies

  // Synchronize store back to parent
  useEffect(() => {
    // 1. Skip if we are currently receiving an update from the parent
    if (isSyncingFromExternal.current) return;

    const fieldsJson = JSON.stringify(fields);

    // 2. Only sync if internal state changed compared to our last known shared state
    if (fields.length > 0 && fieldsJson !== lastExternalFieldsRef.current) {
      // Mark as syncing to external IMMEDIATELY to prevent incoming reset
      isSyncingToExternal.current = true;

      // Debounce updates to the parent to prevent lagging and loop pressure
      const timeoutId = setTimeout(() => {
        // Ensure flag is still valid after wait
        if (isSyncingFromExternal.current) {
          isSyncingToExternal.current = false;
          return;
        }

        // Update ref before calling parent to "claim" this state as our last known
        lastExternalFieldsRef.current = fieldsJson;

        externalSetFields(fields);

        // Reset the "sending" flag after parent has had time to re-render
        const tid = setTimeout(() => {
          isSyncingToExternal.current = false;
        }, 100);
      }, 300);

      return () => {
        clearTimeout(timeoutId);
        // If we clear before timeout fired, we're still effectively "syncing" (waiting to sync)
        // so we don't want to accept incoming changes that might be older than our pending change
      };
    } else if (
      fields.length === 0 &&
      lastExternalFieldsRef.current !== '[]' &&
      lastExternalFieldsRef.current !== ''
    ) {
      // Handle empty fields case if needed
      isSyncingToExternal.current = false;
    }
  }, [fields, externalSetFields]);

  const handleGenerateFormData = () => {
    const submission = createEnhancedSubmission(fields);
    setEnhancedSubmission(submission);

    // Format submission data for easy mapping during edit
    // const formattedData = formatSubmissionDataForEdit(submission);

    setIsSubmissionModalOpen(true);
  };

  // Helper function to format submission data (same as in SubmissionDataModal)
  // function formatSubmissionDataForEdit(submission: EnhancedFormSubmission) {
  //   const formatted: Array<{
  //     fieldId: string;
  //     label: string;
  //     type: string;
  //     value: any;
  //     required?: boolean;
  //   }> = [];

  //   submission.fieldMap.forEach((field, fieldId) => {
  //     if (
  //       field.type === 'step_section' ||
  //       field.type === 'ui_section' ||
  //       field.type === 'array' ||
  //       field.type === 'table' ||
  //       field.type === 'rich_text'
  //     ) {
  //       return;
  //     }

  //     formatted.push({
  //       fieldId,
  //       label: field.label || fieldId,
  //       type: field.type,
  //       value: submission.submissionData[fieldId],
  //       required: field.required,
  //     });
  //   });

  //   return formatted;
  // }

  return (
    <FormKitRoot>
    <DndProvider backend={HTML5Backend}>
      <div className='flex flex-col gap-4 h-[calc(100vh-150px)]'>
        {/* Main Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden'>
          {/* Field Palette */}
          <div className='lg:col-span-2 h-full overflow-hidden'>
            <div className='h-full overflow-y-auto custom-scrollbar pr-2'>
              <FieldPalette />
            </div>
          </div>

          {/* Form Canvas */}
          <div className='lg:col-span-7 h-full overflow-hidden'>
            <div className='h-full overflow-y-auto custom-scrollbar pr-2'>
              <FormCanvasWithDrop />
            </div>
          </div>

          {/* Field Editor */}
          <div className='lg:col-span-3 h-full overflow-hidden'>
            <div className='h-full overflow-y-auto custom-scrollbar pr-2'>
              <Suspense fallback={null}>
                <FieldEditorLazy />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Data Modal */}
      <SubmissionDataModal
        isOpen={isSubmissionModalOpen}
        onOpenChange={setIsSubmissionModalOpen}
        enhancedSubmission={enhancedSubmission}
      />
    </DndProvider>
    </FormKitRoot>
  );
});
