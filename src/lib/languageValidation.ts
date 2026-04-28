/**
 * Language validation utilities using Unicode ranges
 * Validates text input to ensure it matches the expected language
 */

// Unicode ranges for different languages
// English: Basic Latin (A-Z, a-z, 0-9) - U+0000 to U+007F
// Nepali: Devanagari script - U+0900 to U+097F
// Common punctuation and symbols: U+0020 to U+007E

/**
 * Validates if a text string contains only characters from the specified language
 * @param text - The text to validate
 * @param language - The language code ('en', 'ne', or 'any')
 * @returns true if the text matches the language, false otherwise
 */
export function validateLanguage(text: string, language: 'en' | 'ne' | 'any'): boolean {
  if (!text || language === 'any') {
    return true;
  }

  // Remove whitespace and common punctuation for validation
  // Common punctuation: !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
  const commonPunctuation = /[\s\u0020-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]/g;
  const textWithoutPunctuation = text.replace(commonPunctuation, '');

  // If after removing punctuation there's nothing left, it's valid
  if (!textWithoutPunctuation) {
    return true;
  }

  // Check each character
  for (const char of textWithoutPunctuation) {
    const codePoint = char.codePointAt(0) || 0;

    if (language === 'en') {
      // English: Basic Latin (A-Z, a-z, 0-9) - U+0020 to U+007F
      // Allow digits (0-9): U+0030 to U+0039
      // Allow uppercase (A-Z): U+0041 to U+005A
      // Allow lowercase (a-z): U+0061 to U+007A
      if (
        !(codePoint >= 0x0030 && codePoint <= 0x0039) && // 0-9
        !(codePoint >= 0x0041 && codePoint <= 0x005A) && // A-Z
        !(codePoint >= 0x0061 && codePoint <= 0x007A)    // a-z
      ) {
        return false;
      }
    } else if (language === 'ne') {
      // Nepali: Devanagari script - U+0900 to U+097F
      // Also allow digits (0-9): U+0030 to U+0039
      if (
        !(codePoint >= 0x0900 && codePoint <= 0x097F) && // Devanagari
        !(codePoint >= 0x0030 && codePoint <= 0x0039)    // 0-9
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Gets a more permissive regex that allows common punctuation and whitespace
 * This is used for validation where we want to allow mixed content but prefer one language
 */
export function getLanguageRegex(language: 'en' | 'ne' | 'any'): RegExp {
  if (language === 'any') {
    return /^.*$/;
  }

  // For English: Allow Latin characters, numbers, and common punctuation
  if (language === 'en') {
    return /^[\u0000-\u007F\u0020-\u007E\s]*$/;
  }

  // For Nepali: Allow Devanagari script, numbers, and common punctuation
  if (language === 'ne') {
    return /^[\u0900-\u097F\u0020-\u007E\s]*$/;
  }

  return /^.*$/;
}

/**
 * Gets a user-friendly error message for language validation
 */
export function getLanguageErrorMessage(language: 'en' | 'ne' | 'any', fieldLabel: string): string {
  const languageNames = {
    en: 'English',
    ne: 'Nepali',
    any: 'any language',
  };

  return `${fieldLabel} must contain only ${languageNames[language]} characters`;
}

