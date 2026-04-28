import {
  FormField,
  TableColumn,
  OptionConfig,
  TableColumnGroup,
} from '../types/form';
import { FORM_KIT_DEFAULT_LOCALE } from './locales';

/**
 * Get localized value for a field property
 * Falls back to default locale, then to original value
 * @param field - The form field
 * @param property - Property name to localize (e.g., 'label', 'placeholder')
 * @param locale - Target locale
 * @param fallback - Fallback value if translation not found (defaults to current property value)
 * @returns Localized value or fallback
 */
export function getLocalizedFieldValue(
  field: FormField | TableColumn | OptionConfig | TableColumnGroup,
  property: string,
  locale: string,
  fallback?: string,
): string {
  const defaultValue = (field as any)[property] || fallback || '';

  // If no translations exist, return the current property value
  if (!field.translations) {
    return defaultValue;
  }

  // Check if translation exists for this property and locale
  const propertyTranslations =
    field.translations[property as keyof typeof field.translations];
  if (
    propertyTranslations &&
    typeof propertyTranslations === 'object' &&
    !Array.isArray(propertyTranslations)
  ) {
    const translations = propertyTranslations as Record<string, string>;

    // First, try the requested locale
    // Check if the key exists (even if value is empty string)
    if (locale in translations) {
      const translatedValue = translations[locale];
      // If translation is empty string, fall back to default value
      // Otherwise use the translation
      return translatedValue !== '' ? translatedValue : defaultValue;
    }

    // If not found, try default locale
    if (
      locale !== FORM_KIT_DEFAULT_LOCALE &&
      FORM_KIT_DEFAULT_LOCALE in translations
    ) {
      const defaultTranslatedValue = translations[FORM_KIT_DEFAULT_LOCALE];
      return defaultTranslatedValue !== ''
        ? defaultTranslatedValue
        : defaultValue;
    }
  }

  // Fallback to current property value
  return defaultValue;
}

/**
 * Get localized array value for a field property (e.g., options, matrixRows)
 * Falls back to default locale, then to original array
 * @param field - The form field
 * @param property - Property name to localize (e.g., 'options', 'matrixRows')
 * @param locale - Target locale
 * @param fallback - Fallback array if translation not found
 * @returns Localized array or fallback
 */
export function getLocalizedFieldArray(
  field: FormField | TableColumn | OptionConfig,
  property: string,
  locale: string,
  fallback?: string[],
): string[] {
  const defaultArray = (field as any)[property] || fallback || [];

  // If no translations exist, return the current property value
  if (!field.translations) {
    return defaultArray;
  }

  // Check if translation exists for this property and locale
  const propertyTranslations =
    field.translations[property as keyof typeof field.translations];
  if (
    propertyTranslations &&
    typeof propertyTranslations === 'object' &&
    !Array.isArray(propertyTranslations)
  ) {
    // Type guard: verify it's a Record with string array values
    const translations = propertyTranslations as unknown as Record<
      string,
      string[]
    >;

    // First, try the requested locale
    if (
      translations[locale] !== undefined &&
      Array.isArray(translations[locale])
    ) {
      return translations[locale];
    }

    // If not found, try default locale
    if (
      locale !== FORM_KIT_DEFAULT_LOCALE &&
      translations[FORM_KIT_DEFAULT_LOCALE] !== undefined &&
      Array.isArray(translations[FORM_KIT_DEFAULT_LOCALE])
    ) {
      return translations[FORM_KIT_DEFAULT_LOCALE];
    }
  }

  // Fallback to current property value
  return defaultArray;
}

/**
 * Set localized value for a field property
 * @param field - The form field to update
 * @param property - Property name (e.g., 'label', 'placeholder')
 * @param locale - Target locale
 * @param value - Value to set
 * @returns Updated field with translation
 */
export function setLocalizedFieldValue(
  field: FormField,
  property: string,
  locale: string,
  value: string,
): FormField {
  const translations = field.translations || {};
  const propertyTranslations =
    translations[property as keyof typeof translations] || {};

  return {
    ...field,
    translations: {
      ...translations,
      [property]: {
        ...(propertyTranslations as Record<string, string>),
        [locale]: value,
      },
    },
  };
}

/**
 * Set localized array value for a field property
 * @param field - The form field to update
 * @param property - Property name (e.g., 'options', 'matrixRows')
 * @param locale - Target locale
 * @param value - Array value to set
 * @returns Updated field with translation
 */
export function setLocalizedFieldArray(
  field: FormField,
  property: string,
  locale: string,
  value: string[],
): FormField {
  const translations = field.translations || {};
  const propertyTranslations =
    translations[property as keyof typeof translations] || {};

  return {
    ...field,
    translations: {
      ...translations,
      [property]: {
        ...(propertyTranslations as Record<string, string[]>),
        [locale]: value,
      },
    },
  };
}

/**
 * Get a fully localized field object with all properties translated
 * @param field - The form field
 * @param locale - Target locale
 * @returns Localized field object
 */
export function getLocalizedField(field: FormField, locale: string): FormField {
  const localized: FormField = { ...field };

  // Localize string properties
  // Always try to localize, even if original value is empty (translation might exist)
  localized.label = getLocalizedFieldValue(field, 'label', locale, field.label);
  localized.placeholder = getLocalizedFieldValue(
    field,
    'placeholder',
    locale,
    field.placeholder,
  );
  localized.instruction = getLocalizedFieldValue(
    field,
    'instruction',
    locale,
    field.instruction,
  );
  // Always try to localize these properties
  localized.rangeMinLabel = getLocalizedFieldValue(
    field,
    'rangeMinLabel',
    locale,
    field.rangeMinLabel,
  );
  localized.rangeMaxLabel = getLocalizedFieldValue(
    field,
    'rangeMaxLabel',
    locale,
    field.rangeMaxLabel,
  );
  localized.stepDescription = getLocalizedFieldValue(
    field,
    'stepDescription',
    locale,
    field.stepDescription,
  );
  localized.content = getLocalizedFieldValue(
    field,
    'content',
    locale,
    field.content,
  );

  // Localize array properties
  if (field.options) {
    localized.options = getLocalizedFieldArray(
      field,
      'options',
      locale,
      field.options,
    );
  }
  if (field.matrixRows) {
    localized.matrixRows = getLocalizedFieldArray(
      field,
      'matrixRows',
      locale,
      field.matrixRows,
    );
  }
  if (field.matrixColumns) {
    localized.matrixColumns = getLocalizedFieldArray(
      field,
      'matrixColumns',
      locale,
      field.matrixColumns,
    );
  }

  // Localize validation message
  if (field.validation?.message) {
    localized.validation = {
      ...field.validation,
      message: getLocalizedFieldValue(
        field,
        'message',
        locale,
        field.validation.message,
      ),
    };
  }

  // Localize optionConfigs
  if (field.optionConfigs) {
    localized.optionConfigs = field.optionConfigs.map((config) => {
      // Try requested locale, then default locale, then original
      const localizedLabel =
        config.translations?.label?.[locale] ||
        (locale !== FORM_KIT_DEFAULT_LOCALE
          ? config.translations?.label?.[FORM_KIT_DEFAULT_LOCALE]
          : undefined) ||
        config.label;
      return {
        ...config,
        label: localizedLabel,
      };
    });
  }

  // Localize table columns
  if (field.tableColumns) {
    localized.tableColumns = field.tableColumns.map((column) =>
      getLocalizedTableColumn(column, locale),
    );
  }

  // Localize table rows
  // Localize table column groups
  if (field.tableColumnGroups) {
    localized.tableColumnGroups = field.tableColumnGroups.map((group) => {
      // Try requested locale, then default locale, then original
      const localizedLabel =
        group.translations?.label?.[locale] ||
        (locale !== FORM_KIT_DEFAULT_LOCALE
          ? group.translations?.label?.[FORM_KIT_DEFAULT_LOCALE]
          : undefined) ||
        group.label;
      return {
        ...group,
        label: localizedLabel,
      };
    });
  }

  // Recursively localize nested fields
  if (field.fields) {
    localized.fields = getLocalizedFields(field.fields, locale);
  }

  return localized;
}

/**
 * Recursively localize all fields in an array
 * @param fields - Array of form fields
 * @param locale - Target locale
 * @returns Array of localized fields
 */
export function getLocalizedFields(
  fields: FormField[],
  locale: string,
): FormField[] {
  return fields.map((field) => getLocalizedField(field, locale));
}

/**
 * Get localized table column
 * Falls back to default locale, then to original values
 * @param column - Table column
 * @param locale - Target locale
 * @returns Localized table column
 */
export function getLocalizedTableColumn(
  column: TableColumn,
  locale: string,
): TableColumn {
  const localized: TableColumn = { ...column };

  // For version columns, always use English locale
  const isVersionColumn = column.id?.toLowerCase().includes('version');
  const effectiveLocale = isVersionColumn ? 'en' : locale;

  // Label: try requested locale, then default locale, then original
  if (column.translations?.label) {
    localized.label =
      column.translations.label[effectiveLocale] ||
      (effectiveLocale !== FORM_KIT_DEFAULT_LOCALE
        ? column.translations.label[FORM_KIT_DEFAULT_LOCALE]
        : undefined) ||
      column.label;
  }

  // Placeholder: try requested locale, then default locale, then original
  if (column.translations?.placeholder) {
    localized.placeholder =
      column.translations.placeholder[effectiveLocale] ||
      (effectiveLocale !== FORM_KIT_DEFAULT_LOCALE
        ? column.translations.placeholder[FORM_KIT_DEFAULT_LOCALE]
        : undefined) ||
      column.placeholder;
  }

  // Validation message: try requested locale, then default locale, then original
  if (column.translations?.message && column.validation) {
    const message =
      column.translations.message[effectiveLocale] ||
      (effectiveLocale !== FORM_KIT_DEFAULT_LOCALE
        ? column.translations.message[FORM_KIT_DEFAULT_LOCALE]
        : undefined) ||
      column.validation.message;
    localized.validation = {
      ...column.validation,
      message,
    };
  }

  // Options: try requested locale, then default locale, then original
  if (column.translations?.options) {
    localized.options =
      column.translations.options[effectiveLocale] ||
      (effectiveLocale !== FORM_KIT_DEFAULT_LOCALE
        ? column.translations.options[FORM_KIT_DEFAULT_LOCALE]
        : undefined) ||
      column.options;
  }

  return localized;
}

/**
 * Merge translations into field properties (for backward compatibility)
 * This function creates a new field with translations merged into main properties
 * @param field - The form field
 * @param locale - Target locale
 * @returns Field with translations merged into properties
 */
export function mergeTranslations(field: FormField, locale: string): FormField {
  return getLocalizedField(field, locale);
}
