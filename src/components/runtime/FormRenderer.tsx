'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormField } from '../../types/form';
import { createEnhancedSubmission, shouldShowField } from '../../lib/formUtils';
import { cleanSubmissionData } from '../../lib/formUtils';
import { validateFormWithZod } from '../../lib/validationUtils';
import { getNestedValue } from '../../hooks/useDynamicOptions';
import { useLocalizedFields } from '../../hooks/useLocalizedField';
import { useFormKit } from '../../context/FormKitContext';
import { Button } from '../ui/button';
import { cn, formatNumberByLocale } from '../../lib/utils';
import { FormFieldRenderer } from '../form-fields/FormFieldRenderer';
import {
  extractSchemaFields,
  extractSubmissionValues,
  mapDefaultValuesToFieldIds,
} from '../../lib/submissionUtils';
import {
  groupStepSections,
  isMultiStepWizard,
  markFieldsTouched,
  scrollToFirstFieldError,
  findStepIndexForFieldId,
  type StepGroup,
} from '../../lib/formStepStructure';
import {
  MultiStepFormNav,
  MultiStepProgress,
  type MultiStepFormLabels,
} from './MultiStepFormNav';

type Values = Record<string, any>;

function isDynamicField(field: FormField): boolean {
  return Boolean(field.isDynamic && field.dataSource);
}

function collectVisibleFields(fields: FormField[], values: Values): FormField[] {
  const out: FormField[] = [];

  const walk = (list: FormField[]) => {
    for (const field of list) {
      if (field.isHidden) continue;
      if (!shouldShowField(field, values)) continue;

      out.push(field);

      if (Array.isArray(field.fields) && field.fields.length > 0) {
        walk(field.fields);
      }

      if (field.optionConfigs && field.optionConfigs.length > 0) {
        const val = values[field.id];
        for (const opt of field.optionConfigs) {
          const isSelected = Array.isArray(val)
            ? val.includes(opt.value)
            : val === opt.value;
          if (isSelected && opt.nestedForm?.fields?.length) {
            walk(opt.nestedForm.fields);
          }
        }
      }
    }
  };

  walk(fields);
  return out;
}

async function fetchDynamicOptionsForField(
  field: FormField,
  parentValue: any,
): Promise<Array<{ value: string; label: string }>> {
  const ds = field.dataSource;
  if (!ds) return [];

  if (ds.dependsOn && !parentValue) return [];

  let url = ds.url;
  if (ds.parentValuePath && parentValue) {
    const placeholder = ds.parentValuePath.startsWith('{')
      ? ds.parentValuePath
      : `{${ds.parentValuePath}}`;
    url = url.replace(placeholder, encodeURIComponent(String(parentValue)));
  }

  const requestOptions: RequestInit = {
    method: ds.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(ds.headers ?? {}),
    },
  };

  if (ds.dependsOn && ds.parentValueParam && parentValue) {
    const urlObj = new URL(url);
    urlObj.searchParams.append(ds.parentValueParam, String(parentValue));
    url = urlObj.toString();
  }

  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const extractedData = getNestedValue(data, ds.path);
  if (!Array.isArray(extractedData)) {
    throw new Error('Extracted data is not an array');
  }

  return extractedData.map((item: any) => ({
    value: String(getNestedValue(item, ds.valueField) ?? ''),
    label: String(getNestedValue(item, ds.labelField) ?? ''),
  }));
}

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
  stepLabels,
  showReset: showResetProp,
  savingLabel = 'Saving…',
  transformOnChange,
  onSubmit,
  onSubmitSuccess,
  onSubmitError,
}: FormRendererProps): React.ReactElement {
  const { locale } = useFormKit();

  const effectiveMode = modeProp ?? (submission != null ? 'edit' : 'create');
  const submitLabel =
    submitLabelProp ?? (effectiveMode === 'edit' ? 'Save' : 'Submit');
  const showReset = showResetProp ?? effectiveMode === 'create';

  const rawFields = useMemo(() => extractSchemaFields(form), [form]);
  const fields = useLocalizedFields(rawFields);

  const derivedInitialValues = useMemo((): Values => {
    if (submission != null) {
      return extractSubmissionValues(submission) as Values;
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

  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, Array<{ value: string; label: string }>>
  >({});
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({});
  const [errorFields, setErrorFields] = useState<Record<string, string>>({});

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

  const lastParentValuesRef = useRef<Record<string, any>>({});
  useEffect(() => {
    const dynamicVisible = visibleFields.filter(isDynamicField);
    if (dynamicVisible.length === 0) return;

    let cancelled = false;
    const run = async () => {
      await Promise.all(
        dynamicVisible.map(async (field) => {
          const ds = field.dataSource;
          if (!ds) return;

          const parentId = ds.dependsOn;
          const parentValue = parentId ? valuesRef.current[parentId] : undefined;
          const parentKey = parentId
            ? `${field.id}:${String(parentValue ?? '')}`
            : `${field.id}:__no_parent__`;

          if (parentId && !parentValue) {
            setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
            return;
          }

          if (lastParentValuesRef.current[field.id] === parentKey) return;
          lastParentValuesRef.current[field.id] = parentKey;

          setLoadingFields((prev) => ({ ...prev, [field.id]: true }));
          setErrorFields((prev) => ({ ...prev, [field.id]: '' }));

          try {
            const opts = await fetchDynamicOptionsForField(field, parentValue);
            if (!cancelled) {
              setDynamicOptions((prev) => ({ ...prev, [field.id]: opts }));
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load options';
            if (!cancelled) {
              setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
              setErrorFields((prev) => ({ ...prev, [field.id]: msg }));
            }
          } finally {
            if (!cancelled) {
              setLoadingFields((prev) => ({ ...prev, [field.id]: false }));
            }
          }
        }),
      );
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [visibleFields]);

  const retryDynamicField = useCallback(async (field: FormField) => {
    const ds = field.dataSource;
    if (!ds) return;
    const parentValue = ds.dependsOn ? valuesRef.current[ds.dependsOn] : undefined;
    setLoadingFields((prev) => ({ ...prev, [field.id]: true }));
    setErrorFields((prev) => ({ ...prev, [field.id]: '' }));
    try {
      const opts = await fetchDynamicOptionsForField(field, parentValue);
      setDynamicOptions((prev) => ({ ...prev, [field.id]: opts }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load options';
      setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
      setErrorFields((prev) => ({ ...prev, [field.id]: msg }));
    } finally {
      setLoadingFields((prev) => ({ ...prev, [field.id]: false }));
    }
  }, []);

  const validateCurrentStep = useCallback(
    (stepField: FormField) => {
      const stepFields = stepField.fields ?? [];
      if (stepFields.length === 0) {
        return { isValid: true, errors: {} as Record<string, string> };
      }

      const result = validateFormWithZod(
        stepFields,
        valuesRef.current,
        locale,
      );
      setValidationErrors((prev) => ({ ...prev, ...result.errors }));
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
    lastParentValuesRef.current = {};
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [derivedInitialValues]);

  const renderField = useCallback(
    (field: FormField, parentDisabled = false): React.ReactNode => {
      if (field.isHidden) return null;
      if (!shouldShowField(field, values)) return null;

      const ds = field.dataSource;
      const dependsOn = ds?.dependsOn;
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
    const cleaned = cleanSubmissionData(valuesRef.current, fields);
    const validation = validateFormWithZod(fields, cleaned, locale);
    setValidationErrors(validation.errors || {});

    if (!validation.isValid) {
      const nextTouched: Record<string, boolean> = {};
      collectVisibleFields(fields, valuesRef.current).forEach((f) => {
        nextTouched[f.id] = true;
      });
      setTouched(nextTouched);

      if (useWizard && activeStepGroup) {
        const firstErrorFieldId = Object.keys(validation.errors)[0];
        if (firstErrorFieldId) {
          const stepIndex = findStepIndexForFieldId(
            activeStepGroup.steps,
            firstErrorFieldId,
          );
          if (stepIndex !== -1 && stepIndex !== currentStepIndex) {
            setCurrentStepIndex(stepIndex);
          }
        }
      }

      scrollToFirstFieldError(validation.errors);
      throw new Error('Validation failed');
    }

    return onSubmit(cleaned);
  }, [
    fields,
    locale,
    onSubmit,
    useWizard,
    activeStepGroup,
    currentStepIndex,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (saving) return;
      setSaving(true);
      setSubmitError(null);

      try {
        if (useWizard && activeStepGroup) {
          const currentStep = activeStepGroup.steps[currentStepIndex];
          if (currentStep) {
            const stepValidation = validateCurrentStep(currentStep);
            if (!stepValidation.isValid) {
              if (currentStep.fields?.length) {
                setTouched((prev) => ({
                  ...prev,
                  ...markFieldsTouched(currentStep.fields!),
                }));
              }
              scrollToFirstFieldError(stepValidation.errors);
              throw new Error('Validation failed');
            }
          }

          if (!isLastStep) {
            handleNextStep();
            return;
          }
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
      currentStepIndex,
      validateCurrentStep,
      isLastStep,
      handleNextStep,
      persistSubmission,
      onSubmitSuccess,
      onSubmitError,
    ],
  );

  const renderSinglePageFields = () => (
    <div className={cn('grid gap-4', fieldsClassName)}>
      {fields.map((field) => (
        <div key={field.id}>{renderField(field)}</div>
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
              <div className={cn('space-y-4', fieldsClassName)}>
                {currentStep.fields.map((nestedField) => (
                  <div key={nestedField.id}>{renderField(nestedField)}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {formStructure.nonStepFields.length > 0 && isLastStep && (
          <div className={cn('space-y-4 mt-4 pt-4 border-t', fieldsClassName)}>
            {formStructure.nonStepFields.map(({ field }) => (
              <div key={field.id}>{renderField(field)}</div>
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
  );
}
