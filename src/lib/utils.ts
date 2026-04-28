import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a UUID v4 string
 * Uses uuid package for compatibility across all environments
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Get localized value from a Record<string, string> object
 * @param localizedValue - The localized object {en: "value", ne: "value"}
 * @param locale - Target locale (required - must be passed from component using useLocale())
 * @param fallback - Fallback value if locale not found
 * @returns Localized value or fallback
 */
export function getLocalizedValue(
  localizedValue: Record<string, string> | string | undefined,
  locale: string = 'en',
  fallback: string = '',
): string {
  // If it's already a string, return it
  if (typeof localizedValue === 'string') {
    return localizedValue;
  }

  // If it's undefined or null, return fallback
  if (!localizedValue) {
    return fallback;
  }

  // Try the requested locale
  if (localizedValue[locale]) {
    return localizedValue[locale];
  }

  // Try English as fallback
  if (localizedValue.en) {
    return localizedValue.en;
  }

  // Try the first available value
  const firstKey = Object.keys(localizedValue)[0];
  if (firstKey && localizedValue[firstKey]) {
    return localizedValue[firstKey];
  }

  return fallback;
}

/**
 * Format number according to locale
 * Converts English numbers to Nepali numerals when locale is 'ne'
 * @param value - Number or string to format
 * @param locale - Target locale (e.g., 'en', 'ne')
 * @returns Formatted number string according to locale
 *
 * Example:
 * formatNumberByLocale(5, 'en') => '5'
 * formatNumberByLocale(5, 'ne') => '५'
 * formatNumberByLocale(123, 'ne') => '१२३'
 */
export function formatNumberByLocale(
  value: string | number | null | undefined,
  locale: string = 'en',
): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const strValue = String(value);

  // Only convert to Nepali numerals for Nepali locale
  if (locale === 'ne') {
    const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return strValue
      .split('')
      .map((char) => {
        const digit = parseInt(char, 10);
        return isNaN(digit) ? char : nepaliDigits[digit];
      })
      .join('');
  }

  return strValue;
}
