import { FormField } from '../types/form';
import { getLanguageName } from './languageList';

/**
 * Extract all available languages from form fields' translations
 * @param fields - Array of form fields
 * @returns Set of language codes found in field translations
 */
export function getAvailableLanguagesFromFields(fields: FormField[]): string[] {
  const languages = new Set<string>();

  function processField(field: FormField) {
    if (field.translations) {
      // Process all translation properties
      Object.values(field.translations).forEach((translation) => {
        if (translation && typeof translation === 'object') {
          if (Array.isArray(translation)) {
            // For array translations (like options, matrixRows, etc.)
            Object.keys(translation).forEach((lang) => languages.add(lang));
          } else {
            // For string translations (like label, placeholder, etc.)
            Object.keys(translation).forEach((lang) => languages.add(lang));
          }
        }
      });
    }

    // Recursively process nested fields
    if (field.fields && field.fields.length > 0) {
      field.fields.forEach(processField);
    }

    // Process option configs
    if (field.optionConfigs) {
      field.optionConfigs.forEach((config) => {
        if (config.translations?.label) {
          Object.keys(config.translations.label).forEach((lang) => languages.add(lang));
        }
        if (config.nestedForm?.fields) {
          config.nestedForm.fields.forEach(processField);
        }
      });
    }

    // Process table columns
    if (field.tableColumns) {
      field.tableColumns.forEach((column) => {
        if (column.translations) {
          Object.values(column.translations).forEach((translation) => {
            if (translation && typeof translation === 'object') {
              if (Array.isArray(translation)) {
                Object.keys(translation).forEach((lang) => languages.add(lang));
              } else {
                Object.keys(translation).forEach((lang) => languages.add(lang));
              }
            }
          });
        }
      });
    }

    // Process table column groups
    if (field.tableColumnGroups) {
      field.tableColumnGroups.forEach((group) => {
        if (group.translations?.label) {
          Object.keys(group.translations.label).forEach((lang) => languages.add(lang));
        }
      });
    }
  }

  fields.forEach(processField);

  return Array.from(languages).sort();
}

/**
 * Get languages with their display names
 */
export function getLanguagesWithNames(fields: FormField[]): Array<{ code: string; name: string }> {
  const languageCodes = getAvailableLanguagesFromFields(fields);
  return languageCodes.map((code) => ({
    code,
    name: getLanguageName(code),
  }));
}


