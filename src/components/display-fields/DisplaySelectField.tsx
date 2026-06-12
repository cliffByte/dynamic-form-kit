'use client';

import { DisplayFieldProps } from './types';
import { DisplayFieldWrapper } from './DisplayFieldWrapper';
import { Badge } from '../ui/badge';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { getLocalizedValue } from '../../lib/utils';
import { getDynamicOptionLabel } from '../../lib/dynamicFieldUtils';
import { getChoiceFieldValue } from '../../lib/formUtils';
import { hasRenderableNestedFormFields } from '../../lib/formStepStructure';
import { useFormKit } from '../../context/FormKitContext';

export function DisplaySelectField({
  field,
  value,
  dynamicOptions,
  className,
  isLoading,
  loadError,
  onRetry,
  renderField,
  formValues = {},
}: DisplayFieldProps) {
  const { locale: currentLocale } = useFormKit();

  const getLabel = (val: any) => {
    // Handle objects (localized values)
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return getLocalizedValue(val, currentLocale);
    }

    const stringVal = String(val);

    // Check dynamic options first
    if (dynamicOptions) {
      const option = dynamicOptions.find((opt) => opt.value === stringVal);
      if (option) {
        return getDynamicOptionLabel(option, currentLocale);
      }
    }

    // Check static optionConfigs
    if (field.optionConfigs) {
      const config = field.optionConfigs.find((opt) => opt.value === stringVal);
      if (config) {
        // Handle localized labels in option configs
        if (config.label && typeof config.label === 'object') {
          return getLocalizedValue(config.label, currentLocale);
        }
        return config.label;
      }
    }

    // Check static options array
    if (field.options && field.options.includes(val)) {
      return stringVal;
    }

    return stringVal;
  };

  // Get nested forms for selected values
  const getNestedForms = () => {
    if (!field.optionConfigs) return [];

    const choiceValue = getChoiceFieldValue(value);
    const selectedValues = Array.isArray(choiceValue)
      ? choiceValue
      : choiceValue
        ? [choiceValue]
        : [];
    return field.optionConfigs
      .filter(
        (c) =>
          selectedValues.includes(c.value) &&
          c.nestedForm?.fields?.length &&
          hasRenderableNestedFormFields(c.nestedForm.fields, formValues),
      )
      .map((c) => ({ optionLabel: c.label, nestedForm: c.nestedForm! }));
  };

  const nestedForms = getNestedForms();

  const renderValue = () => {
    if (isLoading) {
      return (
        <div className='flex items-center gap-2 text-muted-foreground animate-pulse'>
          <Loader2 className='w-3 h-3 animate-spin' />
          <span className='text-xs'>Loading labels...</span>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className='flex items-center gap-2 text-destructive'>
          <AlertCircle className='w-3 h-3' />
          <span className='text-xs'>{loadError}</span>
          {onRetry && (
            <Button
              variant='ghost'
              size='icon'
              className='h-4 w-4'
              onClick={onRetry}>
              <RefreshCw className='w-2 h-2' />
            </Button>
          )}
        </div>
      );
    }

    const choiceValue = getChoiceFieldValue(value);
    if (choiceValue === undefined || choiceValue === null || choiceValue === '') {
      return (
        <span className='text-muted-foreground/50 italic text-sm'>
          Not selected
        </span>
      );
    }

    if (Array.isArray(choiceValue)) {
      if (choiceValue.length === 0)
        return (
          <span className='text-muted-foreground/50 italic text-sm'>
            None selected
          </span>
        );
      return (
        <div className='flex flex-wrap gap-1.5'>
          {choiceValue.map((v, i) => (
            <Badge key={i} variant='secondary' className='font-medium'>
              {getLabel(v)}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <span className='text-foreground font-medium text-base'>
        {getLabel(choiceValue)}
      </span>
    );
  };

  return (
    <DisplayFieldWrapper
      label={field.label}
      fieldId={field.id}
      instruction={field.instruction}
      className={className}>
      <div className='space-y-3'>
        {renderValue()}

        {nestedForms.length > 0 && renderField && (
          <div className='space-y-4'>
            {nestedForms.map(({ optionLabel, nestedForm }) => (
              <div
                key={nestedForm.id}
                className='ml-4 pl-4 border-l-2 border-primary/30 space-y-3'>
                <div className='text-sm font-medium text-muted-foreground'>
                  {nestedForm.name || optionLabel || 'Additional Information'}
                </div>
                {nestedForm.fields.map((nestedField) => (
                  <div key={nestedField.id}>{renderField(nestedField)}</div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </DisplayFieldWrapper>
  );
}
