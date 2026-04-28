import { z } from 'zod';
import { FormField } from '../types/form';
import { FormSubmissionData } from '../types/submission';
import { getLocalizedFieldValue } from './fieldLocalization';
import {
  validateLanguage,
  getLanguageErrorMessage,
} from './languageValidation';
import { resolveDateConstraint } from './dateConstraint';

/**
 * Reusable password schema for strict validation
 */
export const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^a-zA-Z0-9]/,
    'Password must contain at least one special character',
  );

/**
 * Normalizes pattern(s) to an array format
 * Handles both single string (backward compatibility) and array of strings
 */
function normalizePatterns(pattern: string | string[] | undefined): string[] {
  if (!pattern) return [];
  return Array.isArray(pattern) ? pattern : [pattern];
}

/**
 * Applies pattern validation to a Zod string schema
 * Supports multiple patterns - all patterns must match (AND logic)
 */
function applyPatternValidation(
  schema: z.ZodString,
  patterns: string[],
  patternMessages: string[] | undefined,
  defaultMessage: string,
): z.ZodString {
  if (patterns.length === 0) return schema;

  // Apply each pattern - all must pass
  return patterns.reduce((currentSchema, pattern, index) => {
    try {
      const regex = new RegExp(pattern);
      const errorMessage =
        patternMessages?.[index] ||
        patternMessages?.[0] || // Fallback to first message if index doesn't exist
        defaultMessage;

      return currentSchema.regex(regex, errorMessage);
    } catch (error) {
      // Invalid regex pattern - log warning but don't break validation
      return currentSchema;
    }
  }, schema);
}

/**
 * Build a Zod schema for a single field based on its type and validation rules
 * Handles all field types including nested structures
 */
export function buildFieldSchema(
  field: FormField,
  locale?: string,
): z.ZodTypeAny {
  // Get localized label for error messages
  const getLabel = () =>
    locale
      ? getLocalizedFieldValue(field, 'label', locale, field.label)
      : field.label;
  const getMessage = (defaultMessage: string) => {
    if (locale && field.translations?.message?.[locale]) {
      return field.translations.message[locale];
    }
    return field.validation?.message || defaultMessage;
  };
  // Skip validation for display-only fields
  if (
    field.type === 'rich_text' ||
    field.type === 'step_section' ||
    field.type === 'ui_section'
  ) {
    return z.any().optional();
  }

  let schema: z.ZodTypeAny;

  // Build base schema based on field type
  switch (field.type) {
    case 'text':
    case 'nepali_unicode':
    case 'textarea':
    case 'rich_text_input':
      schema = z.string();

      // Apply language validation if exists (skip for rich_text_input)
      if (
        field.type !== 'rich_text_input' &&
        field.validation?.language &&
        field.validation.language !== 'any'
      ) {
        schema = (schema as z.ZodString).refine(
          (val) => {
            if (!val || val.trim() === '') return true; // Empty values are handled by required validation
            return validateLanguage(val, field.validation!.language!);
          },
          {
            message: getLanguageErrorMessage(
              field.validation.language,
              getLabel(),
            ),
          },
        );
      }

      if (field.type === 'nepali_unicode') {
        schema = (schema as z.ZodString).refine(
          (val) => !val || validateLanguage(val, 'ne'),
          {
            message: getLanguageErrorMessage('ne', getLabel()),
          },
        );
      }

      // Apply pattern validation if exists (supports single pattern or array)
      const patterns = normalizePatterns(field.validation?.pattern);
      if (patterns.length > 0) {
        schema = applyPatternValidation(
          schema as z.ZodString,
          patterns,
          field.validation?.patternMessages,
          getMessage(`${getLabel()} format is invalid`),
        );
      }
      break;

    case 'email':
      schema = z.string().email(`${getLabel()} must be a valid email`);

      // Apply additional pattern validation if exists (supports single pattern or array)
      const emailPatterns = normalizePatterns(field.validation?.pattern);
      if (emailPatterns.length > 0) {
        schema = applyPatternValidation(
          schema as z.ZodString,
          emailPatterns,
          field.validation?.patternMessages,
          getMessage(`${getLabel()} format is invalid`),
        );
      }
      break;

    case 'phone':
      schema = z.string().refine(
        (val) => {
          if (!val) return true;
          // Count only digits
          const digitCount = val.replace(/\D/g, '').length;
          return digitCount <= 15;
        },
        {
          message: `${getLabel()} must not exceed 15 digits`,
        },
      );
      break;

    case 'number':
      schema = z.coerce.number({
        message: `${getLabel()} must be a number`,
      });

      // Apply min/max validation
      if (field.validation?.min !== undefined) {
        schema = (schema as z.ZodNumber).min(
          field.validation.min,
          `${getLabel()} must be at least ${field.validation.min}`,
        );
      }
      if (field.validation?.max !== undefined) {
        schema = (schema as z.ZodNumber).max(
          field.validation.max,
          `${getLabel()} must be at most ${field.validation.max}`,
        );
      }
      break;

    case 'date':
      const dateMode = field.dateMode || 'single';
      if (dateMode === 'range') {
        // Range mode: value is { from: Date | undefined, to?: Date | undefined }
        schema = z
          .object({
            from: z.union([z.date(), z.string()]).optional(),
            to: z.union([z.date(), z.string()]).optional(),
          })
          .refine(
            (val) => {
              // If from is provided, it must be valid
              if (val.from) {
                const fromDate =
                  typeof val.from === 'string' ? new Date(val.from) : val.from;
                if (!(fromDate instanceof Date) || isNaN(fromDate.getTime())) {
                  return false;
                }
              }
              // If to is provided, it must be valid
              if (val.to) {
                const toDate =
                  typeof val.to === 'string' ? new Date(val.to) : val.to;
                if (!(toDate instanceof Date) || isNaN(toDate.getTime())) {
                  return false;
                }
              }
              // If both are provided, from must be before or equal to to
              if (val.from && val.to) {
                const fromDate =
                  typeof val.from === 'string' ? new Date(val.from) : val.from;
                const toDate =
                  typeof val.to === 'string' ? new Date(val.to) : val.to;
                const normalizedFrom = new Date(fromDate);
                const normalizedTo = new Date(toDate);
                normalizedFrom.setHours(0, 0, 0, 0);
                normalizedTo.setHours(0, 0, 0, 0);
                if (normalizedFrom > normalizedTo) {
                  return false;
                }
              }
              // Check min/max date constraints
              if (field.dateMin && val.from) {
                const fromDate =
                  typeof val.from === 'string' ? new Date(val.from) : val.from;
                const minDate = resolveDateConstraint(field.dateMin);
                if (!minDate) return false;
                const normalizedFrom = new Date(fromDate);
                normalizedFrom.setHours(0, 0, 0, 0);
                if (normalizedFrom < minDate) {
                  return false;
                }
              }
              if (field.dateMax && val.to) {
                const toDate =
                  typeof val.to === 'string' ? new Date(val.to) : val.to;
                const maxDate = resolveDateConstraint(field.dateMax);
                if (!maxDate) return false;
                const normalizedTo = new Date(toDate);
                normalizedTo.setHours(0, 0, 0, 0);
                if (normalizedTo > maxDate) {
                  return false;
                }
              }
              // Also check max date constraint on 'from' if to is not set
              if (field.dateMax && val.from && !val.to) {
                const fromDate =
                  typeof val.from === 'string' ? new Date(val.from) : val.from;
                const maxDate = resolveDateConstraint(field.dateMax);
                if (!maxDate) return false;
                const normalizedFrom = new Date(fromDate);
                normalizedFrom.setHours(0, 0, 0, 0);
                if (normalizedFrom > maxDate) {
                  return false;
                }
              }
              return true;
            },
            {
              message: `${getLabel()} must be a valid date range`,
            },
          );
      } else {
        // Single mode: value is a Date or string
        schema = z.union([z.string(), z.date()]).refine(
          (val) => {
            if (!val) return false;
            const date = typeof val === 'string' ? new Date(val) : val;
            if (!(date instanceof Date) || isNaN(date.getTime())) {
              return false;
            }
            // Check min/max date constraints
            const dateObj = typeof val === 'string' ? new Date(val) : val;
            dateObj.setHours(0, 0, 0, 0);
            if (field.dateMin) {
              const minDate = resolveDateConstraint(field.dateMin);
              if (!minDate) return false;
              if (dateObj < minDate) {
                return false;
              }
            }
            if (field.dateMax) {
              const maxDate = resolveDateConstraint(field.dateMax);
              if (!maxDate) return false;
              if (dateObj > maxDate) {
                return false;
              }
            }
            return true;
          },
          {
            message: `${getLabel()} must be a valid date`,
          },
        );
      }
      break;

    case 'select':
    case 'radio':
      // For dynamic options, we can't validate against specific values
      if (field.isDynamic) {
        schema = z.string();
      } else if (field.optionConfigs && field.optionConfigs.length > 0) {
        const values = field.optionConfigs.map((opt) => opt.value);
        if (values.length > 0) {
          schema = z
            .enum(values as [string, ...string[]])
            .refine((val) => values.includes(val), {
              message: `${getLabel()} must be a valid option`,
            });
        } else {
          schema = z.string();
        }
      } else if (field.options && field.options.length > 0) {
        schema = z
          .enum(field.options as [string, ...string[]])
          .refine((val) => field.options!.includes(val), {
            message: `${getLabel()} must be a valid option`,
          });
      } else {
        schema = z.string();
      }
      break;

    case 'checkbox':
    case 'multi_select':
      schema = z
        .array(z.string())
        .min(1, `${getLabel()} requires at least one selection`);
      break;

    case 'range':
      const rangeMode = field.rangeMode || 'single';
      if (rangeMode === 'range') {
        // Range mode: value is [min, max] array
        schema = z
          .array(z.number(), {
            message: `${getLabel()} must be an array of two numbers`,
          })
          .length(2, `${getLabel()} must contain exactly two values`)
          .refine(
            (arr) => {
              if (field.rangeMin !== undefined && arr[0] < field.rangeMin) {
                return false;
              }
              if (field.rangeMax !== undefined && arr[1] > field.rangeMax) {
                return false;
              }
              if (arr[0] > arr[1]) {
                return false;
              }
              return true;
            },
            {
              message: `${getLabel()} range values are invalid`,
            },
          );
      } else {
        // Single mode: value is a number
        schema = z.coerce.number({
          message: `${getLabel()} must be a number`,
        });

        // Apply range min/max validation
        if (field.rangeMin !== undefined) {
          schema = (schema as z.ZodNumber).min(
            field.rangeMin,
            `${getLabel()} must be at least ${field.rangeMin}`,
          );
        }
        if (field.rangeMax !== undefined) {
          schema = (schema as z.ZodNumber).max(
            field.rangeMax,
            `${getLabel()} must be at most ${field.rangeMax}`,
          );
        }
      }
      break;

    case 'rating':
      // Rating is a number between 1 and ratingMax
      schema = z.coerce.number({
        message: `${getLabel()} must be a number`,
      });

      const ratingMax = field.ratingMax || 5;
      schema = (schema as z.ZodNumber)
        .min(1, `${getLabel()} must be at least 1`)
        .max(ratingMax, `${getLabel()} must be at most ${ratingMax}`);
      break;

    case 'matrix':
      // Matrix is an object where keys are row IDs and values are selected column values
      schema = z.record(z.string(), z.string()).superRefine((data, ctx) => {
        const matrixRows = Array.isArray(field.matrixRows)
          ? field.matrixRows
          : [];
        const matrixColumns = Array.isArray(field.matrixColumns)
          ? field.matrixColumns
          : [];
        const expectedRowKeys = matrixRows.map((_, index) => `row_${index}`);
        const submittedRowKeys = Object.keys(data);

        if (expectedRowKeys.length > 0) {
          const invalidRowKeys = submittedRowKeys.filter(
            (key) => !expectedRowKeys.includes(key),
          );
          if (invalidRowKeys.length > 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${getLabel()} contains invalid matrix rows`,
            });
            return;
          }
        }

        const rowKeysToValidate =
          expectedRowKeys.length > 0 ? expectedRowKeys : submittedRowKeys;

        if (field.required) {
          if (rowKeysToValidate.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${getLabel()} requires all rows to be answered`,
            });
            return;
          }

          const hasEmptyValues = rowKeysToValidate.some(
            (rowKey) => !data[rowKey],
          );
          if (hasEmptyValues) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${getLabel()} requires all rows to be answered`,
            });
            return;
          }
        }

        if (matrixColumns.length > 0) {
          for (const rowKey of rowKeysToValidate) {
            const selectedColumn = data[rowKey];
            if (!selectedColumn) continue;

            if (!matrixColumns.includes(selectedColumn)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${getLabel()} contains invalid matrix column selection`,
              });
              return;
            }
          }
        }
      });
      break;

    case 'media':
      // Media upload - can be File, FileList, or array of files
      if (field.multiple) {
        schema = z
          .array(z.any())
          .min(1, `${getLabel()} requires at least one file`);

        if (field.maxFiles) {
          schema = (schema as z.ZodArray<any>).max(
            field.maxFiles,
            `${getLabel()} allows maximum ${field.maxFiles} files`,
          );
        }
      } else {
        schema = z
          .any()
          .refine((val) => val !== null && val !== undefined && val !== '', {
            message: `${getLabel()} is required`,
          });
      }
      break;

    case 'array':
      // Array/repeating fields - build schema for nested fields recursively
      // This handles nested arrays, step_sections, ui_sections, and any other nested structures
      // by recursively calling buildFormSchema which processes all nested fields
      if (field.fields && field.fields.length > 0) {
        // Recursively build schema for array items (handles nested -> nested scenarios)
        const itemSchema = buildFormSchema(field.fields, locale);
        schema = z.array(itemSchema);

        // Apply min/max items validation
        if (field.minItems !== undefined && field.minItems > 0) {
          schema = (schema as z.ZodArray<any>).min(
            field.minItems,
            `${getLabel()} requires at least ${field.minItems} items`,
          );
        }
        if (field.maxItems !== undefined) {
          schema = (schema as z.ZodArray<any>).max(
            field.maxItems,
            `${getLabel()} allows maximum ${field.maxItems} items`,
          );
        }
      } else {
        schema = z.array(z.any());
      }
      break;

    case 'table':
      // Table field - array of row objects with column data
      if (field.tableColumns && field.tableColumns.length > 0) {
        // Build row schema based on column definitions
        const rowSchemaShape: Record<string, z.ZodTypeAny> = {};
        field.tableColumns.forEach((col) => {
          const colLabel =
            locale && col.translations?.label?.[locale]
              ? col.translations.label[locale]
              : col.label;
          let colSchema: z.ZodTypeAny;
          switch (col.type) {
            case 'number':
              colSchema = z.coerce.number().optional();
              break;
            case 'calculated':
              colSchema = z.any().optional();
              break;
            case 'select':
              // Use localized options if available
              const colOptions =
                locale && col.translations?.options?.[locale]
                  ? col.translations.options[locale]
                  : col.options;
              if (colOptions && colOptions.length > 0) {
                colSchema = z
                  .enum(colOptions as [string, ...string[]])
                  .optional();
              } else {
                colSchema = z.string().optional();
              }
              break;
            case 'multi_select':
              // Use localized options if available
              const colMultiOptions =
                locale && col.translations?.options?.[locale]
                  ? col.translations.options[locale]
                  : col.options;
              colSchema = z.array(z.string()).optional().default([]);
              break;
            default:
              colSchema = z.string().optional();
          }
          if (col.required) {
            if (col.type === 'number') {
              colSchema = z.coerce.number({
                message: `${colLabel} is required`,
              });
            } else if (col.type === 'multi_select') {
              colSchema = z
                .array(z.string())
                .min(1, `${colLabel} requires at least one selection`);
            } else if (col.type !== 'calculated') {
              colSchema = z.string().min(1, `${colLabel} is required`);
            }
          }
          rowSchemaShape[col.id] = colSchema;
        });
        const rowSchema = z.object(rowSchemaShape);
        schema = z.array(rowSchema);

        // Apply min/max items validation
        if (field.minItems !== undefined && field.minItems > 0) {
          schema = (schema as z.ZodArray<any>).min(
            field.minItems,
            `${getLabel()} requires at least ${field.minItems} rows`,
          );
        }
        if (field.maxItems !== undefined) {
          schema = (schema as z.ZodArray<any>).max(
            field.maxItems,
            `${getLabel()} allows maximum ${field.maxItems} rows`,
          );
        }
      } else {
        schema = z.array(z.any());
      }
      break;

    case 'calculated':
      // Calculated fields are read-only, accept any value
      schema = z.any().optional();
      break;

    case 'map':
      // Map fields store coordinates, drawing mode, area/length, and radius
      schema = z
        .object({
          coordinates: z.array(z.tuple([z.number(), z.number()])).optional(),
          drawingMode: z
            .enum(['coordinate', 'polygon', 'circle', 'rectangle', 'line'])
            .optional(),
          calculatedArea: z.number().optional(),
          calculatedLength: z.number().optional(),
          radius: z.number().optional(),
        })
        .optional();
      break;

    default:
      schema = z.any();
  }

  // Apply required validation
  if (field.required) {
    // Most schemas already handle required, but ensure it's not optional
    return schema;
  } else {
    // Make field optional and handle empty strings
    if (
      field.type === 'text' ||
      field.type === 'nepali_unicode' ||
      field.type === 'textarea' ||
      field.type === 'email'
    ) {
      return z
        .union([schema, z.literal('')])
        .optional()
        .transform((val) => (val === '' ? undefined : val));
    } else if (field.type === 'checkbox' || field.type === 'multi_select') {
      return (schema as z.ZodArray<any>).optional().default([]);
    }
    return schema.optional();
  }
}

/**
 * Build a Zod schema for an entire form including nested fields
 * Recursively processes step_section, ui_section, and array fields.
 * Fields inside nested forms (triggered by options) are made optional to avoid
 * validation errors when their parent option is not selected.
 */
export function buildFormSchema(
  fields: FormField[],
  locale?: string,
): z.ZodObject<any> {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  function processFields(
    fieldList: FormField[],
    isWithinOptionNestedForm = false,
  ) {
    for (const field of fieldList) {
      // Handle container fields with nested fields
      if (field.type === 'step_section' || field.type === 'ui_section') {
        // Recursively process nested fields
        if (field.fields && field.fields.length > 0) {
          processFields(field.fields, isWithinOptionNestedForm);
        }
        // Don't add container itself to schema
        continue;
      }

      // Skip rich_text (display only)
      if (field.type === 'rich_text') {
        continue;
      }

      // Add field to schema
      let fieldSchema = buildFieldSchema(field, locale);

      // If this field is inside a nested form triggered by an option,
      // it should be optional in the top-level Zod schema because
      // it may or may not be active depending on the data.
      if (isWithinOptionNestedForm) {
        fieldSchema = fieldSchema.optional();
      }

      schemaShape[field.id] = fieldSchema;

      // Handle nested forms in optionConfigs (these ARE at the top level of data)
      if (field.optionConfigs && field.optionConfigs.length > 0) {
        field.optionConfigs.forEach((opt) => {
          if (opt.nestedForm && opt.nestedForm.fields) {
            processFields(opt.nestedForm.fields, true);
          }
        });
      }
    }
  }

  processFields(fields);

  return z.object(schemaShape);
}

/**
 * Validate form submission data against schema
 * Returns validation result with formatted errors
 */
export function validateFormWithZod(
  fields: FormField[],
  submissionData: FormSubmissionData,
  locale?: string,
): {
  isValid: boolean;
  errors: Record<string, string>;
  data?: FormSubmissionData;
} {
  const schema = buildFormSchema(fields, locale);

  try {
    const validatedData = schema.parse(submissionData);
    return {
      isValid: true,
      errors: {},
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};

      // Format Zod errors into a flat object mapping field IDs to error messages
      error.issues.forEach((err) => {
        const fieldPath = err.path.join('.');
        errors[fieldPath] = err.message;
      });

      return {
        isValid: false,
        errors,
      };
    }

    // Unexpected error
    return {
      isValid: false,
      errors: { _form: 'An unexpected validation error occurred' },
    };
  }
}

/**
 * Validate a single field value with Zod
 * Useful for real-time validation
 */
export function validateFieldWithZod(
  field: FormField,
  value: any,
  locale?: string,
): {
  isValid: boolean;
  error?: string;
} {
  const schema = buildFieldSchema(field, locale);

  try {
    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return {
        isValid: false,
        error: firstError?.message || 'Invalid value',
      };
    }

    return {
      isValid: false,
      error: 'Validation error',
    };
  }
}

/**
 * Get Zod schema for React Hook Form resolver
 * Can be used with @hookform/resolvers/zod
 */
export function getZodSchemaForForm(fields: FormField[], locale?: string) {
  return buildFormSchema(fields, locale);
}
