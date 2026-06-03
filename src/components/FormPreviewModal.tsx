'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { FormField } from '../types/form';
import { EnhancedFormSubmission } from '../types/submission';
import { useFormBuilderStore } from './formbuilder/store/useFormBuilderStore';
import { cn, formatNumberByLocale } from '../lib/utils';
import { useLocalizedFields } from '../hooks/useLocalizedField';
import {
  fetchDynamicOptionsForField,
  getDynamicParentFieldId,
} from '../lib/dynamicFieldUtils';
import { getLanguagesWithNames } from '../lib/formLanguages';
import { useFormKit } from '../context/FormKitContext';
import { toast } from 'sonner';

// Import modular field components
import { FormFieldRenderer, DynamicOption } from './form-fields';
import { createFieldMap, shouldShowField } from '../lib/formUtils';
import { groupStepSections, type StepGroup, validateStepSection, validateWizardSteps, validateVisibleFields, mergeStepValidationErrors, getStepVisibleFieldIds, applyFieldVisibility } from '../lib/formStepStructure';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, ArrowRight, Check, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';

interface FormPreviewModalProps {
  fields: FormField[];
  /** When true, hides all fields marked `hideable` in the form schema. */
  hide?: boolean;
}

export function FormPreviewModal({ fields, hide }: FormPreviewModalProps) {
  const { t, locale: currentLocale } = useFormKit();

  // Localize all fields based on site locale
  const localizedFields = useLocalizedFields(fields);
  const effectiveFields = useMemo(
    () => applyFieldVisibility(localizedFields, hide),
    [localizedFields, hide],
  );

  // Modal state - local state for preview visibility
  const [isOpen, setIsOpen] = useState(false);

  // Get store methods
  const { setEnhancedSubmission } = useFormBuilderStore();

  // Step navigation state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeStepGroup, setActiveStepGroup] = useState<StepGroup | null>(
    null,
  );
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Form data state
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Dynamic options state
  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, DynamicOption[]>
  >({});
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>(
    {},
  );
  const [errorFields, setErrorFields] = useState<Record<string, string>>({});

  /**
   * Performance optimization: Use ref to access formData in callbacks
   * This prevents callback functions from being recreated on every state change,
   * which would cause all form fields to re-render unnecessarily.
   */
  const formDataRef = useRef<Record<string, any>>({});

  // Track parent values for dependent fields (only these trigger option re-fetching)
  const [parentValues, setParentValues] = useState<Record<string, any>>({});

  // Keep ref in sync with state (does not cause re-render of callbacks)
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Flatten fields helper
  const flattenFields = useCallback((fieldList: FormField[]): FormField[] => {
    const result: FormField[] = [];
    for (const field of fieldList) {
      result.push(field);
      if (field.fields) {
        result.push(...flattenFields(field.fields));
      }
    }
    return result;
  }, []);

  // Create field map for formula evaluation
  const fieldMap = useMemo(
    () => createFieldMap(effectiveFields),
    [effectiveFields],
  );

  // Fetch dynamic options for a field
  const fetchDynamicOptions = useCallback(
    async (field: FormField) => {
      if (!field.dataSource?.url) return;

      setLoadingFields((prev) => ({ ...prev, [field.id]: true }));
      setErrorFields((prev) => ({ ...prev, [field.id]: '' }));

      try {
        const parentId = getDynamicParentFieldId(field.dataSource);
        const parentValue = parentId
          ? formDataRef.current[parentId]
          : undefined;

        if (parentId && !parentValue) {
          setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
          return;
        }

        const options = await fetchDynamicOptionsForField(field, parentValue);
        setDynamicOptions((prev) => ({ ...prev, [field.id]: options }));
      } catch (err) {
        setErrorFields((prev) => ({
          ...prev,
          [field.id]:
            err instanceof Error ? err.message : 'Failed to load options',
        }));
      } finally {
        setLoadingFields((prev) => ({ ...prev, [field.id]: false }));
      }
    },
    [],
  );

  // Initialize form data when modal opens or fields change
  useEffect(() => {
    if (!isOpen || effectiveFields.length === 0) return;

    const initialData: Record<string, any> = {};

    const initializeFields = (fieldList: FormField[]) => {
      fieldList.forEach((field) => {
        // Skip container fields
        if (
          [
            'step_section',
            'ui_section',
            'array',
            'table',
            'rich_text',
          ].includes(field.type)
        ) {
          if (field.fields) {
            initializeFields(field.fields);
          }
          return;
        }

        // Initialize with default_value if available
        if (field.default_value !== undefined && field.default_value !== null) {
          initialData[field.id] = field.default_value;
        } else {
          // Set appropriate default based on field type
          switch (field.type) {
            case 'checkbox':
            case 'multi_select':
            case 'media':
              initialData[field.id] = [];
              break;
            case 'matrix':
              initialData[field.id] = {};
              break;
            case 'range':
            case 'rating':
            case 'number':
            case 'date':
              initialData[field.id] = null;
              break;
            default:
              initialData[field.id] = '';
          }
        }

        // Initialize nested fields
        if (field.fields) {
          initializeFields(field.fields);
        }
      });
    };

    initializeFields(effectiveFields);
    setFormData(initialData);
    setValidationErrors({});
    setTouchedFields({});
    setSubmitAttempted(false);
  }, [isOpen, effectiveFields]);

  // Fetch dynamic options on mount
  useEffect(() => {
    if (!isOpen || effectiveFields.length === 0) return;

    const allFields = flattenFields(effectiveFields);
    const dynamicFields = allFields.filter(
      (f) =>
        ['select', 'multi_select', 'radio', 'checkbox'].includes(f.type) &&
        f.isDynamic &&
        f.dataSource?.url &&
        !getDynamicParentFieldId(f.dataSource),
    );

    dynamicFields.forEach((field) => fetchDynamicOptions(field));
  }, [isOpen, effectiveFields, flattenFields, fetchDynamicOptions]);

  // Get dependent fields and their parent field IDs
  const dependentFieldsInfo = useMemo(() => {
    if (effectiveFields.length === 0)
      return { dependentFields: [] as FormField[], parentIds: [] as string[] };

    const allFields = flattenFields(effectiveFields);
    const dependentFields = allFields.filter(
      (f) =>
        ['select', 'multi_select', 'radio', 'checkbox'].includes(f.type) &&
        f.isDynamic &&
        f.dataSource?.dependsOn,
    );

    const parentIds = Array.from(
      new Set(dependentFields.map((f) => f.dataSource!.dependsOn!)),
    );
    return { dependentFields, parentIds };
  }, [effectiveFields, flattenFields]);

  // Form structure with grouped steps
  const formStructure = useMemo(() => {
    return groupStepSections(effectiveFields);
  }, [effectiveFields]);

  // Set active step group when modal opens or fields change
  useEffect(() => {
    if (
      isOpen &&
      formStructure.hasSteps &&
      formStructure.stepGroups.length > 0
    ) {
      setActiveStepGroup(formStructure.stepGroups[0]);
      setCurrentStepIndex(0);
      setCompletedSteps(new Set());
    }
  }, [isOpen, formStructure]);

  // Validate a specific step's fields
  const validateStepFields = useCallback((stepField: FormField): boolean => {
    const result = validateStepSection(stepField, formDataRef.current);
    const stepFieldIds = getStepVisibleFieldIds(stepField, formDataRef.current);
    setValidationErrors((prev) =>
      mergeStepValidationErrors(prev, stepFieldIds, result.errors),
    );
    return result.isValid;
  }, []);

  // Navigate to next step
  const handleNextStep = useCallback(() => {
    if (!activeStepGroup) return;

    const currentStep = activeStepGroup.steps[currentStepIndex];
    if (!currentStep) return;

    // Validate current step
    if (!validateStepFields(currentStep)) {
      // Mark all fields in current step as touched
      if (currentStep.fields) {
        const touched: Record<string, boolean> = {};
        const markTouched = (fields: FormField[]) => {
          fields.forEach((field) => {
            touched[field.id] = true;
            if (field.fields) markTouched(field.fields);
          });
        };
        markTouched(currentStep.fields);
        setTouchedFields((prev) => ({ ...prev, ...touched }));
      }
      return;
    }

    // Mark current step as completed
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(currentStepIndex);
      return next;
    });

    // Move to next step
    if (currentStepIndex < activeStepGroup.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [activeStepGroup, currentStepIndex, validateStepFields]);

  // Navigate to previous step
  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  // Navigate to specific step (only if previous steps are completed)
  const handleGoToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex <= currentStepIndex || completedSteps.has(stepIndex - 1)) {
        setCurrentStepIndex(stepIndex);
      }
    },
    [currentStepIndex, completedSteps],
  );

  // Check if on last step
  const isLastStep = useMemo(() => {
    if (!activeStepGroup) return true;
    return currentStepIndex === activeStepGroup.steps.length - 1;
  }, [activeStepGroup, currentStepIndex]);

  // Track parent values and only trigger when they actually change
  useEffect(() => {
    const { parentIds } = dependentFieldsInfo;
    if (parentIds.length === 0) return;

    const newParentValues: Record<string, any> = {};
    parentIds.forEach((id) => {
      newParentValues[id] = formData[id];
    });

    // Only update if parent values actually changed
    const hasChanges = parentIds.some(
      (id) => parentValues[id] !== newParentValues[id],
    );

    if (hasChanges) {
      setParentValues(newParentValues);
    }
  }, [formData, dependentFieldsInfo, parentValues]);

  // Re-fetch dependent fields when parent values change
  useEffect(() => {
    const { dependentFields } = dependentFieldsInfo;
    if (dependentFields.length === 0) return;

    dependentFields.forEach((field) => {
      const parentValue = parentValues[field.dataSource!.dependsOn!];
      if (parentValue) {
        fetchDynamicOptions(field);
      } else {
        setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
        // Clear dependent field value if parent is cleared
        const currentValue = formDataRef.current[field.id];
        if (currentValue) {
          setFormData((prev) => {
            const newData = { ...prev };
            delete newData[field.id];
            return newData;
          });
        }
      }
    });
  }, [parentValues, dependentFieldsInfo, fetchDynamicOptions]);

  // Field change handler - stable reference
  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear validation error
    setValidationErrors((prev) => {
      if (prev[fieldId]) {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      }
      return prev;
    });
  }, []);

  // Field blur handler - uses ref to avoid dependency on formData
  const handleFieldBlur = useCallback((field: FormField) => {
    setTouchedFields((prev) => ({ ...prev, [field.id]: true }));
    // Simple validation on blur using ref
    if (field.required) {
      const value = formDataRef.current[field.id];
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        setValidationErrors((prev) => ({
          ...prev,
          [field.id]: `${field.label} is required`,
        }));
      }
    }
  }, []);

  // Format submission data for edit mode
  const formatSubmissionDataForEdit = (
    submission: EnhancedFormSubmission,
  ): Record<string, any> => {
    const formatted: Record<string, any> = {};
    Object.entries(submission.submissionData).forEach(([fieldId, value]) => {
      formatted[fieldId] = value;
    });
    return formatted;
  };

  // Render a single field - uses FormFieldRenderer for all field types
  const renderField = useCallback(
    (
      field: FormField,
      parentDisabled: boolean = false,
    ): React.ReactElement | null => {
      // Evaluate visibility using shared utility
      if (field.isHidden || !shouldShowField(field, formData)) {
        return null;
      }

      const value = formData[field.id] ?? field.default_value ?? '';
      const showError =
        (touchedFields[field.id] || submitAttempted) &&
        !!validationErrors[field.id];
      const errorMessage = validationErrors[field.id];

      // Get options for dynamic fields
      const getFieldOptions = (): DynamicOption[] => {
        if (field.isDynamic) {
          return dynamicOptions[field.id] || [];
        }
        return (
          field.optionConfigs?.map((c) => ({
            label: c.label,
            value: c.value,
          })) ||
          field.options?.map((o) => ({ label: o, value: o })) ||
          []
        );
      };

      // Check if field is dependent and parent has value
      const isDependent = field.isDynamic && !!field.dataSource?.dependsOn;
      const parentHasValue = isDependent
        ? !!formData[field.dataSource!.dependsOn!]
        : true;
      const parentField = isDependent
        ? effectiveFields.find((f) => f.id === field.dataSource!.dependsOn!)
        : null;

      // For container fields (sections), render children
      if (field.type === 'step_section' || field.type === 'ui_section') {
        const isGrid =
          field.type === 'ui_section' && field.layoutType === 'grid';

        // Combine parent disabled state with this section's potentially disabled state
        const sectionDisabled = parentDisabled || field.isDisabled;

        return (
          <Card
            id={`field-${field.id}`}
            className={cn(
              'border rounded-lg p-4 bg-gradient-to-b from-muted/30 to-transparent overflow-visible',
              'transition-all duration-200 hover:shadow-sm',
            )}>
            <div className='border-b pb-4 mb-4'>
              <h3 className='font-semibold text-lg flex items-center gap-2'>
                {field.stepNumber && (
                  <span className='bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold'>
                    {formatNumberByLocale(field.stepNumber, currentLocale)}
                  </span>
                )}
                {field.label}
              </h3>
              {field.stepDescription && (
                <p className='text-sm text-muted-foreground mt-1'>
                  {field.stepDescription}
                </p>
              )}
            </div>

            {field.fields && field.fields.length > 0 && (
              <div
                className={cn('', !isGrid && 'space-y-4')}
                style={
                  isGrid
                    ? {
                        display: 'grid',
                        gridTemplateColumns: `repeat(${field.gridColumns || 2}, minmax(0, 1fr))`,
                        gap: `${field.gap || 16}px`,
                      }
                    : undefined
                }>
                {field.fields.map((nestedField) => (
                  <div key={nestedField.id}>
                    {renderField(nestedField, sectionDisabled)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      }

      // Use FormFieldRenderer for all other field types
      return (
        <div id={`field-${field.id}`}>
          <FormFieldRenderer
            field={field}
            value={value}
            onChange={(val) => handleFieldChange(field.id, val)}
            onBlur={() => handleFieldBlur(field)}
            showError={showError}
            errorMessage={errorMessage}
            disabled={parentDisabled || field.isDisabled}
            dynamicOptions={getFieldOptions()}
            isLoading={loadingFields[field.id]}
            loadError={errorFields[field.id]}
            onRetry={() => fetchDynamicOptions(field)}
            isDependent={isDependent}
            parentHasValue={parentHasValue}
            parentFieldName={parentField?.label}
            formValues={formData}
            renderField={(f) =>
              renderField(f, parentDisabled || field.isDisabled)
            }
          />
        </div>
      );
    },
    [
      formData,
      touchedFields,
      submitAttempted,
      validationErrors,
      dynamicOptions,
      loadingFields,
      errorFields,
      effectiveFields,
      handleFieldChange,
      handleFieldBlur,
      fetchDynamicOptions,
    ],
  );

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    // For multi-step forms, validate current step first
    if (
      formStructure.hasSteps &&
      activeStepGroup &&
      activeStepGroup.steps.length > 1
    ) {
      const currentStep = activeStepGroup.steps[currentStepIndex];
      if (currentStep && !validateStepFields(currentStep)) {
        // Mark all fields in current step as touched
        if (currentStep.fields) {
          const touched: Record<string, boolean> = {};
          const markTouched = (fields: FormField[]) => {
            fields.forEach((field) => {
              touched[field.id] = true;
              if (field.fields) markTouched(field.fields);
            });
          };
          markTouched(currentStep.fields);
          setTouchedFields((prev) => ({ ...prev, ...touched }));
        }
        return;
      }

      // If not on the last step, move to the next step instead of submitting
      if (!isLastStep) {
        handleNextStep();
        return;
      }
    }

    // Validate step-by-step for multi-step forms, or the full form for single-page
    const isMultiStepWizard =
      formStructure.hasSteps &&
      activeStepGroup &&
      activeStepGroup.steps.length > 1;

    const result = isMultiStepWizard
      ? (() => {
          const wizardResult = validateWizardSteps({
            steps: activeStepGroup!.steps,
            nonStepFields: formStructure.nonStepFields.map(({ field }) => field),
            values: formData,
          });
          if (
            !wizardResult.isValid &&
            wizardResult.firstInvalidStepIndex !== -1
          ) {
            setCurrentStepIndex(wizardResult.firstInvalidStepIndex);
          }
          return {
            isValid: wizardResult.isValid,
            errors: wizardResult.errors,
          };
        })()
      : validateVisibleFields(effectiveFields, formData);

    if (result.isValid) {
      // Build complete form data with defaults
      const completeFormData: Record<string, any> = { ...formData };

      // Ensure all fields have values
      const processFields = (fieldList: FormField[]) => {
        fieldList.forEach((field) => {
          if (field.fields) {
            processFields(field.fields);
          }
          // Skip container fields
          if (
            ['step_section', 'ui_section', 'rich_text'].includes(field.type)
          ) {
            return;
          }
          // If field doesn't have a value in formData, use default_value or appropriate default
          if (!(field.id in completeFormData)) {
            if (
              field.default_value !== undefined &&
              field.default_value !== null
            ) {
              completeFormData[field.id] = field.default_value;
            } else {
              // Set appropriate default based on field type
              switch (field.type) {
                case 'checkbox':
                case 'multi_select':
                case 'media':
                  completeFormData[field.id] = [];
                  break;
                case 'matrix':
                  completeFormData[field.id] = {};
                  break;
                case 'range':
                case 'rating':
                case 'number':
                case 'date':
                  completeFormData[field.id] = null;
                  break;
                default:
                  completeFormData[field.id] = '';
              }
            }
          }
        });
      };

      processFields(effectiveFields);

      // Create enhanced submission with actual form data
      // Use original fields (not localized) for consistency with form builder
      const enhancedFieldMap = createFieldMap(fields);
      const enhancedSubmission: EnhancedFormSubmission = {
        fields: fields,
        submissionData: completeFormData,
        fieldMap: enhancedFieldMap,
      };

      // Update store with submission data
      setEnhancedSubmission(enhancedSubmission);

      // Format submission data for easy mapping during edit
      const formattedData = formatSubmissionDataForEdit(enhancedSubmission);
      toast.success('Form submitted successfully! (Preview Mode)');

      setValidationErrors({});
      setSubmitAttempted(false);
    } else {
      setValidationErrors(result.errors);

      // Mark all fields with errors as touched
      const newTouched: Record<string, boolean> = {};
      Object.keys(result.errors).forEach((key) => {
        newTouched[key] = true;
      });
      setTouchedFields((prev) => ({ ...prev, ...newTouched }));

      // Scroll to first error
      const firstErrorField = Object.keys(result.errors)[0];
      const errorElement = document.getElementById(`field-${firstErrorField}`);
      if (errorElement) {
        errorElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({});
    setValidationErrors({});
    setTouchedFields({});
    setSubmitAttempted(false);

    // Re-initialize form data
    if (effectiveFields.length > 0) {
      const initialData: Record<string, any> = {};
      const initializeFields = (fieldList: FormField[]) => {
        fieldList.forEach((fld) => {
          if (
            [
              'step_section',
              'ui_section',
              'array',
              'table',
              'rich_text',
            ].includes(fld.type)
          ) {
            if (fld.fields) initializeFields(fld.fields);
            return;
          }
          if (fld.default_value !== undefined && fld.default_value !== null) {
            initialData[fld.id] = fld.default_value;
          } else {
            switch (fld.type) {
              case 'checkbox':
              case 'multi_select':
              case 'media':
                initialData[fld.id] = [];
                break;
              case 'matrix':
                initialData[fld.id] = {};
                break;
              default:
                initialData[fld.id] = '';
            }
          }
          if (fld.fields) initializeFields(fld.fields);
        });
      };
      initializeFields(effectiveFields);
      setFormData(initialData);
    }

    // Reset step navigation
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
  };

  return (
    <>
      {/* Preview Toggle Button */}
      <Button
        variant='outline'
        type='button'
        onClick={() => setIsOpen(true)}
        className=''>
        <Eye className='h-6 w-6' />
      </Button>

      {/* Preview Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className='max-w-7xl h-[90vh] p-0 flex flex-col overflow-visible'>
          <DialogTitle className='sr-only'>Form Preview</DialogTitle>

          {/* Header */}
          <div className='bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
                <Eye className='w-5 h-5 text-primary' />
              </div>
              <div>
                <h2 className='text-lg font-semibold'>{t('preview.title')}</h2>
                <p className='text-sm text-muted-foreground'>
                  {t('preview.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className='flex-1 min-h-0 overflow-visible'>
            <div className='max-w-7xl mx-auto py-8 px-6 max-h-full overflow-y-auto overscroll-contain'>
              <form onSubmit={handleFormSubmit} className='space-y-4'>
                {effectiveFields.length > 0 ? (
                  formStructure.hasSteps &&
                  activeStepGroup &&
                  activeStepGroup.steps.length > 1 ? (
                    // Multi-step form rendering
                    <>
                      {/* Step Progress Indicator */}
                      <div className='mb-4'>
                        <div className='flex items-center justify-center mb-4 flex-wrap gap-y-4'>
                          {activeStepGroup.steps.map((step, index) => {
                            const isCompleted = completedSteps.has(index);
                            const isCurrent = index === currentStepIndex;
                            const isClickable =
                              index <= currentStepIndex ||
                              completedSteps.has(index - 1);

                            return (
                              <div key={step.id} className='flex items-center'>
                                <div className='flex flex-col items-center'>
                                  <button
                                    type='button'
                                    onClick={() =>
                                      isClickable && handleGoToStep(index)
                                    }
                                    disabled={!isClickable}
                                    className={cn(
                                      'w-10 h-10 rounded-full flex items-center justify-center transition-all font-semibold text-sm',
                                      isCompleted &&
                                        'bg-green-500 text-white cursor-pointer hover:bg-green-600',
                                      isCurrent &&
                                        !isCompleted &&
                                        'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                                      !isCurrent &&
                                        !isCompleted &&
                                        isClickable &&
                                        'bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80',
                                      !isCurrent &&
                                        !isCompleted &&
                                        !isClickable &&
                                        'bg-muted text-muted-foreground/50 cursor-not-allowed',
                                    )}>
                                    {isCompleted ? (
                                      <Check className='w-5 h-5' />
                                    ) : (
                                      formatNumberByLocale(
                                        index + 1,
                                        currentLocale,
                                      )
                                    )}
                                  </button>
                                  <span
                                    className={cn(
                                      'text-xs mt-2 font-medium max-w-[80px] text-center truncate',
                                      isCurrent
                                        ? 'text-primary'
                                        : 'text-muted-foreground',
                                    )}>
                                    {step.label}
                                  </span>
                                </div>
                                {index < activeStepGroup.steps.length - 1 && (
                                  <div
                                    className={cn(
                                      'w-12 h-1 mx-2 rounded transition-all',
                                      completedSteps.has(index)
                                        ? 'bg-green-500'
                                        : 'bg-muted',
                                    )}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Current Step Content */}
                      {activeStepGroup.steps[currentStepIndex] && (
                        <div className='animate-in fade-in slide-in-from-right-4 duration-300'>
                          {/* Step Header */}
                          <div className='border-b pb-4 mb-4'>
                            <h3 className='font-semibold text-xl flex items-center gap-3'>
                              <span className='bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold'>
                                {currentStepIndex + 1}
                              </span>
                              {activeStepGroup.steps[currentStepIndex].label}
                            </h3>
                            {activeStepGroup.steps[currentStepIndex]
                              .stepDescription && (
                              <p className='text-sm text-muted-foreground mt-2 ml-11'>
                                {
                                  activeStepGroup.steps[currentStepIndex]
                                    .stepDescription
                                }
                              </p>
                            )}
                          </div>

                          {/* Step Fields */}
                          {activeStepGroup.steps[currentStepIndex].fields &&
                            activeStepGroup.steps[currentStepIndex].fields!
                              .length > 0 && (
                              <div className='space-y-4'>
                                {activeStepGroup.steps[
                                  currentStepIndex
                                ].fields!.map((nestedField) => (
                                  <div key={nestedField.id}>
                                    {renderField(nestedField)}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      )}

                      {/* Render non-step fields after steps */}
                      {formStructure.nonStepFields.length > 0 && isLastStep && (
                        <div className='space-y-4 mt-4 pt-4 border-t'>
                          {formStructure.nonStepFields.map(({ field }) => (
                            <div key={field.id}>{renderField(field)}</div>
                          ))}
                        </div>
                      )}

                      {/* Step Navigation Buttons */}
                      <div className='mt-8 pt-4 border-t flex flex-col sm:flex-row justify-between gap-3'>
                        <div className='flex gap-2'>
                          <Button
                            type='button'
                            variant='outline'
                            onClick={handlePreviousStep}
                            disabled={currentStepIndex === 0}
                            className='gap-2'>
                            <ArrowLeft className='w-4 h-4' />
                            {t('preview.previousButton')}
                          </Button>
                        </div>

                        <div className='flex gap-2'>
                          <Button
                            type='button'
                            variant='outline'
                            onClick={resetForm}>
                            {t('preview.resetButton')}
                          </Button>

                          {isLastStep ? (
                            <Button type='submit' size='lg'>
                              {t('preview.submitButton')}
                            </Button>
                          ) : (
                            <Button
                              type='button'
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleNextStep();
                              }}
                              size='lg'
                              className='gap-2'>
                              {t('preview.nextStepButton')}
                              <ArrowRight className='w-4 h-4' />
                            </Button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    // Single-page form rendering (no multi-step or single step)
                    <>
                      {effectiveFields.map((field) => (
                        <div key={field.id}>{renderField(field)}</div>
                      ))}
                    </>
                  )
                ) : (
                  <div className='text-center py-12 text-muted-foreground'>
                    <p className='text-lg'>{t('preview.noFields')}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
