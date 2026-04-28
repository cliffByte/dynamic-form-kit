'use client';

import { DisplayContainerProps } from './types';
import { DisplayFieldWrapper } from './DisplayFieldWrapper';
import { DisplayFieldRenderer } from './DisplayFieldRenderer';
import { Card } from '../ui/card';

export function DisplayArrayField({
  field,
  value,
  className,
  dynamicOptions,
  formValues,
  renderField,
}: DisplayContainerProps) {
  const items = Array.isArray(value) ? value : [];
  const hasItems = items.length > 0;

  return (
    <DisplayFieldWrapper
      label={field.label}
      fieldId={field.id}
      instruction={field.instruction}
      className={className}>
      <div className='w-full space-y-4'>
        {hasItems ? (
          items.map((itemValue, index) => (
            <Card key={index} className='p-4 bg-muted/10 border-dashed'>
              <div className='text-[10px] font-bold text-muted-foreground uppercase mb-2'>
                Item #{index + 1}
              </div>
              <div className='grid grid-cols-1 gap-2'>
                {field.fields?.map((nestedField) => {
                  // Get the value directly from this array item
                  const nestedValue =
                    itemValue?.[nestedField.id] ??
                    nestedField.default_value ??
                    '';

                  // Render directly with the correct value from this array item
                  return (
                    <div key={nestedField.id}>
                      <DisplayFieldRenderer
                        field={nestedField}
                        value={nestedValue}
                        dynamicOptions={dynamicOptions}
                        formValues={itemValue}
                        renderField={renderField}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          ))
        ) : (
          <span className='text-muted-foreground/50 italic text-sm'>
            No items added
          </span>
        )}
      </div>
    </DisplayFieldWrapper>
  );
}
