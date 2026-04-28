import { FormField } from '../types/form';
import { FormSubmissionData } from '../types/submission';
import {
  validateFieldWithZod,
  validateFormWithZod,
  buildFormSchema,
  buildFieldSchema,
  getZodSchemaForForm,
} from './zodValidation';
import { getLocalizedFieldValue } from './fieldLocalization';
import {
  validateLanguage,
  getLanguageErrorMessage,
} from './languageValidation';

import { ValidationResult } from '../types/validation';

// Re-export Zod validation functions for convenience
export {
  validateFieldWithZod,
  validateFormWithZod,
  buildFormSchema,
  buildFieldSchema,
  getZodSchemaForForm,
};

/**
 * Validates required field
 * Single responsibility: Required validation
 */
export function validateRequired(
  field: FormField,
  value: any,
  locale?: string,
): ValidationResult {
  if (!field.required) {
    return { isValid: true };
  }

  const isEmpty =
    value === '' ||
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0);

  if (isEmpty) {
    const label = locale
      ? getLocalizedFieldValue(field, 'label', locale, field.label)
      : field.label;
    return { isValid: false, error: `${label} is required` };
  }

  return { isValid: true };
}

/**
 * Validates email format
 * Single responsibility: Email validation
 */
export function validateEmail(value: string): ValidationResult {
  if (!value) {
    return { isValid: true };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { isValid: false, error: 'Must be a valid email' };
  }

  return { isValid: true };
}

/**
 * Validates number range (min/max)
 * Single responsibility: Number range validation
 */
export function validateNumberRange(
  field: FormField,
  value: number,
  locale?: string,
): ValidationResult {
  const numValue = Number(value);

  if (isNaN(numValue)) {
    return { isValid: true };
  }

  const { validation } = field;
  if (!validation) {
    return { isValid: true };
  }

  if (validation.min !== undefined && numValue < validation.min) {
    const label = locale
      ? getLocalizedFieldValue(field, 'label', locale, field.label)
      : field.label;
    return {
      isValid: false,
      error: `${label} must be at least ${validation.min}`,
    };
  }

  if (validation.max !== undefined && numValue > validation.max) {
    const label = locale
      ? getLocalizedFieldValue(field, 'label', locale, field.label)
      : field.label;
    return {
      isValid: false,
      error: `${label} must be at most ${validation.max}`,
    };
  }

  return { isValid: true };
}

/**
 * Validates range
 * Single responsibility: Range validation
 */
export function validateRange(
  field: FormField,
  value: number,
  locale?: string,
): ValidationResult {
  const numValue = Number(value);

  if (isNaN(numValue)) {
    return { isValid: true };
  }

  if (field.rangeMin !== undefined && numValue < field.rangeMin) {
    const label = locale
      ? getLocalizedFieldValue(field, 'label', locale, field.label)
      : field.label;
    return {
      isValid: false,
      error: `${label} must be at least ${field.rangeMin}`,
    };
  }

  if (field.rangeMax !== undefined && numValue > field.rangeMax) {
    const label = locale
      ? getLocalizedFieldValue(field, 'label', locale, field.label)
      : field.label;
    return {
      isValid: false,
      error: `${label} must be at most ${field.rangeMax}`,
    };
  }

  return { isValid: true };
}

/**
 * Validates phone number
 * Max 15 digits including country code
 */
export function validatePhone(
  field: FormField,
  value: string,
  locale?: string,
): ValidationResult {
  if (!value) {
    return { isValid: true };
  }

  const digitCount = value.replace(/\D/g, '').length;
  if (digitCount > 15) {
    const label = locale
      ? getLocalizedFieldValue(field, 'label', locale, field.label)
      : field.label;
    return {
      isValid: false,
      error: `${label} must not exceed 15 digits`,
    };
  }

  return { isValid: true };
}

/**
 * Normalizes pattern(s) to an array format
 * Handles both single string (backward compatibility) and array of strings
 */
function normalizePatterns(pattern: string | string[] | undefined): string[] {
  if (!pattern) return [];
  return Array.isArray(pattern) ? pattern : [pattern];
}

/**
 * Validates pattern/regex
 * Single responsibility: Pattern validation
 * Supports multiple patterns - all patterns must match (AND logic)
 */
export function validatePattern(
  field: FormField,
  value: string,
  locale?: string,
): ValidationResult {
  const { validation } = field;

  if (!value) {
    return { isValid: true };
  }

  const patterns = normalizePatterns(validation?.pattern);
  if (patterns.length === 0) {
    return { isValid: true };
  }

  const label = locale
    ? getLocalizedFieldValue(field, 'label', locale, field.label)
    : field.label;
  const defaultMessage =
    locale && field.translations?.message?.[locale]
      ? field.translations.message[locale]
      : validation?.message || `${label} format is invalid`;

  // Validate against all patterns - all must pass
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    try {
      const regex = new RegExp(pattern);
      if (!regex.test(String(value))) {
        // Use pattern-specific message if available, otherwise fallback
        const errorMessage =
          validation?.patternMessages?.[i] ||
          validation?.patternMessages?.[0] ||
          defaultMessage;
        return {
          isValid: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      // Invalid regex pattern - log warning but continue
      continue;
    }
  }

  return { isValid: true };
}

/**
 * Main field validation function
 * Single responsibility: Orchestrates all validations for a field
 * Now uses Zod for comprehensive validation with fallback to legacy validators
 */
export function validateFieldValue(
  field: FormField,
  value: any,
): ValidationResult {
  // Use Zod validation for all field types
  return validateFieldWithZod(field, value);
}

/**
 * Validates entire form submission
 * Single responsibility: Form-level validation
 * Now uses Zod for comprehensive validation including nested fields
 */
export function validateFormSubmission(
  fields: FormField[],
  submissionData: FormSubmissionData,
): { isValid: boolean; errors: Record<string, string> } {
  // Use Zod validation which handles nested fields automatically
  const result = validateFormWithZod(fields, submissionData);
  return {
    isValid: result.isValid,
    errors: result.errors,
  };
}

/**
 * Validates a calculated field formula following BODMAS rules
 * Single responsibility: Formula validation
 *
 * Validation rules:
 * 1. No consecutive field placeholders (e.g., {field1}{field2})
 * 2. Operators required between operands
 * 3. Balanced brackets
 * 4. Valid mathematical expression structure
 * 5. No invalid operator sequences
 */
export function validateFormula(formula: string): ValidationResult {
  if (!formula || !formula.trim()) {
    return { isValid: false, error: 'Formula cannot be empty' };
  }

  const trimmedFormula = formula.trim();

  // 1. Check for consecutive field placeholders without operators
  // Pattern: }{   indicates two field placeholders next to each other
  const consecutiveFieldsRegex = /\}\s*\{/;
  if (consecutiveFieldsRegex.test(trimmedFormula)) {
    return {
      isValid: false,
      error:
        'Fields must have an operator between them (e.g., {field1} + {field2})',
    };
  }

  // 2. Check for field placeholder followed by number or number followed by field
  // Pattern: }digit or digit{
  const fieldNumberRegex = /\}\s*\d|\d\s*\{/;
  if (fieldNumberRegex.test(trimmedFormula)) {
    return {
      isValid: false,
      error: 'Operator required between field and number (e.g., {field1} * 2)',
    };
  }

  // 3. Check for balanced brackets
  const bracketValidation = validateBalancedBrackets(trimmedFormula);
  if (!bracketValidation.isValid) {
    return bracketValidation;
  }

  // 4. Check for valid field placeholder format
  const fieldPlaceholderRegex = /\{([^}]+)\}/g;
  const matches = trimmedFormula.match(fieldPlaceholderRegex);
  if (matches) {
    for (const match of matches) {
      const fieldId = match.slice(1, -1); // Remove { and }
      if (!fieldId || fieldId.trim() === '') {
        return {
          isValid: false,
          error: 'Empty field placeholder found: {}',
        };
      }
      // Field IDs can contain any characters except }
      // This allows UUIDs, alphanumeric, underscores, hyphens, etc.
    }
  }

  // 5. Check for invalid operator sequences
  const invalidOperatorSequences = [
    { pattern: /\+\+/, error: 'Invalid operator sequence: ++' },
    { pattern: /\*\*/, error: 'Invalid operator sequence: **' },
    { pattern: /\/\//, error: 'Invalid operator sequence: //' },
    { pattern: /\+\*/, error: 'Invalid operator sequence: +*' },
    { pattern: /\+\//, error: 'Invalid operator sequence: +/' },
    { pattern: /\*\+/, error: 'Invalid operator sequence: *+' },
    { pattern: /\*\//, error: 'Invalid operator sequence: */' },
    { pattern: /\/\*/, error: 'Invalid operator sequence: /*' },
    { pattern: /\/\+/, error: 'Invalid operator sequence: /+' },
  ];

  for (const check of invalidOperatorSequences) {
    if (check.pattern.test(trimmedFormula)) {
      return { isValid: false, error: check.error };
    }
  }

  // 6. Check for operators at the beginning (except minus for negative numbers)
  const startsWithInvalidOperator = /^[\+\*\/]/.test(trimmedFormula);
  if (startsWithInvalidOperator) {
    return {
      isValid: false,
      error: 'Formula cannot start with an operator (+, *, /)',
    };
  }

  // 7. Check for operators at the end
  const endsWithOperator = /[\+\-\*\/]$/.test(trimmedFormula);
  if (endsWithOperator) {
    return {
      isValid: false,
      error: 'Formula cannot end with an operator',
    };
  }

  // 8. Check for operators right after opening brackets
  const operatorAfterOpenBracket = /[\(\[\{][\*\/]/.test(trimmedFormula);
  if (operatorAfterOpenBracket) {
    return {
      isValid: false,
      error: 'Invalid operator after opening bracket',
    };
  }

  // 9. Check for operators right before closing brackets (except minus/plus)
  const operatorBeforeCloseBracket = /[\*\/][\)\]\}]/.test(trimmedFormula);
  if (operatorBeforeCloseBracket) {
    return {
      isValid: false,
      error: 'Invalid operator before closing bracket',
    };
  }

  // 10. Check for empty brackets
  const emptyBrackets = /\(\s*\)|\[\s*\]|\{\s*\}/;
  if (emptyBrackets.test(trimmedFormula)) {
    return {
      isValid: false,
      error: 'Empty brackets found',
    };
  }

  // 11. Check for valid characters only
  // To properly validate, we need to temporarily remove field placeholders
  // and then check if the remaining expression contains only valid math characters
  let formulaWithoutFields = trimmedFormula;
  const fieldMatchesForValidation = trimmedFormula.match(/\{[^}]+\}/g);
  if (fieldMatchesForValidation) {
    // Replace each field placeholder with 'X' temporarily
    fieldMatchesForValidation.forEach((match) => {
      formulaWithoutFields = formulaWithoutFields.replace(match, 'X');
    });
  }

  // Now check if the formula (without field IDs) contains only valid math characters
  // Allow: letters (for our X placeholder), digits, operators, brackets, spaces, decimal points
  const validCharsRegex = /^[a-zA-Z\d\+\-\*\/\(\)\[\]\{\}\s\.]+$/;
  if (!validCharsRegex.test(formulaWithoutFields)) {
    return {
      isValid: false,
      error:
        'Formula contains invalid characters. Only use: +, -, *, /, (), [], {}, numbers, and field references',
    };
  }

  // 12. Validate that there's at least one field placeholder or number
  const hasContent = /\{[^}]+\}|\d/.test(trimmedFormula);
  if (!hasContent) {
    return {
      isValid: false,
      error: 'Formula must contain at least one field or number',
    };
  }

  return { isValid: true };
}

/**
 * Validates balanced brackets in a formula
 * Single responsibility: Bracket matching validation
 */
function validateBalancedBrackets(formula: string): ValidationResult {
  const stack: string[] = [];
  const bracketPairs: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
  };
  const closingBrackets = new Set([')', ']', '}']);

  // First, we need to skip field placeholders {fieldId} in bracket matching
  // since they're not mathematical brackets
  let i = 0;
  while (i < formula.length) {
    const char = formula[i];

    // Check if this is a field placeholder
    if (char === '{') {
      // Look ahead to find the closing }
      const closingIndex = formula.indexOf('}', i + 1);
      if (closingIndex !== -1) {
        // Check if there's any content between { and }
        const content = formula.substring(i + 1, closingIndex);
        // If there's content (field ID), skip it - field IDs can contain any characters
        if (content.trim().length > 0) {
          i = closingIndex + 1;
          continue;
        }
      }
    }

    // Handle opening brackets (but not field placeholder {)
    if (
      char === '(' ||
      char === '[' ||
      (char === '{' &&
        !/^[a-zA-Z0-9_-]+$/.test(
          formula.substring(i + 1, formula.indexOf('}', i + 1) || i + 1),
        ))
    ) {
      stack.push(char);
    }
    // Handle closing brackets (but not field placeholder })
    else if (closingBrackets.has(char)) {
      // Check if this might be part of a field placeholder
      if (char === '}') {
        // Look back to see if there's a matching { with field ID pattern
        const openingIndex = formula.lastIndexOf('{', i);
        if (openingIndex !== -1) {
          const content = formula.substring(openingIndex + 1, i);
          if (/^[a-zA-Z0-9_-]+$/.test(content)) {
            i++;
            continue; // This is a field placeholder closing bracket
          }
        }
      }

      if (stack.length === 0) {
        return {
          isValid: false,
          error: `Unmatched closing bracket: ${char}`,
        };
      }

      const lastOpening = stack.pop()!;
      const expectedClosing = bracketPairs[lastOpening];

      if (char !== expectedClosing) {
        return {
          isValid: false,
          error: `Mismatched brackets: ${lastOpening} and ${char}`,
        };
      }
    }

    i++;
  }

  if (stack.length > 0) {
    return {
      isValid: false,
      error: `Unmatched opening bracket: ${stack[stack.length - 1]}`,
    };
  }

  return { isValid: true };
}
