import ISO6391 from 'iso-639-1';

/**
 * Get all available language codes with their names
 * Returns a map of language codes to language names
 */
export function getAllLanguages(): Map<string, string> {
  const languages = new Map<string, string>();
  const codes = ISO6391.getAllCodes();

  codes.forEach((code) => {
    const name = ISO6391.getName(code);
    if (name) {
      languages.set(code, name);
    }
  });

  return languages;
}

/**
 * Get language name by code
 */
export function getLanguageName(code: string): string {
  return ISO6391.getName(code) || code.toUpperCase();
}

/**
 * Get language code by name (finds first match)
 */
export function getLanguageCode(name: string): string | null {
  const codes = ISO6391.getAllCodes();
  for (const code of codes) {
    if (ISO6391.getName(code) === name) {
      return code;
    }
  }
  return null;
}

/**
 * Get popular/common languages (subset of all languages)
 * Includes commonly used languages for forms
 */
export function getPopularLanguages(): Array<{ code: string; name: string }> {
  const popularCodes = ['en', 'ne'];

  return popularCodes.map((code) => ({
    code,
    name: getLanguageName(code),
  }));
}

/**
 * Search languages by name or code
 */
export function searchLanguages(
  query: string
): Array<{ code: string; name: string }> {
  const queryLower = query.toLowerCase();
  const allLanguages = getAllLanguages();
  const results: Array<{ code: string; name: string }> = [];

  for (const [code, name] of Array.from(allLanguages.entries())) {
    if (
      name.toLowerCase().includes(queryLower) ||
      code.toLowerCase().includes(queryLower)
    ) {
      results.push({ code, name });
    }
  }

  return results.slice(0, 50); // Limit to 50 results
}
