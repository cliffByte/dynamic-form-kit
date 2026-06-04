'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormField } from '../../types/form';
import { createEnhancedSubmission, shouldShowField } from '../../lib/formUtils';
import { cleanSubmissionData } from '../../lib/formUtils';
import { useDynamicFormOptions } from '../../hooks/useDynamicFormOptions';
import { getDynamicParentFieldId } from '../../lib/dynamicFieldUtils';
import { useLocalizedFields } from '../../hooks/useLocalizedField';
import { useFormKit } from '../../context/FormKitContext';
import { Button } from '../ui/button';
import { cn, formatNumberByLocale } from '../../lib/utils';
import { FormKitRoot } from '../FormKitRoot';
import { FormFieldRenderer } from '../form-fields/FormFieldRenderer';
import {
  extractSchemaFields,
  expandNestedOptionSubmission,
  extractSubmissionValues,
  mapDefaultValuesToFieldIds,
} from '../../lib/submissionUtils';
import { uploadPendingMediaInValues } from '../../lib/mediaUploadUtils';
import {
  applyFieldVisibility,
  groupStepSections,
  isMultiStepWizard,
  markFieldsTouched,
  scrollToFirstFieldError,
  collectVisibleFields,
  getStepVisibleFieldIds,
  mergeStepValidationErrors,
  validateStepSection,
  validateWizardSteps,
  validateVisibleFields,
  type StepGroup,
} from '../../lib/formStepStructure';
import {
  MultiStepFormNav,
  MultiStepProgress,
  type MultiStepFormLabels,
} from './MultiStepFormNav';

type Values = Record<string, any>;

export interface FormRendererStepLabels extends MultiStepFormLabels {}

export interface FormRendererProps {
  form: unknown;
  submission?: unknown;
  defaultValues?: Record<string, any>;
  mode?: 'create' | 'edit';

  className?: string;
  fieldsClassName?: string;

  submitLabel?: string;
  disabled?: boolean;

  /** When true (default), schemas with 2+ `step_section` fields use wizard navigation. */
  enableMultiStep?: boolean;
  /**
   * When true, hides all fields marked `hideable` in the form schema.
   */
  hide?: boolean;
  /**
   * When true (default), media files upload on submit instead of on select.
   * Overrides `FormKitProvider` `deferMediaUpload` when set.
   */
  deferMediaUpload?: boolean;
  stepLabels?: FormRendererStepLabels;
  /** Show reset control. Defaults to true in create mode, false in edit mode. */
  showReset?: boolean;
  /** Label while `onSubmit` is in flight. Defaults to "Saving…". */
  savingLabel?: string;
  /**
   * Optional hook to transform values after a field change (e.g. copy-rules between fields).
   */
  transformOnChange?: (
    fieldId: string,
    value: unknown,
    values: Values,
  ) => Values;

  onSubmit: (cleanedValues: Record<string, any>) => Promise<unknown> | unknown;
  onSubmitSuccess?: (result: unknown) => void;
  onSubmitError?: (error: Error) => void;
}

export function FormRenderer({
  form,
  submission,
  defaultValues,
  mode: modeProp,
  className,
  fieldsClassName,
  submitLabel: submitLabelProp,
  disabled,
  enableMultiStep = true,
  hide,
  deferMediaUpload: deferMediaUploadProp,
  stepLabels,
  showReset: showResetProp,
  savingLabel = 'Saving…',
  transformOnChange,
  onSubmit,
  onSubmitSuccess,
  onSubmitError,
}: FormRendererProps): React.ReactElement {
  const { locale, uploadMedia, deferMediaUpload: deferMediaUploadContext = true } =
    useFormKit();
  const deferMediaUpload = deferMediaUploadProp ?? deferMediaUploadContext;

  const effectiveMode = modeProp ?? (submission != null ? 'edit' : 'create');
  const submitLabel =
    submitLabelProp ?? (effectiveMode === 'edit' ? 'Save' : 'Submit');
  const showReset = showResetProp ?? effectiveMode === 'create';

  const rawFields = useMemo(() => extractSchemaFields(form), [form]);
  const localizedFields = useLocalizedFields(rawFields);
  const fields = useMemo(
    () => applyFieldVisibility(localizedFields, hide),
    [localizedFields, hide],
  );

  const derivedInitialValues = useMemo((): Values => {
    if (submission != null) {
      const extracted = extractSubmissionValues(submission) as Values;
      return expandNestedOptionSubmission(fields, extracted);
    }
    const base = createEnhancedSubmission(fields).submissionData as Values;
    const mappedDefaults = mapDefaultValuesToFieldIds(fields, defaultValues);
    return { ...base, ...mappedDefaults };
  }, [submission, fields, defaultValues]);

  const [values, setValues] = useState<Values>(derivedInitialValues);
  const valuesRef = useRef<Values>(derivedInitialValues);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeStepGroup, setActiveStepGroup] = useState<StepGroup | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const formStructure = useMemo(() => groupStepSections(fields), [fields]);
  const useWizard = enableMultiStep && isMultiStepWizard(formStructure, activeStepGroup);

  const isLastStep = useMemo(() => {
    if (!activeStepGroup) return true;
    return currentStepIndex === activeStepGroup.steps.length - 1;
  }, [activeStepGroup, currentStepIndex]);

  useEffect(() => {
    setValues(derivedInitialValues);
    valuesRef.current = derivedInitialValues;
    setTouched({});
    setValidationErrors({});
    setSubmitError(null);
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
  }, [derivedInitialValues]);

  useEffect(() => {
    if (formStructure.hasSteps && formStructure.stepGroups.length > 0) {
      setActiveStepGroup(formStructure.stepGroups[0]);
      setCurrentStepIndex(0);
      setCompletedSteps(new Set());
    } else {
      setActiveStepGroup(null);
    }
  }, [formStructure]);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const visibleFields = useMemo(
    () => collectVisibleFields(fields, values),
    [fields, values],
  );

  const {
    dynamicOptions,
    loadingFields,
    errorFields,
    retryDynamicField,
  } = useDynamicFormOptions(visibleFields, values);

  const validateCurrentStep = useCallback(
    (stepField: FormField) => {
      const result = validateStepSection(stepField, valuesRef.current, locale);
      const stepFieldIds = getStepVisibleFieldIds(stepField, valuesRef.current);
      setValidationErrors((prev) =>
        mergeStepValidationErrors(prev, stepFieldIds, result.errors),
      );
      return result;
    },
    [locale],
  );

  const handleNextStep = useCallback(() => {
    if (!activeStepGroup) return;
    const currentStep = activeStepGroup.steps[currentStepIndex];
    if (!currentStep) return;

    const stepValidation = validateCurrentStep(currentStep);
    if (!stepValidation.isValid) {
      if (currentStep.fields?.length) {
        setTouched((prev) => ({
          ...prev,
          ...markFieldsTouched(currentStep.fields!),
        }));
      }
      scrollToFirstFieldError(stepValidation.errors);
      return;
    }

    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(currentStepIndex);
      return next;
    });

    if (currentStepIndex < activeStepGroup.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [activeStepGroup, currentStepIndex, validateCurrentStep]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentStepIndex]);

  const handleGoToStep = useCallback(
    (stepIndex: number) => {
      if (
        stepIndex <= currentStepIndex ||
        completedSteps.has(stepIndex - 1)
      ) {
        setCurrentStepIndex(stepIndex);
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    },
    [currentStepIndex, completedSteps],
  );

  const resetForm = useCallback(() => {
    setValues(derivedInitialValues);
    valuesRef.current = derivedInitialValues;
    setTouched({});
    setValidationErrors({});
    setSubmitError(null);
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [derivedInitialValues]);

  const renderField = useCallback(
    (field: FormField, parentDisabled = false): React.ReactNode => {
      if (field.isHidden) return null;
      if (!shouldShowField(field, values)) return null;

      const dependsOn = field.dataSource
        ? getDynamicParentFieldId(field.dataSource)
        : undefined;
      const parentValue = dependsOn ? values[dependsOn] : undefined;
      const isDependent = Boolean(dependsOn);
      const parentHasValue = isDependent
        ? parentValue !== '' && parentValue !== null && parentValue !== undefined
        : true;
      const parentFieldName = dependsOn
        ? fields.find((f) => f.id === dependsOn)?.label ?? dependsOn
        : undefined;

      return (
        <div id={`field-${field.id}`}>
          <FormFieldRenderer
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(nextValue) => {
              setValues((prev) => {
                const base = { ...prev, [field.id]: nextValue };
                return transformOnChange
                  ? transformOnChange(field.id, nextValue, base)
                  : base;
              });
              setTouched((prev) => ({ ...prev, [field.id]: true }));
              setValidationErrors((prev) => {
                if (!prev[field.id]) return prev;
                const next = { ...prev };
                delete next[field.id];
                return next;
              });
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
            showError={Boolean(touched[field.id]) && Boolean(validationErrors[field.id])}
            errorMessage={validationErrors[field.id]}
            disabled={disabled || saving || parentDisabled}
            dynamicOptions={dynamicOptions[field.id] ?? []}
            isLoading={Boolean(loadingFields[field.id])}
            loadError={errorFields[field.id] || undefined}
            onRetry={() => retryDynamicField(field)}
            isDependent={isDependent}
            parentHasValue={parentHasValue}
            parentFieldName={parentFieldName}
            renderField={(f) => renderField(f, parentDisabled || field.isDisabled)}
            formValues={values}
          />
        </div>
      );
    },
    [
      disabled,
      saving,
      values,
      touched,
      validationErrors,
      dynamicOptions,
      loadingFields,
      errorFields,
      retryDynamicField,
      fields,
      transformOnChange,
    ],
  );

  const persistSubmission = useCallback(async () => {
    const rawValues = valuesRef.current;

    let validation: { isValid: boolean; errors: Record<string, string> };

    if (useWizard && activeStepGroup) {
      const wizardResult = validateWizardSteps({
        steps: activeStepGroup.steps,
        nonStepFields: formStructure.nonStepFields.map(({ field }) => field),
        values: rawValues,
        locale,
      });
      validation = {
        isValid: wizardResult.isValid,
        errors: wizardResult.errors,
      };

      if (!wizardResult.isValid) {
        setValidationErrors(wizardResult.errors);

        const failingStep = activeStepGroup.steps[wizardResult.firstInvalidStepIndex];
        if (failingStep?.fields?.length) {
          setTouched((prev) => ({
            ...prev,
            ...markFieldsTouched(failingStep.fields!),
          }));
        }

        if (
          wizardResult.firstInvalidStepIndex !== -1 &&
          wizardResult.firstInvalidStepIndex !== currentStepIndex
        ) {
          setCurrentStepIndex(wizardResult.firstInvalidStepIndex);
        }

        scrollToFirstFieldError(wizardResult.errors);
        throw new Error('Validation failed');
      }
    } else {
      validation = validateVisibleFields(fields, rawValues, locale);
      setValidationErrors(validation.errors || {});

      if (!validation.isValid) {
        const nextTouched: Record<string, boolean> = {};
        collectVisibleFields(fields, rawValues).forEach((f) => {
          nextTouched[f.id] = true;
        });
        setTouched(nextTouched);
        scrollToFirstFieldError(validation.errors);
        throw new Error('Validation failed');
      }
    }

    let valuesToSubmit = rawValues;
    if (deferMediaUpload) {
      valuesToSubmit = await uploadPendingMediaInValues(
        valuesToSubmit,
        fields,
        uploadMedia,
      );
      valuesRef.current = valuesToSubmit;
      setValues(valuesToSubmit);
    }

    const cleaned = cleanSubmissionData(valuesToSubmit, fields);
    return onSubmit(cleaned);
  }, [
    fields,
    locale,
    onSubmit,
    useWizard,
    activeStepGroup,
    formStructure.nonStepFields,
    currentStepIndex,
    deferMediaUpload,
    uploadMedia,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (saving) return;
      setSaving(true);
      setSubmitError(null);

      try {
        if (useWizard && activeStepGroup && !isLastStep) {
          handleNextStep();
          return;
        }

        const result = await persistSubmission();
        onSubmitSuccess?.(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Submit failed');
        if (error.message !== 'Validation failed') {
          setSubmitError(error.message);
        }
        onSubmitError?.(error);
      } finally {
        setSaving(false);
      }
    },
    [
      saving,
      useWizard,
      activeStepGroup,
      isLastStep,
      handleNextStep,
      persistSubmission,
      onSubmitSuccess,
      onSubmitError,
    ],
  );

  const renderSinglePageFields = () => (
    <div className={cn('grid min-w-0 gap-4', fieldsClassName)}>
      {fields.map((field) => (
        <div key={field.id} className='min-w-0'>
          {renderField(field)}
        </div>
      ))}
    </div>
  );

  const renderWizardBody = () => {
    if (!activeStepGroup) return null;
    const currentStep = activeStepGroup.steps[currentStepIndex];

    return (
      <>
        <MultiStepProgress
          steps={activeStepGroup.steps}
          currentStepIndex={currentStepIndex}
          completedSteps={completedSteps}
          locale={locale}
          onGoToStep={handleGoToStep}
        />

        {currentStep && (
          <div className='animate-in fade-in slide-in-from-right-4 duration-300'>
            <div className='border-b pb-4 mb-4'>
              <h3 className='font-semibold text-xl flex items-center gap-3'>
                <span className='bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold'>
                  {formatNumberByLocale(currentStepIndex + 1, locale)}
                </span>
                {currentStep.label}
              </h3>
              {currentStep.stepDescription && (
                <p className='text-sm text-muted-foreground mt-2 ml-11'>
                  {currentStep.stepDescription}
                </p>
              )}
            </div>

            {currentStep.fields && currentStep.fields.length > 0 && (
              <div className={cn('min-w-0 space-y-4', fieldsClassName)}>
                {currentStep.fields.map((nestedField) => (
                  <div key={nestedField.id} className='min-w-0'>
                    {renderField(nestedField)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {formStructure.nonStepFields.length > 0 && isLastStep && (
          <div className={cn('min-w-0 space-y-4 mt-4 pt-4 border-t', fieldsClassName)}>
            {formStructure.nonStepFields.map(({ field }) => (
              <div key={field.id} className='min-w-0'>
                {renderField(field)}
              </div>
            ))}
          </div>
        )}

        <MultiStepFormNav
          activeStepGroup={activeStepGroup}
          currentStepIndex={currentStepIndex}
          isLastStep={isLastStep}
          saving={saving}
          disabled={disabled}
          submitLabel={submitLabel}
          savingLabel={savingLabel}
          labels={stepLabels ?? {}}
          showReset={showReset}
          onPrevious={handlePreviousStep}
          onNext={handleNextStep}
          onReset={resetForm}
        />
      </>
    );
  };

  return (
    <FormKitRoot>
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {fields.length === 0 ? (
        <p className='text-center py-8 text-muted-foreground'>No fields to display.</p>
      ) : useWizard ? (
        renderWizardBody()
      ) : (
        <>
          {renderSinglePageFields()}
          <div className='flex flex-col sm:flex-row items-center gap-3 pt-4 border-t'>
            {showReset && (
              <Button
                type='button'
                variant='outline'
                onClick={resetForm}
                disabled={disabled || saving}>
                {stepLabels?.reset ?? 'Reset'}
              </Button>
            )}
            <Button type='submit' disabled={disabled || saving} className='sm:ml-auto'>
              {saving ? savingLabel : submitLabel}
            </Button>
            {submitError && (
              <span className='text-sm text-destructive'>{submitError}</span>
            )}
          </div>
        </>
      )}
      {useWizard && submitError && (
        <p className='text-sm text-destructive'>{submitError}</p>
      )}
    </form>
    </FormKitRoot>
  );
}
